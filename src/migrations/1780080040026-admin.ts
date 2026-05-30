import { MigrationInterface, QueryRunner } from "typeorm";

export class Admin1780080040026 implements MigrationInterface {
    name = 'Admin1780080040026'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "admins" ADD "roleName" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "admins" DROP COLUMN "roleName"`);
    }

}
