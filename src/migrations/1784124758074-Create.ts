import { MigrationInterface, QueryRunner } from "typeorm";

export class Create1784124758074 implements MigrationInterface {
    name = 'Create1784124758074'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "trips" DROP COLUMN "sun"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "trips" ADD "sun" character varying`);
    }

}
