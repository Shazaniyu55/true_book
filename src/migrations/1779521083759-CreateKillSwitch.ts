import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateKillSwitch1779521083759 implements MigrationInterface {
    name = 'CreateKillSwitch1779521083759'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "kill_switch" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "updatedBy" character varying, "createdBy" character varying, "isActive" boolean NOT NULL DEFAULT false, "reason" character varying, "activatedBy" character varying, "activatedAt" TIMESTAMP WITH TIME ZONE, "deactivatedBy" character varying, "deactivatedAt" TIMESTAMP WITH TIME ZONE, "killedServices" character varying array NOT NULL DEFAULT '{}', "auditLog" jsonb NOT NULL DEFAULT '[]', CONSTRAINT "PK_1a2701be7d55428ea2c8f13cf7f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "agent_commissions" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "updatedBy" character varying, "createdBy" character varying, "agentId" integer NOT NULL, "bookingId" integer, "bookingAmount" numeric(10,2) NOT NULL, "commissionRate" numeric(5,2) NOT NULL, "commissionAmount" numeric(10,2) NOT NULL, "status" character varying NOT NULL DEFAULT 'pending', "description" character varying, CONSTRAINT "PK_a618185e8987a9322c597b19616" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_456d0b5ba51837f336d39ea14e" ON "agent_commissions" ("agentId") `);
        await queryRunner.query(`CREATE TABLE "admins" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "updatedBy" character varying, "createdBy" character varying, "email" character varying NOT NULL, "phone" character varying, "password" character varying, "firstName" character varying NOT NULL, "lastName" character varying NOT NULL, "role" character varying NOT NULL DEFAULT 'admin', "status" character varying NOT NULL DEFAULT 'pending', "isEmailVerified" boolean NOT NULL DEFAULT false, "isPhoneVerified" boolean NOT NULL DEFAULT false, "profilePhoto" character varying, "referralCode" character varying, "referredBy" character varying, "fcmToken" character varying, "deviceType" character varying, "otpCode" character varying, "otpExpiresAt" TIMESTAMP WITH TIME ZONE, "metadata" jsonb, CONSTRAINT "PK_e3b38270c97a854c48d2e80874e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_051db7d37d478a69a7432df147" ON "admins" ("email") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_bacf1cabdd51dca73d1a57ea66" ON "admins" ("phone") `);
        await queryRunner.query(`ALTER TABLE "agent_commissions" ADD CONSTRAINT "FK_456d0b5ba51837f336d39ea14ec" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "agent_commissions" ADD CONSTRAINT "FK_13ba6874e653d885fce220972f2" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "agent_commissions" DROP CONSTRAINT "FK_13ba6874e653d885fce220972f2"`);
        await queryRunner.query(`ALTER TABLE "agent_commissions" DROP CONSTRAINT "FK_456d0b5ba51837f336d39ea14ec"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_bacf1cabdd51dca73d1a57ea66"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_051db7d37d478a69a7432df147"`);
        await queryRunner.query(`DROP TABLE "admins"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_456d0b5ba51837f336d39ea14e"`);
        await queryRunner.query(`DROP TABLE "agent_commissions"`);
        await queryRunner.query(`DROP TABLE "kill_switch"`);
    }

}
