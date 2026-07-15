import { MigrationInterface, QueryRunner } from "typeorm";

export class Createescrol1784124330337 implements MigrationInterface {
    name = 'Createescrol1784124330337'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "trips" ADD "sun" character varying`);
        await queryRunner.query(`ALTER TABLE "trips" DROP COLUMN "departureLocation"`);
        await queryRunner.query(`ALTER TABLE "trips" ADD "departureLocation" jsonb`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "trips" DROP COLUMN "departureLocation"`);
        await queryRunner.query(`ALTER TABLE "trips" ADD "departureLocation" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "trips" DROP COLUMN "sun"`);
    }

}
