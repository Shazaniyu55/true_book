import { MigrationInterface, QueryRunner } from "typeorm";

export class State1781941006890 implements MigrationInterface {
    name = 'State1781941006890'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "state" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "state"`);
    }

}
