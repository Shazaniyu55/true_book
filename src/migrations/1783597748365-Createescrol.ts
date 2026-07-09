import { MigrationInterface, QueryRunner } from "typeorm";

export class Createescrol1783597748365 implements MigrationInterface {
    name = 'Createescrol1783597748365'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "dob"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "dob" date`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "dob"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "dob" TIMESTAMP`);
    }

}
