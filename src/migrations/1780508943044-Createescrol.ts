import { MigrationInterface, QueryRunner } from "typeorm";

export class Createescrol1780508943044 implements MigrationInterface {
    name = 'Createescrol1780508943044'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "search_histories" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "updatedBy" character varying, "createdBy" character varying, "passengerId" uuid NOT NULL, "origin" character varying, "destination" character varying, "departureDate" date, "seats" integer, "maxPrice" numeric(10,2), "resultCount" integer, "metadata" jsonb, CONSTRAINT "PK_55eb6ed37ed8a334b599b3dfe66" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_0b63c3dd9ccff3b2c390d9d40a" ON "search_histories" ("passengerId") `);
        await queryRunner.query(`CREATE TABLE "reviews" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "updatedBy" character varying, "createdBy" character varying, "bookingId" uuid NOT NULL, "driverId" uuid NOT NULL, "passengerId" uuid NOT NULL, "tripId" uuid, "rating" integer NOT NULL, "comment" text, "isVisible" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_231ae565c273ee700b283f15c1d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_c357057587a1c2afae453515bf" ON "reviews" ("bookingId") `);
        await queryRunner.query(`CREATE INDEX "IDX_44dad78449ef449cd59f6a4740" ON "reviews" ("driverId") `);
        await queryRunner.query(`CREATE TABLE "payments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "updatedBy" character varying, "createdBy" character varying, "bookingId" uuid, "passengerId" uuid, "tripId" uuid, "currency" character varying NOT NULL DEFAULT 'NGN', "billingDetails" jsonb, "status" character varying NOT NULL DEFAULT 'pending', "txRef" character varying NOT NULL, "amount" numeric(10,2) NOT NULL, "paymentType" character varying, "customerName" character varying, "customerEmail" character varying, "card" jsonb, "raveReference" character varying, CONSTRAINT "PK_197ab7af18c93fbb0c9b28b4a59" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_a167f4b14bebbe6e781b7d3ca5" ON "payments" ("txRef") `);
        await queryRunner.query(`CREATE TABLE "beneficiaries" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "updatedBy" character varying, "createdBy" character varying, "beneficiaryableId" uuid NOT NULL, "beneficiaryableType" character varying NOT NULL, "bankAccountName" character varying, "bankAccountNumber" character varying NOT NULL, "bankCode" character varying NOT NULL, "bankName" character varying, "nickname" character varying, "isDefault" boolean NOT NULL DEFAULT false, "metadata" jsonb, CONSTRAINT "PK_c9356d282dec80f7f12a9eef10a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_a149c790c0e3be716ec3403172" ON "beneficiaries" ("beneficiaryableType", "beneficiaryableId") `);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "profilePhoto"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "fcmToken"`);
        await queryRunner.query(`ALTER TABLE "passengers" DROP COLUMN "bvnVerified"`);
        await queryRunner.query(`ALTER TABLE "passengers" DROP COLUMN "bvnData"`);
        await queryRunner.query(`ALTER TABLE "passengers" DROP COLUMN "bvnVerifiedAt"`);
        await queryRunner.query(`ALTER TABLE "passengers" DROP COLUMN "ninVerified"`);
        await queryRunner.query(`ALTER TABLE "passengers" DROP COLUMN "ninData"`);
        await queryRunner.query(`ALTER TABLE "passengers" DROP COLUMN "ninVerifiedAt"`);
        await queryRunner.query(`ALTER TABLE "passengers" DROP COLUMN "kycStatus"`);
        await queryRunner.query(`ALTER TABLE "passengers" DROP COLUMN "bvn"`);
        await queryRunner.query(`ALTER TABLE "passengers" DROP COLUMN "nin"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "fullName" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "users" ADD "profileImage" character varying`);
        await queryRunner.query(`ALTER TABLE "users" ADD "expoToken" character varying`);
        await queryRunner.query(`ALTER TABLE "users" ADD "deleteReason" character varying`);
        await queryRunner.query(`ALTER TABLE "users" ADD "dob" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "drivers" ADD "averageRating" numeric(3,2) NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "drivers" ADD "ratingCount" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "passengers" ADD "nxt_kin_name" character varying`);
        await queryRunner.query(`ALTER TABLE "passengers" ADD "nxt_kin_relationship" character varying`);
        await queryRunner.query(`ALTER TABLE "passengers" ADD "nxt_kin_telephone" character varying`);
        await queryRunner.query(`ALTER TABLE "passengers" ADD "payment_details" jsonb`);
        await queryRunner.query(`ALTER TABLE "search_histories" ADD CONSTRAINT "FK_0b63c3dd9ccff3b2c390d9d40ae" FOREIGN KEY ("passengerId") REFERENCES "passengers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reviews" ADD CONSTRAINT "FK_c357057587a1c2afae453515bf6" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reviews" ADD CONSTRAINT "FK_44dad78449ef449cd59f6a47402" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reviews" ADD CONSTRAINT "FK_02821a32e4070b26ece5bb7fe64" FOREIGN KEY ("passengerId") REFERENCES "passengers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reviews" ADD CONSTRAINT "FK_04fe8bab14b4679f871564f09ae" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "payments" ADD CONSTRAINT "FK_1ead3dc5d71db0ea822706e389d" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "payments" ADD CONSTRAINT "FK_2d94fea9aaefaaeab8c8aee988b" FOREIGN KEY ("passengerId") REFERENCES "passengers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "payments" ADD CONSTRAINT "FK_4277aa2c0e3a4a3591474dbea2f" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "payments" DROP CONSTRAINT "FK_4277aa2c0e3a4a3591474dbea2f"`);
        await queryRunner.query(`ALTER TABLE "payments" DROP CONSTRAINT "FK_2d94fea9aaefaaeab8c8aee988b"`);
        await queryRunner.query(`ALTER TABLE "payments" DROP CONSTRAINT "FK_1ead3dc5d71db0ea822706e389d"`);
        await queryRunner.query(`ALTER TABLE "reviews" DROP CONSTRAINT "FK_04fe8bab14b4679f871564f09ae"`);
        await queryRunner.query(`ALTER TABLE "reviews" DROP CONSTRAINT "FK_02821a32e4070b26ece5bb7fe64"`);
        await queryRunner.query(`ALTER TABLE "reviews" DROP CONSTRAINT "FK_44dad78449ef449cd59f6a47402"`);
        await queryRunner.query(`ALTER TABLE "reviews" DROP CONSTRAINT "FK_c357057587a1c2afae453515bf6"`);
        await queryRunner.query(`ALTER TABLE "search_histories" DROP CONSTRAINT "FK_0b63c3dd9ccff3b2c390d9d40ae"`);
        await queryRunner.query(`ALTER TABLE "passengers" DROP COLUMN "payment_details"`);
        await queryRunner.query(`ALTER TABLE "passengers" DROP COLUMN "nxt_kin_telephone"`);
        await queryRunner.query(`ALTER TABLE "passengers" DROP COLUMN "nxt_kin_relationship"`);
        await queryRunner.query(`ALTER TABLE "passengers" DROP COLUMN "nxt_kin_name"`);
        await queryRunner.query(`ALTER TABLE "drivers" DROP COLUMN "ratingCount"`);
        await queryRunner.query(`ALTER TABLE "drivers" DROP COLUMN "averageRating"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "dob"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "deleteReason"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "expoToken"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "profileImage"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "fullName"`);
        await queryRunner.query(`ALTER TABLE "passengers" ADD "nin" character varying`);
        await queryRunner.query(`ALTER TABLE "passengers" ADD "bvn" character varying`);
        await queryRunner.query(`ALTER TABLE "passengers" ADD "kycStatus" character varying NOT NULL DEFAULT 'not_started'`);
        await queryRunner.query(`ALTER TABLE "passengers" ADD "ninVerifiedAt" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "passengers" ADD "ninData" jsonb`);
        await queryRunner.query(`ALTER TABLE "passengers" ADD "ninVerified" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "passengers" ADD "bvnVerifiedAt" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "passengers" ADD "bvnData" jsonb`);
        await queryRunner.query(`ALTER TABLE "passengers" ADD "bvnVerified" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "users" ADD "fcmToken" character varying`);
        await queryRunner.query(`ALTER TABLE "users" ADD "profilePhoto" character varying`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a149c790c0e3be716ec3403172"`);
        await queryRunner.query(`DROP TABLE "beneficiaries"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a167f4b14bebbe6e781b7d3ca5"`);
        await queryRunner.query(`DROP TABLE "payments"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_44dad78449ef449cd59f6a4740"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c357057587a1c2afae453515bf"`);
        await queryRunner.query(`DROP TABLE "reviews"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0b63c3dd9ccff3b2c390d9d40a"`);
        await queryRunner.query(`DROP TABLE "search_histories"`);
    }

}
