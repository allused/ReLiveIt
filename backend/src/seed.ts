import { NestFactory } from '@nestjs/core';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import sharp from 'sharp';
import { Repository } from 'typeorm';
import { AppModule } from './app.module';
import { InvitationsService } from './admin/invitations.service';
import { Admin } from './entities/admin.entity';
import { Category } from './entities/category.entity';
import { Photo } from './entities/photo.entity';
import { Vote } from './entities/vote.entity';
import { Wedding, WeddingStatus } from './entities/wedding.entity';
import {
  ParticipantRole,
  ParticipantStatus,
  WeddingParticipant,
} from './entities/wedding-participant.entity';
import { ImageStorageService } from './storage/image-storage.service';

const CATEGORY_NAMES = [
  'Ceremony',
  'First Dance',
  'Friends',
  'Family',
  'Funny Moments',
  'Food',
  'Party',
];

async function colorJpeg(hex: string, label: string): Promise<Buffer> {
  const svg = `<svg width="1200" height="1500" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="${hex}"/>
    <text x="50%" y="50%" text-anchor="middle" fill="#fff8ee" font-size="72" font-family="Georgia, serif">${label}</text>
  </svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 85 }).toBuffer();
}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const admins = app.get<Repository<Admin>>(getRepositoryToken(Admin));
  const weddings = app.get<Repository<Wedding>>(getRepositoryToken(Wedding));
  const categories = app.get<Repository<Category>>(getRepositoryToken(Category));
  const participants = app.get<Repository<WeddingParticipant>>(
    getRepositoryToken(WeddingParticipant),
  );
  const photos = app.get<Repository<Photo>>(getRepositoryToken(Photo));
  const votes = app.get<Repository<Vote>>(getRepositoryToken(Vote));
  const invitations = app.get(InvitationsService);
  const storage = app.get(ImageStorageService);

  if (await admins.existsBy({ username: 'admin' })) {
    console.log('Seed data already exists. Skipping.');
    await app.close();
    return;
  }

  const admin = await admins.save(
    admins.create({
      username: 'admin',
      passwordHash: await bcrypt.hash('ChangeMe123!', 10),
    }),
  );

  const wedding = await weddings.save(
    weddings.create({
      name: 'Anna & Peter',
      slug: 'anna-peter-2026',
      status: WeddingStatus.ACTIVE,
      quickVoteEnabled: true,
      quickVotePhotoCount: 20,
    }),
  );

  const categoryRows = await categories.save(
    CATEGORY_NAMES.map((name, sortOrder) =>
      categories.create({ weddingId: wedding.id, name, sortOrder, isActive: true }),
    ),
  );

  const john = await participants.save(
    participants.create({
      weddingId: wedding.id,
      role: ParticipantRole.GUEST,
      primaryName: 'John',
      secondaryName: null,
      status: ParticipantStatus.ACTIVE,
    }),
  );
  const pair = await participants.save(
    participants.create({
      weddingId: wedding.id,
      role: ParticipantRole.GUEST,
      primaryName: 'Anna',
      secondaryName: 'Bence',
      status: ParticipantStatus.ACTIVE,
    }),
  );
  const maria = await participants.save(
    participants.create({
      weddingId: wedding.id,
      role: ParticipantRole.GUEST,
      primaryName: 'Maria',
      secondaryName: null,
      status: ParticipantStatus.ACTIVE,
    }),
  );
  const reviewer = await participants.save(
    participants.create({
      weddingId: wedding.id,
      role: ParticipantRole.REVIEWER,
      primaryName: 'Anna',
      secondaryName: 'Peter',
      status: ParticipantStatus.ACTIVE,
    }),
  );

  const inviteLines: string[] = [
    'ReLiveIt development invitations',
    'Admin login: admin / ChangeMe123!',
    `Wedding: ${wedding.name} (${wedding.slug})`,
    '',
  ];

  for (const person of [john, pair, maria, reviewer]) {
    const created = await invitations.createForParticipant(person.id);
    const label = person.secondaryName
      ? `${person.primaryName} & ${person.secondaryName}`
      : person.primaryName;
    inviteLines.push(`${person.role}  ${label}`);
    inviteLines.push(created.url);
    inviteLines.push('');
  }

  const palette = ['#8c5a3c', '#c4a574', '#6b4f3a', '#b07a6a', '#3d4a3a', '#d4b896'];
  const uploaders = [john, pair, maria];
  const createdPhotos: Photo[] = [];

  for (let i = 0; i < categoryRows.length; i += 1) {
    const uploader = uploaders[i % uploaders.length];
    const buffer = await colorJpeg(palette[i % palette.length], categoryRows[i].name);
    const photo = await photos.save(
      photos.create({
        weddingId: wedding.id,
        categoryId: categoryRows[i].id,
        uploaderParticipantId: uploader.id,
        originalKey: 'pending',
        mediumKey: 'pending',
        thumbnailKey: 'pending',
        originalFilename: `${categoryRows[i].name.toLowerCase().replace(/\s+/g, '-')}.jpg`,
        mimeType: 'image/jpeg',
        fileSize: buffer.length,
      }),
    );
    const stored = await storage.saveImage({
      weddingId: wedding.id,
      photoId: photo.id,
      buffer,
      originalFilename: photo.originalFilename,
      mimeType: 'image/jpeg',
    });
    photo.originalKey = stored.originalKey;
    photo.mediumKey = stored.mediumKey;
    photo.thumbnailKey = stored.thumbnailKey;
    createdPhotos.push(await photos.save(photo));
  }

  for (let i = 0; i < 6; i += 1) {
    const uploader = uploaders[i % uploaders.length];
    const buffer = await colorJpeg(palette[(i + 2) % palette.length], `Gallery ${i + 1}`);
    const photo = await photos.save(
      photos.create({
        weddingId: wedding.id,
        categoryId: null,
        uploaderParticipantId: uploader.id,
        originalKey: 'pending',
        mediumKey: 'pending',
        thumbnailKey: 'pending',
        originalFilename: `gallery-${i + 1}.jpg`,
        mimeType: 'image/jpeg',
        fileSize: buffer.length,
      }),
    );
    const stored = await storage.saveImage({
      weddingId: wedding.id,
      photoId: photo.id,
      buffer,
      originalFilename: photo.originalFilename,
      mimeType: 'image/jpeg',
    });
    photo.originalKey = stored.originalKey;
    photo.mediumKey = stored.mediumKey;
    photo.thumbnailKey = stored.thumbnailKey;
    createdPhotos.push(await photos.save(photo));
  }

  const voters = [john, pair, maria];
  for (const photo of createdPhotos.slice(0, 8)) {
    for (const voter of voters) {
      if (voter.id === photo.uploaderParticipantId) {
        continue;
      }
      await votes.save(
        votes.create({
          photoId: photo.id,
          voterParticipantId: voter.id,
          value: photo.id.charCodeAt(0) % 2 === 0 ? 1 : 0,
        }),
      );
    }
  }

  const invitePath = join(process.cwd(), 'seed-invites.dev.txt');
  await writeFile(invitePath, inviteLines.join('\n'), 'utf8');

  console.log('Seed complete.');
  console.log(`Admin: ${admin.username} / ChangeMe123!`);
  console.log(`Invite URLs written to ${invitePath}`);

  await app.close();
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
