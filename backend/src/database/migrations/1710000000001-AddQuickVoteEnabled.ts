import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddQuickVoteEnabled1710000000001 implements MigrationInterface {
  name = 'AddQuickVoteEnabled1710000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "weddings" ADD COLUMN "quickVoteEnabled" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(`UPDATE "weddings" SET "quickVoteEnabled" = true`);
    await queryRunner.query(
      `ALTER TABLE "weddings" ALTER COLUMN "quickVoteEnabled" SET DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "weddings" DROP COLUMN "quickVoteEnabled"`);
  }
}
