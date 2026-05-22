import { MigrationInterface, QueryRunner } from "typeorm";

export class  $npmConfigName1779436502913 implements MigrationInterface {
    name = ' $npmConfigName1779436502913'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "users" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "updatedBy" character varying, "createdBy" character varying, "email" character varying NOT NULL, "phone" character varying, "password" character varying, "firstName" character varying NOT NULL, "lastName" character varying NOT NULL, "role" character varying NOT NULL DEFAULT 'passenger', "status" character varying NOT NULL DEFAULT 'pending', "isEmailVerified" boolean NOT NULL DEFAULT false, "isPhoneVerified" boolean NOT NULL DEFAULT false, "profilePhoto" character varying, "referralCode" character varying, "referredBy" character varying, "fcmToken" character varying, "deviceType" character varying, "otpCode" character varying, "otpExpiresAt" TIMESTAMP WITH TIME ZONE, "metadata" jsonb, CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_97672ac88f789774dd47f7c8be" ON "users" ("email") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_a000cca60bcf04454e72769949" ON "users" ("phone") `);
        await queryRunner.query(`CREATE TABLE "drivers" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "updatedBy" character varying, "createdBy" character varying, "userId" integer NOT NULL, "status" character varying NOT NULL DEFAULT 'pending', "kycStatus" character varying NOT NULL DEFAULT 'not_started', "licenseNumber" character varying, "licenseExpiry" date, "bvn" character varying, "nin" character varying, "bvnVerified" boolean NOT NULL DEFAULT false, "ninVerified" boolean NOT NULL DEFAULT false, "licenseVerified" boolean NOT NULL DEFAULT false, "walletBalance" numeric(10,2) NOT NULL DEFAULT '0', "bankAccountName" character varying, "bankAccountNumber" character varying, "bankCode" character varying, "bankName" character varying, "transactionPin" character varying, "pinAttempts" integer NOT NULL DEFAULT '0', "isPinSet" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_92ab3fb69e566d3eb0cae896047" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_57d866371f392f459cd9ee46f6" ON "drivers" ("userId") `);
        await queryRunner.query(`CREATE TABLE "vehicles" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "updatedBy" character varying, "createdBy" character varying, "driverId" integer NOT NULL, "type" character varying NOT NULL, "make" character varying NOT NULL, "model" character varying NOT NULL, "year" character varying NOT NULL, "plateNumber" character varying NOT NULL, "color" character varying NOT NULL, "capacity" integer NOT NULL, "isVerified" boolean NOT NULL DEFAULT false, "isActive" boolean NOT NULL DEFAULT false, "vehiclePhoto" character varying, "documents" jsonb, CONSTRAINT "PK_18d8646b59304dce4af3a9e35b6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_66ea96381a7a7ceb35c72f3662" ON "vehicles" ("plateNumber") `);
        await queryRunner.query(`CREATE TABLE "trips" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "updatedBy" character varying, "createdBy" character varying, "reference" character varying NOT NULL, "driverId" integer NOT NULL, "vehicleId" integer, "origin" character varying NOT NULL, "destination" character varying NOT NULL, "departureTime" TIMESTAMP WITH TIME ZONE NOT NULL, "arrivalTime" TIMESTAMP WITH TIME ZONE, "totalSeats" integer NOT NULL, "bookedSeats" integer NOT NULL DEFAULT '0', "pricePerSeat" numeric(10,2) NOT NULL, "status" character varying NOT NULL DEFAULT 'pending', "waypoints" jsonb, "metadata" jsonb, CONSTRAINT "PK_f71c231dee9c05a9522f9e840f5" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_60f6183a2afab03f27f936a6a3" ON "trips" ("reference") `);
        await queryRunner.query(`CREATE TABLE "payouts" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "updatedBy" character varying, "createdBy" character varying, "reference" character varying NOT NULL, "driverId" integer NOT NULL, "amount" numeric(10,2) NOT NULL, "status" character varying NOT NULL DEFAULT 'pending', "transferCode" character varying, "recipientCode" character varying, "reason" character varying, "declineReason" character varying, "processedAt" TIMESTAMP WITH TIME ZONE, "metadata" jsonb, CONSTRAINT "PK_76855dc4f0a6c18c72eea302e87" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_124c14495d8a41b06d83cc7c0c" ON "payouts" ("reference") `);
        await queryRunner.query(`CREATE TABLE "passengers" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "updatedBy" character varying, "createdBy" character varying, "userId" integer NOT NULL, "walletBalance" numeric(10,2) NOT NULL DEFAULT '0', "totalTrips" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_9863c72acd866e4529f65c6c98c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_ffc3292d96c45f5524c82165ed" ON "passengers" ("userId") `);
        await queryRunner.query(`CREATE TABLE "notifications" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "updatedBy" character varying, "createdBy" character varying, "userId" integer NOT NULL, "title" character varying NOT NULL, "body" text NOT NULL, "type" character varying NOT NULL, "isRead" boolean NOT NULL DEFAULT false, "data" jsonb, CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "document_verifications" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "updatedBy" character varying, "createdBy" character varying, "driverId" integer NOT NULL, "documentType" character varying NOT NULL, "documentUrl" character varying NOT NULL, "status" character varying NOT NULL DEFAULT 'pending', "rejectionReason" character varying, "verificationData" jsonb, CONSTRAINT "PK_03f7a5158ada4ae9e1f3cad3cbb" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "coupons" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "updatedBy" character varying, "createdBy" character varying, "code" character varying NOT NULL, "type" character varying NOT NULL, "status" character varying NOT NULL DEFAULT 'active', "value" numeric(10,2) NOT NULL, "maxDiscount" numeric(10,2), "minOrderAmount" numeric(10,2), "usageLimit" integer, "usageCount" integer NOT NULL DEFAULT '0', "expiresAt" TIMESTAMP WITH TIME ZONE, "isActive" boolean NOT NULL DEFAULT true, "createdByUserId" integer, CONSTRAINT "PK_d7ea8864a0150183770f3e9a8cb" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_e025109230e82925843f2a14c4" ON "coupons" ("code") `);
        await queryRunner.query(`CREATE TABLE "bookings" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "updatedBy" character varying, "createdBy" character varying, "bookingCode" character varying NOT NULL, "tripId" integer NOT NULL, "passengerId" integer NOT NULL, "seats" integer NOT NULL DEFAULT '1', "totalAmount" numeric(10,2) NOT NULL, "discountAmount" numeric(10,2) NOT NULL DEFAULT '0', "amountPaid" numeric(10,2) NOT NULL, "status" character varying NOT NULL DEFAULT 'pending', "paymentStatus" character varying NOT NULL DEFAULT 'pending', "paymentReference" character varying, "paymentGateway" character varying, "couponCode" character varying, "isCheckedIn" boolean NOT NULL DEFAULT false, "checkedInAt" TIMESTAMP WITH TIME ZONE, "metadata" jsonb, CONSTRAINT "PK_bee6805982cc1e248e94ce94957" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_4518ea74b559982127da726e89" ON "bookings" ("bookingCode") `);
        await queryRunner.query(`CREATE TABLE "agents" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "updatedBy" character varying, "createdBy" character varying, "userId" integer NOT NULL, "walletBalance" numeric(10,2) NOT NULL DEFAULT '0', "totalCommission" numeric(10,2) NOT NULL DEFAULT '0', "bankAccountName" character varying, "bankAccountNumber" character varying, "bankCode" character varying, "totalReferrals" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_9c653f28ae19c5884d5baf6a1d9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_f535e5b2c0f0dc7b7fc656ebc9" ON "agents" ("userId") `);
        await queryRunner.query(`ALTER TABLE "drivers" ADD CONSTRAINT "FK_57d866371f392f459cd9ee46f6a" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "vehicles" ADD CONSTRAINT "FK_28d7607488252336b22511e9e80" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "trips" ADD CONSTRAINT "FK_fc5a8911f85074a660a4304baa1" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "trips" ADD CONSTRAINT "FK_d3cea80b69fc4ecfd2273068395" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "payouts" ADD CONSTRAINT "FK_432bd34c495ea23e5c182eb0e42" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "passengers" ADD CONSTRAINT "FK_ffc3292d96c45f5524c82165ed7" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD CONSTRAINT "FK_692a909ee0fa9383e7859f9b406" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "document_verifications" ADD CONSTRAINT "FK_33d9b3fbe72f2af8437cc779572" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "bookings" ADD CONSTRAINT "FK_e33f0b046a54956d011b3d377ef" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "bookings" ADD CONSTRAINT "FK_4ddbabffcf7921575886059d5c0" FOREIGN KEY ("passengerId") REFERENCES "passengers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "agents" ADD CONSTRAINT "FK_f535e5b2c0f0dc7b7fc656ebc91" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "agents" DROP CONSTRAINT "FK_f535e5b2c0f0dc7b7fc656ebc91"`);
        await queryRunner.query(`ALTER TABLE "bookings" DROP CONSTRAINT "FK_4ddbabffcf7921575886059d5c0"`);
        await queryRunner.query(`ALTER TABLE "bookings" DROP CONSTRAINT "FK_e33f0b046a54956d011b3d377ef"`);
        await queryRunner.query(`ALTER TABLE "document_verifications" DROP CONSTRAINT "FK_33d9b3fbe72f2af8437cc779572"`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_692a909ee0fa9383e7859f9b406"`);
        await queryRunner.query(`ALTER TABLE "passengers" DROP CONSTRAINT "FK_ffc3292d96c45f5524c82165ed7"`);
        await queryRunner.query(`ALTER TABLE "payouts" DROP CONSTRAINT "FK_432bd34c495ea23e5c182eb0e42"`);
        await queryRunner.query(`ALTER TABLE "trips" DROP CONSTRAINT "FK_d3cea80b69fc4ecfd2273068395"`);
        await queryRunner.query(`ALTER TABLE "trips" DROP CONSTRAINT "FK_fc5a8911f85074a660a4304baa1"`);
        await queryRunner.query(`ALTER TABLE "vehicles" DROP CONSTRAINT "FK_28d7607488252336b22511e9e80"`);
        await queryRunner.query(`ALTER TABLE "drivers" DROP CONSTRAINT "FK_57d866371f392f459cd9ee46f6a"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f535e5b2c0f0dc7b7fc656ebc9"`);
        await queryRunner.query(`DROP TABLE "agents"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_4518ea74b559982127da726e89"`);
        await queryRunner.query(`DROP TABLE "bookings"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e025109230e82925843f2a14c4"`);
        await queryRunner.query(`DROP TABLE "coupons"`);
        await queryRunner.query(`DROP TABLE "document_verifications"`);
        await queryRunner.query(`DROP TABLE "notifications"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ffc3292d96c45f5524c82165ed"`);
        await queryRunner.query(`DROP TABLE "passengers"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_124c14495d8a41b06d83cc7c0c"`);
        await queryRunner.query(`DROP TABLE "payouts"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_60f6183a2afab03f27f936a6a3"`);
        await queryRunner.query(`DROP TABLE "trips"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_66ea96381a7a7ceb35c72f3662"`);
        await queryRunner.query(`DROP TABLE "vehicles"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_57d866371f392f459cd9ee46f6"`);
        await queryRunner.query(`DROP TABLE "drivers"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a000cca60bcf04454e72769949"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_97672ac88f789774dd47f7c8be"`);
        await queryRunner.query(`DROP TABLE "users"`);
    }

}
