import { MigrationInterface, QueryRunner } from "typeorm";

export class TripRequest1787488199877 implements MigrationInterface {
    name = 'TripRequest1787488199877'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "trip_requests" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "updatedBy" character varying, "createdBy" character varying, "requesterUserId" uuid NOT NULL, "passengerId" uuid, "origin" character varying NOT NULL, "destination" character varying NOT NULL, "requestedDate" date NOT NULL, "seats" integer NOT NULL DEFAULT '1', "note" character varying, "status" character varying NOT NULL DEFAULT 'pending', "adminNote" character varying, "processedByAdminId" uuid, "processedAt" TIMESTAMP WITH TIME ZONE, "linkedTripId" uuid, "metadata" jsonb, CONSTRAINT "PK_e467e5f59e6d5e559cfa2404a1d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_8fb032d43d510f80a36ca24348" ON "trip_requests" ("requesterUserId") `);
        await queryRunner.query(`CREATE INDEX "IDX_fe070a4056e5b330d0448986b6" ON "trip_requests" ("status") `);
        await queryRunner.query(`ALTER TABLE "trip_requests" ADD CONSTRAINT "FK_8fb032d43d510f80a36ca243480" FOREIGN KEY ("requesterUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "trip_requests" ADD CONSTRAINT "FK_5291f5e0e2ad932b1ed771517e9" FOREIGN KEY ("passengerId") REFERENCES "passengers"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "trip_requests" ADD CONSTRAINT "FK_6107328c2162e51348b20aea102" FOREIGN KEY ("processedByAdminId") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "trip_requests" ADD CONSTRAINT "FK_87d10c4c63e4c9cfff137bc50cd" FOREIGN KEY ("linkedTripId") REFERENCES "trips"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "trip_requests" DROP CONSTRAINT "FK_87d10c4c63e4c9cfff137bc50cd"`);
        await queryRunner.query(`ALTER TABLE "trip_requests" DROP CONSTRAINT "FK_6107328c2162e51348b20aea102"`);
        await queryRunner.query(`ALTER TABLE "trip_requests" DROP CONSTRAINT "FK_5291f5e0e2ad932b1ed771517e9"`);
        await queryRunner.query(`ALTER TABLE "trip_requests" DROP CONSTRAINT "FK_8fb032d43d510f80a36ca243480"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_fe070a4056e5b330d0448986b6"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8fb032d43d510f80a36ca24348"`);
        await queryRunner.query(`DROP TABLE "trip_requests"`);
    }

}
