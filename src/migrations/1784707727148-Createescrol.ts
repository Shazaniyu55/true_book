import { MigrationInterface, QueryRunner } from "typeorm";

export class Createescrol1784707727148 implements MigrationInterface {
    name = 'Createescrol1784707727148'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "booking_intents" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "updatedBy" character varying, "createdBy" character varying, "bookingCode" character varying NOT NULL, "tripId" uuid NOT NULL, "passengerId" uuid NOT NULL, "seats" integer NOT NULL DEFAULT '1', "totalAmount" numeric(10,2) NOT NULL, "discountAmount" numeric(10,2) NOT NULL DEFAULT '0', "amountPaid" numeric(10,2) NOT NULL, "couponCode" character varying, "couponId" uuid, "paymentReference" character varying NOT NULL, "status" character varying NOT NULL DEFAULT 'pending', "expiresAt" TIMESTAMP WITH TIME ZONE, "metadata" jsonb, CONSTRAINT "PK_ac3b02320101ac9f0c4dfe1a8cb" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_7bfd875cc64506972434235107" ON "booking_intents" ("bookingCode") `);
        await queryRunner.query(`ALTER TABLE "payments" ADD "bookingIntentId" uuid`);
        await queryRunner.query(`ALTER TABLE "booking_intents" ADD CONSTRAINT "FK_3cfb8fcc5eee12a847dff099f4e" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "booking_intents" ADD CONSTRAINT "FK_b626728374892b3c79a043bf8b9" FOREIGN KEY ("passengerId") REFERENCES "passengers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "booking_intents" DROP CONSTRAINT "FK_b626728374892b3c79a043bf8b9"`);
        await queryRunner.query(`ALTER TABLE "booking_intents" DROP CONSTRAINT "FK_3cfb8fcc5eee12a847dff099f4e"`);
        await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "bookingIntentId"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_7bfd875cc64506972434235107"`);
        await queryRunner.query(`DROP TABLE "booking_intents"`);
    }

}
