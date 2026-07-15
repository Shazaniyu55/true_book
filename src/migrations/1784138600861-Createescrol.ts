import { MigrationInterface, QueryRunner } from "typeorm";

export class Createescrol1784138600861 implements MigrationInterface {
    name = 'Createescrol1784138600861'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "trips" RENAME COLUMN "features" TO "vehicleFeatures"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "trips" RENAME COLUMN "vehicleFeatures" TO "features"`);
    }

}
