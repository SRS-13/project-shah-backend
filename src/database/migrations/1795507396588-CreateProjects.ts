import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateProjects1795507396588 implements MigrationInterface {
    name = 'CreateProjects1795507396588'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "organization_invitations" DROP CONSTRAINT "FK_organization_invitations_organization"`);
        await queryRunner.query(`DROP INDEX "public"."uq_organization_single_owner"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_organization_invitations_organization_id"`);
        await queryRunner.query(`CREATE INDEX "IDX_7f88954e8d667a76ae3ced6f44" ON "organization_invitations"  ("organization_id") `);
        await queryRunner.query(`ALTER TABLE "organization_invitations" ADD CONSTRAINT "FK_7f88954e8d667a76ae3ced6f446" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "organization_invitations" DROP CONSTRAINT "FK_7f88954e8d667a76ae3ced6f446"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_7f88954e8d667a76ae3ced6f44"`);
        await queryRunner.query(`CREATE INDEX "IDX_organization_invitations_organization_id" ON "organization_invitations" USING btree ("organization_id") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "uq_organization_single_owner" ON "organization_members" USING btree ("organization_id") WHERE (role = 'owner'::organization_members_role_enum)`);
        await queryRunner.query(`ALTER TABLE "organization_invitations" ADD CONSTRAINT "FK_organization_invitations_organization" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
