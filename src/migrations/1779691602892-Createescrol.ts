import { MigrationInterface, QueryRunner } from "typeorm";

export class Createescrol1779691602892 implements MigrationInterface {
    name = 'Createescrol1779691602892'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "escrows" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "updatedBy" character varying, "createdBy" character varying, "reference" character varying NOT NULL, "bookingId" integer NOT NULL, "amount" numeric(10,2) NOT NULL, "platformFee" numeric(10,2) NOT NULL DEFAULT '0', "netDriverAmount" numeric(10,2) NOT NULL, "status" character varying NOT NULL DEFAULT 'held', "driverId" integer NOT NULL, "passengerId" integer NOT NULL, "paymentReference" character varying, "releasedAt" TIMESTAMP WITH TIME ZONE, "refundedAt" TIMESTAMP WITH TIME ZONE, "releaseReason" character varying, "metadata" jsonb, CONSTRAINT "PK_9cd10ae5b52350c3a20d124f5d3" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_eab3075487e02eedc9681b11ac" ON "escrows" ("reference") `);
        await queryRunner.query(`ALTER TABLE "escrows" ADD CONSTRAINT "FK_0ebf28dc71d93c52da188f3138e" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "escrows" DROP CONSTRAINT "FK_0ebf28dc71d93c52da188f3138e"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_eab3075487e02eedc9681b11ac"`);
        await queryRunner.query(`DROP TABLE "escrows"`);
    }

}
