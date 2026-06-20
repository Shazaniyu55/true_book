import { MigrationInterface, QueryRunner } from "typeorm";

export class Createescrol1781940540195 implements MigrationInterface {
    name = 'Createescrol1781940540195'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "about" character varying`);
        await queryRunner.query(`ALTER TABLE "users" ADD "yearOfExp" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "yearOfExp"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "about"`);
    }

}
