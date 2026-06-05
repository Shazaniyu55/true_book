import { MigrationInterface, QueryRunner } from "typeorm";

export class Adminentity1780685427668 implements MigrationInterface {
    name = 'Adminentity1780685427668'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "trip_locations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "updatedBy" character varying, "createdBy" character varying, "tripId" uuid NOT NULL, "driverId" uuid NOT NULL, "latitude" numeric(10,7) NOT NULL, "longitude" numeric(10,7) NOT NULL, "heading" double precision, "speed" double precision, CONSTRAINT "PK_f053370498ff61658917241d211" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_18de0539055ce1b254d1e1a64b" ON "trip_locations" ("tripId", "createdAt") `);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "fullName"`);
        await queryRunner.query(`ALTER TABLE "trips" DROP COLUMN "pricePerSeat"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "otpAttempts" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "users" ADD "phoneOtpAttempts" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "bookings" ADD "ticketToken" character varying`);
        await queryRunner.query(`ALTER TABLE "bookings" ADD "ticketStatus" character varying NOT NULL DEFAULT 'pending'`);
        await queryRunner.query(`ALTER TABLE "bookings" ADD "ticketIssuedAt" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "bookings" ADD "scannedAt" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "bookings" ADD "scannedBy" character varying`);
        await queryRunner.query(`ALTER TABLE "trips" ADD "departureDate" date NOT NULL`);
        await queryRunner.query(`ALTER TABLE "trips" ADD "arrivalDate" date`);
        await queryRunner.query(`ALTER TABLE "trips" ADD "departureLocation" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "trips" ADD "arrivalDestination" jsonb`);
        await queryRunner.query(`ALTER TABLE "trips" ADD "tripSpecification" jsonb`);
        await queryRunner.query(`ALTER TABLE "trips" ADD "pickStation" character varying`);
        await queryRunner.query(`ALTER TABLE "trips" ADD "dropOffStation" character varying`);
        await queryRunner.query(`ALTER TABLE "trips" ADD "bookingClosingDate" date`);
        await queryRunner.query(`ALTER TABLE "trips" ADD "bookingClosingTime" TIME`);
        await queryRunner.query(`ALTER TABLE "trips" ADD "busStop" jsonb`);
        await queryRunner.query(`ALTER TABLE "trips" ADD "price" numeric(10,2) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "trips" ADD "availableSeats" integer NOT NULL`);
        await queryRunner.query(`ALTER TABLE "trips" ADD "reasonForTripCancellation" character varying`);
        await queryRunner.query(`ALTER TABLE "trips" ADD "cancelledByDriver" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "trips" ADD "departureLatlong" jsonb`);
        await queryRunner.query(`ALTER TABLE "trips" ADD "busstopLatlong" jsonb`);
        await queryRunner.query(`ALTER TABLE "trips" ADD "bookingStatus" character varying`);
        await queryRunner.query(`ALTER TABLE "trips" ADD "state" character varying`);
        await queryRunner.query(`ALTER TABLE "admins" ADD "firstName" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "admins" ADD "lastName" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "admins" ADD "city" character varying`);
        await queryRunner.query(`ALTER TABLE "admins" ADD "country" character varying`);
        await queryRunner.query(`ALTER TABLE "admins" ADD "address" character varying`);
        await queryRunner.query(`ALTER TABLE "admins" ADD "gender" character varying`);
        await queryRunner.query(`ALTER TABLE "admins" ADD "dob" date`);
        await queryRunner.query(`ALTER TABLE "trips" DROP COLUMN "departureTime"`);
        await queryRunner.query(`ALTER TABLE "trips" ADD "departureTime" TIME NOT NULL`);
        await queryRunner.query(`ALTER TABLE "trips" DROP COLUMN "arrivalTime"`);
        await queryRunner.query(`ALTER TABLE "trips" ADD "arrivalTime" TIME`);
        await queryRunner.query(`ALTER TABLE "trip_locations" ADD CONSTRAINT "FK_0041e4d26c56e593d1f15f80351" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "trip_locations" ADD CONSTRAINT "FK_62e9f07eb828507ac70eb1d4ad9" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "trip_locations" DROP CONSTRAINT "FK_62e9f07eb828507ac70eb1d4ad9"`);
        await queryRunner.query(`ALTER TABLE "trip_locations" DROP CONSTRAINT "FK_0041e4d26c56e593d1f15f80351"`);
        await queryRunner.query(`ALTER TABLE "trips" DROP COLUMN "arrivalTime"`);
        await queryRunner.query(`ALTER TABLE "trips" ADD "arrivalTime" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "trips" DROP COLUMN "departureTime"`);
        await queryRunner.query(`ALTER TABLE "trips" ADD "departureTime" TIMESTAMP WITH TIME ZONE NOT NULL`);
        await queryRunner.query(`ALTER TABLE "admins" DROP COLUMN "dob"`);
        await queryRunner.query(`ALTER TABLE "admins" DROP COLUMN "gender"`);
        await queryRunner.query(`ALTER TABLE "admins" DROP COLUMN "address"`);
        await queryRunner.query(`ALTER TABLE "admins" DROP COLUMN "country"`);
        await queryRunner.query(`ALTER TABLE "admins" DROP COLUMN "city"`);
        await queryRunner.query(`ALTER TABLE "admins" DROP COLUMN "lastName"`);
        await queryRunner.query(`ALTER TABLE "admins" DROP COLUMN "firstName"`);
        await queryRunner.query(`ALTER TABLE "trips" DROP COLUMN "state"`);
        await queryRunner.query(`ALTER TABLE "trips" DROP COLUMN "bookingStatus"`);
        await queryRunner.query(`ALTER TABLE "trips" DROP COLUMN "busstopLatlong"`);
        await queryRunner.query(`ALTER TABLE "trips" DROP COLUMN "departureLatlong"`);
        await queryRunner.query(`ALTER TABLE "trips" DROP COLUMN "cancelledByDriver"`);
        await queryRunner.query(`ALTER TABLE "trips" DROP COLUMN "reasonForTripCancellation"`);
        await queryRunner.query(`ALTER TABLE "trips" DROP COLUMN "availableSeats"`);
        await queryRunner.query(`ALTER TABLE "trips" DROP COLUMN "price"`);
        await queryRunner.query(`ALTER TABLE "trips" DROP COLUMN "busStop"`);
        await queryRunner.query(`ALTER TABLE "trips" DROP COLUMN "bookingClosingTime"`);
        await queryRunner.query(`ALTER TABLE "trips" DROP COLUMN "bookingClosingDate"`);
        await queryRunner.query(`ALTER TABLE "trips" DROP COLUMN "dropOffStation"`);
        await queryRunner.query(`ALTER TABLE "trips" DROP COLUMN "pickStation"`);
        await queryRunner.query(`ALTER TABLE "trips" DROP COLUMN "tripSpecification"`);
        await queryRunner.query(`ALTER TABLE "trips" DROP COLUMN "arrivalDestination"`);
        await queryRunner.query(`ALTER TABLE "trips" DROP COLUMN "departureLocation"`);
        await queryRunner.query(`ALTER TABLE "trips" DROP COLUMN "arrivalDate"`);
        await queryRunner.query(`ALTER TABLE "trips" DROP COLUMN "departureDate"`);
        await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN "scannedBy"`);
        await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN "scannedAt"`);
        await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN "ticketIssuedAt"`);
        await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN "ticketStatus"`);
        await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN "ticketToken"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "phoneOtpAttempts"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "otpAttempts"`);
        await queryRunner.query(`ALTER TABLE "trips" ADD "pricePerSeat" numeric(10,2) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "users" ADD "fullName" character varying NOT NULL`);
        await queryRunner.query(`DROP INDEX "public"."IDX_18de0539055ce1b254d1e1a64b"`);
        await queryRunner.query(`DROP TABLE "trip_locations"`);
    }

}
