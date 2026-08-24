import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import cookieParser from 'cookie-parser';
import { rm } from 'fs/promises';
import sharp from 'sharp';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { InvitationCryptoService } from '../src/auth/invitation-crypto.service';
import { Admin } from '../src/entities/admin.entity';
import { AccessInvitation } from '../src/entities/access-invitation.entity';

describe('ReLiveIt business rules (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let crypto: InvitationCryptoService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    dataSource = app.get(DataSource);
    crypto = app.get(InvitationCryptoService);
  });

  beforeEach(async () => {
    await dataSource.query('DELETE FROM votes');
    await dataSource.query('DELETE FROM photos');
    await dataSource.query('DELETE FROM sessions');
    await dataSource.query('DELETE FROM access_invitations');
    await dataSource.query('DELETE FROM wedding_participants');
    await dataSource.query('DELETE FROM categories');
    await dataSource.query('DELETE FROM weddings');
    await dataSource.query('DELETE FROM admins');
    await dataSource.getRepository(Admin).save({
      username: 'admin',
      passwordHash: await bcrypt.hash('ChangeMe123!', 10),
    });
  });

  afterAll(async () => {
    await app.close();
    await rm(process.env.STORAGE_DIR ?? './uploads-test', { recursive: true, force: true });
  });

  async function adminAgent() {
    const agent = request.agent(app.getHttpServer());
    await agent.post('/auth/login').send({ username: 'admin', password: 'ChangeMe123!' }).expect(200);
    return agent;
  }

  async function jpeg(label = 'photo') {
    return sharp({
      create: { width: 400, height: 500, channels: 3, background: '#b8956a' },
    })
      .jpeg()
      .toBuffer()
      .then((buffer) => {
        void label;
        return buffer;
      });
  }

  it('rejects invalid admin credentials', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'admin', password: 'wrong' })
      .expect(401);
  });

  it('lets an admin create a wedding, categories, and one- or two-person accounts', async () => {
    const admin = await adminAgent();
    const wedding = await admin
      .post('/admin/weddings')
      .send({ name: 'Anna & Peter', quickVoteEnabled: true, quickVotePhotoCount: 12 })
      .expect(201);
    expect(wedding.body.status).toBe('ACTIVE');
    expect(wedding.body.quickVoteEnabled).toBe(true);
    expect(wedding.body.quickVotePhotoCount).toBe(12);

    await admin.post(`/admin/weddings/${wedding.body.id}/categories`).send({ name: 'Ceremony' }).expect(201);
    await admin.post(`/admin/weddings/${wedding.body.id}/categories`).send({ name: 'Party' }).expect(201);
    const categories = await admin.get(`/admin/weddings/${wedding.body.id}/categories`).expect(200);
    expect(categories.body).toHaveLength(2);

    await admin
      .post(`/admin/weddings/${wedding.body.id}/participants`)
      .send({ role: 'GUEST', primaryName: 'John' })
      .expect(201);
    const pair = await admin
      .post(`/admin/weddings/${wedding.body.id}/participants`)
      .send({ role: 'GUEST', primaryName: 'Anna', secondaryName: 'Bence' })
      .expect(201);
    expect(pair.body.secondaryName).toBe('Bence');

    const reviewer = await admin
      .post(`/admin/weddings/${wedding.body.id}/participants`)
      .send({ role: 'REVIEWER', primaryName: 'Anna', secondaryName: 'Peter' })
      .expect(201);
    expect(reviewer.body.role).toBe('REVIEWER');
  });

  it('issues distinct invitation credentials and rejects revoked or regenerated links', async () => {
    const admin = await adminAgent();
    const wedding = await admin.post('/admin/weddings').send({ name: 'Test Wedding' }).expect(201);
    const guest = await admin
      .post(`/admin/weddings/${wedding.body.id}/participants`)
      .send({ role: 'GUEST', primaryName: 'John' })
      .expect(201);

    const first = await admin.get(`/admin/participants/${guest.body.id}/invitation`).expect(200);
    const secondGuest = await admin
      .post(`/admin/weddings/${wedding.body.id}/participants`)
      .send({ role: 'GUEST', primaryName: 'Maria' })
      .expect(201);
    const second = await admin.get(`/admin/participants/${secondGuest.body.id}/invitation`).expect(200);
    expect(first.body.url).not.toBe(second.body.url);

    const token = first.body.url.split('/invite/')[1];
    expect(token.length).toBeGreaterThan(20);

    const login = await request(app.getHttpServer()).get(`/invite/${token}`).expect(200);
    expect(login.body.redirectTo).toBe(`/wedding/${wedding.body.slug}`);
    expect(login.headers['cache-control']).toContain('no-store');

    await admin.post(`/admin/participants/${guest.body.id}/invitation/regenerate`).expect(201);
    await request(app.getHttpServer()).get(`/invite/${token}`).expect(401);

    const latest = await admin.get(`/admin/participants/${guest.body.id}/invitation`).expect(200);
    const newToken = latest.body.url.split('/invite/')[1];
    await request(app.getHttpServer()).get(`/invite/${newToken}`).expect(200);

    await admin.post(`/admin/participants/${guest.body.id}/invitation/revoke`).expect(200);
    await request(app.getHttpServer()).get(`/invite/${newToken}`).expect(401);
  });

  it('invalidates participant sessions after regenerate or deactivate', async () => {
    const admin = await adminAgent();
    const wedding = await admin.post('/admin/weddings').send({ name: 'Session Wedding' }).expect(201);
    const guest = await admin
      .post(`/admin/weddings/${wedding.body.id}/participants`)
      .send({ role: 'GUEST', primaryName: 'John' })
      .expect(201);
    const invite = await admin.get(`/admin/participants/${guest.body.id}/invitation`).expect(200);
    const token = invite.body.url.split('/invite/')[1];

    const guestAgent = request.agent(app.getHttpServer());
    await guestAgent.get(`/invite/${token}`).expect(200);
    await guestAgent.get('/auth/me').expect(200);

    await admin.post(`/admin/participants/${guest.body.id}/invitation/regenerate`).expect(201);
    await guestAgent.get('/auth/me').expect(401);
  });

  it('prevents a guest invitation from accessing reviewer routes', async () => {
    const admin = await adminAgent();
    const wedding = await admin.post('/admin/weddings').send({ name: 'Role Wedding' }).expect(201);
    const guest = await admin
      .post(`/admin/weddings/${wedding.body.id}/participants`)
      .send({ role: 'GUEST', primaryName: 'John' })
      .expect(201);
    const reviewer = await admin
      .post(`/admin/weddings/${wedding.body.id}/participants`)
      .send({ role: 'REVIEWER', primaryName: 'Bride' })
      .expect(201);
    const guestInvite = await admin.get(`/admin/participants/${guest.body.id}/invitation`).expect(200);
    const guestAgent = request.agent(app.getHttpServer());
    await guestAgent.get(`/invite/${guestInvite.body.url.split('/invite/')[1]}`).expect(200);
    await guestAgent.get(`/reviewer/weddings/${wedding.body.id}`).expect(403);

    const reviewerInvite = await admin.get(`/admin/participants/${reviewer.body.id}/invitation`).expect(200);
    const reviewerAgent = request.agent(app.getHttpServer());
    await reviewerAgent.get(`/invite/${reviewerInvite.body.url.split('/invite/')[1]}`).expect(200);
    await reviewerAgent.get(`/reviewer/weddings/${wedding.body.id}`).expect(200);
  });

  it('enforces category photo uniqueness, gallery limits, and concluded-state locks', async () => {
    const admin = await adminAgent();
    const wedding = await admin.post('/admin/weddings').send({ name: 'Upload Wedding' }).expect(201);
    const category = await admin
      .post(`/admin/weddings/${wedding.body.id}/categories`)
      .send({ name: 'Ceremony' })
      .expect(201);
    const guestA = await admin
      .post(`/admin/weddings/${wedding.body.id}/participants`)
      .send({ role: 'GUEST', primaryName: 'John' })
      .expect(201);
    const guestB = await admin
      .post(`/admin/weddings/${wedding.body.id}/participants`)
      .send({ role: 'GUEST', primaryName: 'Maria' })
      .expect(201);
    const reviewer = await admin
      .post(`/admin/weddings/${wedding.body.id}/participants`)
      .send({ role: 'REVIEWER', primaryName: 'Bride' })
      .expect(201);

    const inviteA = await admin.get(`/admin/participants/${guestA.body.id}/invitation`).expect(200);
    const inviteB = await admin.get(`/admin/participants/${guestB.body.id}/invitation`).expect(200);
    const inviteR = await admin.get(`/admin/participants/${reviewer.body.id}/invitation`).expect(200);
    const agentA = request.agent(app.getHttpServer());
    const agentB = request.agent(app.getHttpServer());
    const agentR = request.agent(app.getHttpServer());
    await agentA.get(`/invite/${inviteA.body.url.split('/invite/')[1]}`).expect(200);
    await agentB.get(`/invite/${inviteB.body.url.split('/invite/')[1]}`).expect(200);
    await agentR.get(`/invite/${inviteR.body.url.split('/invite/')[1]}`).expect(200);

    const file = await jpeg();
    const first = await agentA
      .post(`/weddings/${wedding.body.slug}/photos`)
      .attach('file', file, { filename: 'one.jpg', contentType: 'image/jpeg' })
      .field('categoryId', category.body.id)
      .expect(201);
    await agentA
      .post(`/weddings/${wedding.body.slug}/photos`)
      .attach('file', file, { filename: 'two.jpg', contentType: 'image/jpeg' })
      .field('categoryId', category.body.id)
      .expect(400);

    const other = await agentB
      .post(`/weddings/${wedding.body.slug}/photos`)
      .attach('file', file, { filename: 'other.jpg', contentType: 'image/jpeg' })
      .field('categoryId', category.body.id)
      .expect(201);

    await agentA.post(`/photos/${first.body.id}/vote`).send({ value: 1 }).expect(400);
    await agentA.post(`/photos/${other.body.id}/vote`).send({ value: 1 }).expect(201);
    await agentA.post(`/photos/${other.body.id}/vote`).send({ value: 0 }).expect(400);
    await agentB.post(`/photos/${first.body.id}/vote`).send({ value: 0 }).expect(201);

    const queue = await agentA
      .get(`/weddings/${wedding.body.slug}/categories/${category.body.id}/vote-queue`)
      .expect(200);
    expect(queue.body.photos.find((p: { id: string }) => p.id === other.body.id)).toBeUndefined();
    expect(queue.body.photos.find((p: { id: string }) => p.id === first.body.id)).toBeUndefined();

    await agentR.post(`/reviewer/weddings/${wedding.body.id}/conclude`).expect(201);
    await agentA
      .post(`/weddings/${wedding.body.slug}/photos`)
      .attach('file', file, { filename: 'late.jpg', contentType: 'image/jpeg' })
      .expect(400);
    await agentB.post(`/photos/${first.body.id}/vote`).send({ value: 1 }).expect(400);

    const rankings = await agentR.get(`/reviewer/weddings/${wedding.body.id}/rankings`).expect(200);
    const ceremony = rankings.body.find((row: { category: { name: string } }) => row.category.name === 'Ceremony');
    expect(ceremony.top[0].totalPoints).toBe(1);
    expect(ceremony.top[0].voteCount).toBe(1);
  });

  it('stores invitation hashes rather than plaintext tokens', async () => {
    const admin = await adminAgent();
    const wedding = await admin.post('/admin/weddings').send({ name: 'Secret Wedding' }).expect(201);
    const guest = await admin
      .post(`/admin/weddings/${wedding.body.id}/participants`)
      .send({ role: 'GUEST', primaryName: 'John' })
      .expect(201);
    const invite = await admin.get(`/admin/participants/${guest.body.id}/invitation`).expect(200);
    const raw = invite.body.url.split('/invite/')[1];
    const rows = await dataSource.getRepository(AccessInvitation).find({
      where: { participantId: guest.body.id },
    });
    expect(rows[0].tokenHash).toBe(crypto.hash(raw));
    expect(rows[0].tokenHash).not.toBe(raw);
    expect(rows[0].encryptedToken).not.toBe(raw);
  });

  it('omits Quick Vote unless the admin enabled it for the wedding', async () => {
    const admin = await adminAgent();
    const off = await admin.post('/admin/weddings').send({ name: 'No Quick Vote' }).expect(201);
    expect(off.body.quickVoteEnabled).toBe(false);

    const guest = await admin
      .post(`/admin/weddings/${off.body.id}/participants`)
      .send({ role: 'GUEST', primaryName: 'John' })
      .expect(201);
    const invite = await admin.get(`/admin/participants/${guest.body.id}/invitation`).expect(200);
    const guestAgent = request.agent(app.getHttpServer());
    await guestAgent.get(`/invite/${invite.body.url.split('/invite/')[1]}`).expect(200);

    const wedding = await guestAgent.get(`/weddings/${off.body.slug}`).expect(200);
    expect(wedding.body.quickVoteEnabled).toBe(false);
    await guestAgent.get(`/weddings/${off.body.slug}/quick-vote`).expect(400);

    await admin
      .patch(`/admin/weddings/${off.body.id}`)
      .send({ quickVoteEnabled: true, quickVotePhotoCount: 8 })
      .expect(200);
    const enabled = await guestAgent.get(`/weddings/${off.body.slug}`).expect(200);
    expect(enabled.body.quickVoteEnabled).toBe(true);
    await guestAgent.get(`/weddings/${off.body.slug}/quick-vote`).expect(200);
  });
});
