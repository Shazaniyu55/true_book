import { MigrationInterface, QueryRunner } from "typeorm";

export class Createescrol1780146323814 implements MigrationInterface {
    name = 'Createescrol1780146323814'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "phoneOtpCode" character varying`);
        await queryRunner.query(`ALTER TABLE "users" ADD "phoneOtpExpiresAt" TIMESTAMP WITH TIME ZONE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "phoneOtpExpiresAt"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "phoneOtpCode"`);
    }

}
