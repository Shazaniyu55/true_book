import { MigrationInterface, QueryRunner } from "typeorm";

export class Create1784135753465 implements MigrationInterface {
    name = 'Create1784135753465'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "trips" DROP COLUMN "departureLocation"`);
        await queryRunner.query(`ALTER TABLE "trips" ADD "departureLocation" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "trips" DROP COLUMN "departureLocation"`);
        await queryRunner.query(`ALTER TABLE "trips" ADD "departureLocation" jsonb`);
    }

}
