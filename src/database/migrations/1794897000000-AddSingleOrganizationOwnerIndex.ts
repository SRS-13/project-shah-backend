import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSingleOrganizationOwnerIndex1794897000000 implements MigrationInterface {
  name = 'AddSingleOrganizationOwnerIndex1794897000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE UNIQUE INDEX uq_organization_single_owner
      ON organization_members (organization_id)
      WHERE role = 'owner'
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX uq_organization_single_owner');
  }
}
