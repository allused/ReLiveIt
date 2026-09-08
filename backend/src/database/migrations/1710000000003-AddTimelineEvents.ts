import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTimelineEvents1710000000003 implements MigrationInterface {
  name = 'AddTimelineEvents1710000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "timeline_events" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "weddingId" uuid NOT NULL REFERENCES "weddings"("id") ON DELETE CASCADE,
        "title" varchar NOT NULL,
        "occursAt" TIMESTAMPTZ NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_timeline_events_weddingId" ON "timeline_events" ("weddingId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_timeline_events_wedding_time" ON "timeline_events" ("weddingId", "occursAt")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "timeline_events"`);
  }
}
