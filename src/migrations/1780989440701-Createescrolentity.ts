import { MigrationInterface, QueryRunner } from "typeorm";

export class Createescrolentity1780989440701 implements MigrationInterface {
    name = 'Createescrolentity1780989440701'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "num" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "num"`);
    }

}
