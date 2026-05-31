import { MigrationInterface, QueryRunner } from "typeorm";

export class Createescrolnew1780226755026 implements MigrationInterface {
    name = 'Createescrolnew1780226755026'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "audit_logs" ADD "name" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "audit_logs" DROP COLUMN "name"`);
    }

}
