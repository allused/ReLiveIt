import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1710000000000 implements MigrationInterface {
  name = 'InitialSchema1710000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    await queryRunner.query(`
      CREATE TABLE "admins" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "username" varchar NOT NULL UNIQUE,
        "passwordHash" varchar NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "weddings" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar NOT NULL,
        "slug" varchar NOT NULL UNIQUE,
        "status" varchar NOT NULL DEFAULT 'ACTIVE',
        "quickVotePhotoCount" integer NOT NULL DEFAULT 20,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "concludedAt" TIMESTAMPTZ
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_weddings_status" ON "weddings" ("status")`);

    await queryRunner.query(`
      CREATE TABLE "categories" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "weddingId" uuid NOT NULL REFERENCES "weddings"("id") ON DELETE CASCADE,
        "name" varchar NOT NULL,
        "sortOrder" integer NOT NULL DEFAULT 0,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_categories_weddingId" ON "categories" ("weddingId")`);

    await queryRunner.query(`
      CREATE TABLE "wedding_participants" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "weddingId" uuid NOT NULL REFERENCES "weddings"("id") ON DELETE CASCADE,
        "role" varchar NOT NULL,
        "primaryName" varchar NOT NULL,
        "secondaryName" varchar,
        "status" varchar NOT NULL DEFAULT 'ACTIVE',
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "lastAccessedAt" TIMESTAMPTZ
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_participants_weddingId" ON "wedding_participants" ("weddingId")`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_participants_role" ON "wedding_participants" ("role")`);
    await queryRunner.query(
      `CREATE INDEX "IDX_participants_status" ON "wedding_participants" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_participants_wedding_role" ON "wedding_participants" ("weddingId", "role")`,
    );

    await queryRunner.query(`
      CREATE TABLE "access_invitations" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "participantId" uuid NOT NULL REFERENCES "wedding_participants"("id") ON DELETE CASCADE,
        "tokenHash" varchar NOT NULL UNIQUE,
        "encryptedToken" text NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "revokedAt" TIMESTAMPTZ,
        "expiresAt" TIMESTAMPTZ
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_invitations_participantId" ON "access_invitations" ("participantId")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_one_active_invitation"
       ON "access_invitations" ("participantId")
       WHERE "revokedAt" IS NULL`,
    );

    await queryRunner.query(`
      CREATE TABLE "sessions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tokenHash" varchar NOT NULL UNIQUE,
        "adminId" uuid,
        "participantId" uuid,
        "expiresAt" TIMESTAMPTZ NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_sessions_adminId" ON "sessions" ("adminId")`);
    await queryRunner.query(
      `CREATE INDEX "IDX_sessions_participantId" ON "sessions" ("participantId")`,
    );

    await queryRunner.query(`
      CREATE TABLE "photos" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "weddingId" uuid NOT NULL REFERENCES "weddings"("id") ON DELETE CASCADE,
        "categoryId" uuid REFERENCES "categories"("id") ON DELETE RESTRICT,
        "uploaderParticipantId" uuid NOT NULL REFERENCES "wedding_participants"("id") ON DELETE RESTRICT,
        "originalKey" varchar NOT NULL,
        "mediumKey" varchar NOT NULL,
        "thumbnailKey" varchar NOT NULL,
        "originalFilename" varchar NOT NULL,
        "mimeType" varchar NOT NULL,
        "fileSize" integer NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_photos_weddingId" ON "photos" ("weddingId")`);
    await queryRunner.query(`CREATE INDEX "IDX_photos_categoryId" ON "photos" ("categoryId")`);
    await queryRunner.query(
      `CREATE INDEX "IDX_photos_uploader" ON "photos" ("uploaderParticipantId")`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_photos_createdAt" ON "photos" ("createdAt")`);
    await queryRunner.query(
      `CREATE INDEX "IDX_photos_wedding_createdAt" ON "photos" ("weddingId", "createdAt")`,
    );
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_one_category_photo_per_guest"
      ON "photos" ("weddingId", "categoryId", "uploaderParticipantId")
      WHERE "categoryId" IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE TABLE "votes" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "photoId" uuid NOT NULL REFERENCES "photos"("id") ON DELETE CASCADE,
        "voterParticipantId" uuid NOT NULL REFERENCES "wedding_participants"("id") ON DELETE CASCADE,
        "value" integer NOT NULL CHECK ("value" IN (0, 1)),
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE ("photoId", "voterParticipantId")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_votes_photoId" ON "votes" ("photoId")`);
    await queryRunner.query(`CREATE INDEX "IDX_votes_voter" ON "votes" ("voterParticipantId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "votes"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "photos"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "sessions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "access_invitations"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "wedding_participants"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "categories"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "weddings"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "admins"`);
  }
}
