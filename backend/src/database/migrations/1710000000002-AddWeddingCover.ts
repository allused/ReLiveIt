import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWeddingCover1710000000002 implements MigrationInterface {
  name = 'AddWeddingCover1710000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "weddings" ADD COLUMN "coverOriginalKey" varchar`);
    await queryRunner.query(`ALTER TABLE "weddings" ADD COLUMN "coverMediumKey" varchar`);
    await queryRunner.query(`ALTER TABLE "weddings" ADD COLUMN "coverThumbnailKey" varchar`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "weddings" DROP COLUMN "coverThumbnailKey"`);
    await queryRunner.query(`ALTER TABLE "weddings" DROP COLUMN "coverMediumKey"`);
    await queryRunner.query(`ALTER TABLE "weddings" DROP COLUMN "coverOriginalKey"`);
  }
}
