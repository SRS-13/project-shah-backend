import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateOrganizations1794725318099 implements MigrationInterface {
    name = 'CreateOrganizations1794725318099'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "refresh_sessions" DROP CONSTRAINT "FK_refresh_sessions_user"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_refresh_sessions_user_id"`);
        await queryRunner.query(`CREATE INDEX "IDX_a7ab4fd82c654c85b9de53d971" ON "refresh_sessions"  ("user_id") `);
        await queryRunner.query(`ALTER TABLE "refresh_sessions" ADD CONSTRAINT "FK_a7ab4fd82c654c85b9de53d971a" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "refresh_sessions" DROP CONSTRAINT "FK_a7ab4fd82c654c85b9de53d971a"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a7ab4fd82c654c85b9de53d971"`);
        await queryRunner.query(`CREATE INDEX "IDX_refresh_sessions_user_id" ON "refresh_sessions" USING btree ("user_id") `);
        await queryRunner.query(`ALTER TABLE "refresh_sessions" ADD CONSTRAINT "FK_refresh_sessions_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
