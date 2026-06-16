import { MigrationInterface, QueryRunner } from "typeorm";

export class Createescrol1781607615696 implements MigrationInterface {
    name = 'Createescrol1781607615696'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "iAgree" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "iAgree"`);
    }

}
