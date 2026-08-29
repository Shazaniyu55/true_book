import { MigrationInterface, QueryRunner } from "typeorm";

export class Geocoding1788021704407 implements MigrationInterface {
    name = 'Geocoding1788021704407'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "trip_request_pools" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "updatedBy" character varying, "createdBy" character varying, "matchKey" character varying NOT NULL, "origin" character varying NOT NULL, "destination" character varying NOT NULL, "originState" character varying, "destinationState" character varying, "isInterState" boolean NOT NULL DEFAULT true, "requestedDate" date NOT NULL, "departureTime" TIME, "departureAt" TIMESTAMP WITH TIME ZONE NOT NULL, "totalSeats" integer NOT NULL DEFAULT '0', "memberCount" integer NOT NULL DEFAULT '0', "status" character varying NOT NULL DEFAULT 'matching', "dispatchWindowHours" integer NOT NULL DEFAULT '18', "dispatchAt" TIMESTAMP WITH TIME ZONE NOT NULL, "dispatchedAt" TIMESTAMP WITH TIME ZONE, "claimedByDriverId" uuid, "claimedAt" TIMESTAMP WITH TIME ZONE, "linkedTripId" uuid, "metadata" jsonb, CONSTRAINT "PK_6a63cb2852d2b6052d79ba1682b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_5833a8f2770aaf6e1642b89e83" ON "trip_request_pools" ("matchKey") `);
        await queryRunner.query(`CREATE INDEX "IDX_602f280e51894f3fc340dc9962" ON "trip_request_pools" ("status") `);
        await queryRunner.query(`CREATE INDEX "IDX_1246bd2b13fa120289e60492a7" ON "trip_request_pools" ("dispatchAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_99de98a5837f95f961c9519ae0" ON "trip_request_pools" ("matchKey", "status") `);
        await queryRunner.query(`ALTER TABLE "trip_requests" ADD "preferredTime" TIME`);
        await queryRunner.query(`ALTER TABLE "trip_requests" ADD "poolId" uuid`);
        await queryRunner.query(`CREATE INDEX "IDX_c74f343efceb1f5cecd324255c" ON "trip_requests" ("poolId") `);
        await queryRunner.query(`ALTER TABLE "trip_request_pools" ADD CONSTRAINT "FK_99d873d58629b282ee2cefba5f5" FOREIGN KEY ("claimedByDriverId") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "trip_request_pools" ADD CONSTRAINT "FK_f819ea72641039a722ccc2dd660" FOREIGN KEY ("linkedTripId") REFERENCES "trips"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "trip_requests" ADD CONSTRAINT "FK_c74f343efceb1f5cecd324255c3" FOREIGN KEY ("poolId") REFERENCES "trip_request_pools"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "trip_requests" DROP CONSTRAINT "FK_c74f343efceb1f5cecd324255c3"`);
        await queryRunner.query(`ALTER TABLE "trip_request_pools" DROP CONSTRAINT "FK_f819ea72641039a722ccc2dd660"`);
        await queryRunner.query(`ALTER TABLE "trip_request_pools" DROP CONSTRAINT "FK_99d873d58629b282ee2cefba5f5"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c74f343efceb1f5cecd324255c"`);
        await queryRunner.query(`ALTER TABLE "trip_requests" DROP COLUMN "poolId"`);
        await queryRunner.query(`ALTER TABLE "trip_requests" DROP COLUMN "preferredTime"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_99de98a5837f95f961c9519ae0"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_1246bd2b13fa120289e60492a7"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_602f280e51894f3fc340dc9962"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_5833a8f2770aaf6e1642b89e83"`);
        await queryRunner.query(`DROP TABLE "trip_request_pools"`);
    }

}
