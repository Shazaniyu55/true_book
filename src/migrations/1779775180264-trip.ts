import { MigrationInterface, QueryRunner } from "typeorm";

export class Trip1779775180264 implements MigrationInterface {
    name = 'Trip1779775180264'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "trips" ADD "description" character varying`);
        await queryRunner.query(`ALTER TABLE "trips" ADD "amenities" jsonb`);
        await queryRunner.query(`ALTER TABLE "passengers" ADD "metadata" jsonb`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "passengers" DROP COLUMN "metadata"`);
        await queryRunner.query(`ALTER TABLE "trips" DROP COLUMN "amenities"`);
        await queryRunner.query(`ALTER TABLE "trips" DROP COLUMN "description"`);
    }

}
