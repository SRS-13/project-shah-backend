import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRefreshSessionsTable1794466800000 implements MigrationInterface {
  name = 'CreateRefreshSessionsTable1794466800000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "refresh_sessions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "token_hash" character varying(255) NOT NULL,
        "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "revoked_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_refresh_sessions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_refresh_sessions_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      'CREATE INDEX "IDX_refresh_sessions_user_id" ON "refresh_sessions" ("user_id")',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "refresh_sessions"');
  }
}
