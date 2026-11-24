import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOrganizationInvitations1794896000000 implements MigrationInterface {
  name = 'CreateOrganizationInvitations1794896000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "public"."organization_invitations_role_enum" AS ENUM('owner', 'admin', 'member')`);
    await queryRunner.query(`CREATE TYPE "public"."organization_invitations_status_enum" AS ENUM('pending', 'accepted', 'declined', 'revoked')`);
    await queryRunner.query(`
      CREATE TABLE "organization_invitations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organization_id" uuid NOT NULL,
        "email" character varying(255) NOT NULL,
        "role" "public"."organization_invitations_role_enum" NOT NULL DEFAULT 'member',
        "token_hash" character varying(64) NOT NULL,
        "status" "public"."organization_invitations_status_enum" NOT NULL DEFAULT 'pending',
        "invited_by" uuid NOT NULL,
        "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_organization_invitations" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_organization_invitations_token_hash" UNIQUE ("token_hash"),
        CONSTRAINT "FK_organization_invitations_organization" FOREIGN KEY ("organization_id")
          REFERENCES "organizations"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query('CREATE INDEX "IDX_organization_invitations_organization_id" ON "organization_invitations" ("organization_id")');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "organization_invitations"');
    await queryRunner.query('DROP TYPE "public"."organization_invitations_status_enum"');
    await queryRunner.query('DROP TYPE "public"."organization_invitations_role_enum"');
  }
}
