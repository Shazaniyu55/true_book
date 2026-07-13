import { MigrationInterface, QueryRunner } from "typeorm";

export class Createescrol1783944025421 implements MigrationInterface {
    name = 'Createescrol1783944025421'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "trips" RENAME COLUMN "amenities" TO "features"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "trips" RENAME COLUMN "features" TO "amenities"`);
    }

}
