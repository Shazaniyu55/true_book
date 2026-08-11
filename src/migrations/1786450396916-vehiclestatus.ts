import { MigrationInterface, QueryRunner } from "typeorm";

export class Vehiclestatus1786450396916 implements MigrationInterface {
    name = 'Vehiclestatus1786450396916'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "vehicles" ADD "verificationStatus" character varying NOT NULL DEFAULT 'pending'`);
        await queryRunner.query(`ALTER TABLE "vehicles" ADD "rejectionReason" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "vehicles" DROP COLUMN "rejectionReason"`);
        await queryRunner.query(`ALTER TABLE "vehicles" DROP COLUMN "verificationStatus"`);
    }

}
