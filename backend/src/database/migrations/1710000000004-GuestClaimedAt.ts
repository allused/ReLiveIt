import { MigrationInterface, QueryRunner } from 'typeorm';

export class GuestClaimedAt1710000000004 implements MigrationInterface {
  name = 'GuestClaimedAt1710000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "wedding_participants" ALTER COLUMN "primaryName" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "wedding_participants" ADD "claimedAt" TIMESTAMPTZ`,
    );
    await queryRunner.query(`
      UPDATE "wedding_participants"
      SET "claimedAt" = "createdAt"
      WHERE "primaryName" IS NOT NULL AND trim("primaryName") <> ''
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "wedding_participants" SET "primaryName" = 'Guest' WHERE "primaryName" IS NULL`,
    );
    await queryRunner.query(`ALTER TABLE "wedding_participants" DROP COLUMN "claimedAt"`);
    await queryRunner.query(
      `ALTER TABLE "wedding_participants" ALTER COLUMN "primaryName" SET NOT NULL`,
    );
  }
}
