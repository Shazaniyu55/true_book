import { MigrationInterface, QueryRunner } from "typeorm";

export class TripReq1788471366526 implements MigrationInterface {
    name = 'TripReq1788471366526'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "trip_requests" DROP COLUMN "preferredTime"`);
        await queryRunner.query(`ALTER TABLE "trip_requests" ADD "preferredTime" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "trip_requests" DROP COLUMN "preferredTime"`);
        await queryRunner.query(`ALTER TABLE "trip_requests" ADD "preferredTime" TIME`);
    }

}
