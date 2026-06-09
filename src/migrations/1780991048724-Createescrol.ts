import { MigrationInterface, QueryRunner } from "typeorm";

export class Createescrol1780991048724 implements MigrationInterface {
    name = 'Createescrol1780991048724'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "num"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "num" character varying`);
    }

}
