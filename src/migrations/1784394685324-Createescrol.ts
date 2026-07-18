import { MigrationInterface, QueryRunner } from "typeorm";

export class Createescrol1784394685324 implements MigrationInterface {
    name = 'Createescrol1784394685324'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "agents" ADD "transactionPin" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "agents" DROP COLUMN "transactionPin"`);
    }

}
