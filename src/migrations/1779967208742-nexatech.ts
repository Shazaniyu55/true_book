import { MigrationInterface, QueryRunner } from "typeorm";

export class Nexatech1779967208742 implements MigrationInterface {
    name = 'Nexatech1779967208742'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "drivers" DROP CONSTRAINT "FK_92ab3fb69e566d3eb0cae896047"`);
        await queryRunner.query(`ALTER TABLE "document_verifications" DROP CONSTRAINT "FK_03f7a5158ada4ae9e1f3cad3cbb"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_456d0b5ba51837f336d39ea14e"`);
        await queryRunner.query(`ALTER TABLE "drivers" ADD "userId" uuid NOT NULL`);
        await queryRunner.query(`ALTER TABLE "trips" ADD "passengerId" uuid NOT NULL`);
        await queryRunner.query(`ALTER TABLE "escrows" DROP COLUMN "driverId"`);
        await queryRunner.query(`ALTER TABLE "escrows" ADD "driverId" uuid NOT NULL`);
        await queryRunner.query(`ALTER TABLE "escrows" DROP COLUMN "passengerId"`);
        await queryRunner.query(`ALTER TABLE "escrows" ADD "passengerId" uuid NOT NULL`);
        await queryRunner.query(`ALTER TABLE "document_verifications" DROP COLUMN "driverId"`);
        await queryRunner.query(`ALTER TABLE "document_verifications" ADD "driverId" uuid NOT NULL`);
        await queryRunner.query(`ALTER TABLE "agent_commissions" DROP CONSTRAINT "FK_456d0b5ba51837f336d39ea14ec"`);
        await queryRunner.query(`ALTER TABLE "agents" DROP CONSTRAINT "FK_f535e5b2c0f0dc7b7fc656ebc91"`);
        await queryRunner.query(`ALTER TABLE "agents" DROP CONSTRAINT "PK_9c653f28ae19c5884d5baf6a1d9"`);
        await queryRunner.query(`ALTER TABLE "agents" DROP COLUMN "id"`);
        await queryRunner.query(`ALTER TABLE "agents" ADD "id" uuid NOT NULL DEFAULT uuid_generate_v4()`);
        await queryRunner.query(`ALTER TABLE "agents" ADD CONSTRAINT "PK_9c653f28ae19c5884d5baf6a1d9" PRIMARY KEY ("id")`);
        await queryRunner.query(`ALTER TABLE "agents" ALTER COLUMN "userId" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "agent_commissions" DROP COLUMN "agentId"`);
        await queryRunner.query(`ALTER TABLE "agent_commissions" ADD "agentId" uuid NOT NULL`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_456d0b5ba51837f336d39ea14e" ON "agent_commissions" ("agentId") `);
        await queryRunner.query(`ALTER TABLE "drivers" ADD CONSTRAINT "FK_57d866371f392f459cd9ee46f6a" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "trips" ADD CONSTRAINT "FK_a4d572e126f5475433560c9a370" FOREIGN KEY ("passengerId") REFERENCES "passengers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "escrows" ADD CONSTRAINT "FK_72c614696223230218db2040cc7" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "escrows" ADD CONSTRAINT "FK_8f17574635d7407a19ec142a330" FOREIGN KEY ("passengerId") REFERENCES "passengers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "document_verifications" ADD CONSTRAINT "FK_33d9b3fbe72f2af8437cc779572" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "agents" ADD CONSTRAINT "FK_f535e5b2c0f0dc7b7fc656ebc91" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "agent_commissions" ADD CONSTRAINT "FK_456d0b5ba51837f336d39ea14ec" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "agent_commissions" DROP CONSTRAINT "FK_456d0b5ba51837f336d39ea14ec"`);
        await queryRunner.query(`ALTER TABLE "agents" DROP CONSTRAINT "FK_f535e5b2c0f0dc7b7fc656ebc91"`);
        await queryRunner.query(`ALTER TABLE "document_verifications" DROP CONSTRAINT "FK_33d9b3fbe72f2af8437cc779572"`);
        await queryRunner.query(`ALTER TABLE "escrows" DROP CONSTRAINT "FK_8f17574635d7407a19ec142a330"`);
        await queryRunner.query(`ALTER TABLE "escrows" DROP CONSTRAINT "FK_72c614696223230218db2040cc7"`);
        await queryRunner.query(`ALTER TABLE "trips" DROP CONSTRAINT "FK_a4d572e126f5475433560c9a370"`);
        await queryRunner.query(`ALTER TABLE "drivers" DROP CONSTRAINT "FK_57d866371f392f459cd9ee46f6a"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_456d0b5ba51837f336d39ea14e"`);
        await queryRunner.query(`ALTER TABLE "agent_commissions" DROP COLUMN "agentId"`);
        await queryRunner.query(`ALTER TABLE "agent_commissions" ADD "agentId" integer NOT NULL`);
        await queryRunner.query(`ALTER TABLE "agents" ALTER COLUMN "userId" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "agents" DROP CONSTRAINT "PK_9c653f28ae19c5884d5baf6a1d9"`);
        await queryRunner.query(`ALTER TABLE "agents" DROP COLUMN "id"`);
        await queryRunner.query(`ALTER TABLE "agents" ADD "id" SERIAL NOT NULL`);
        await queryRunner.query(`ALTER TABLE "agents" ADD CONSTRAINT "PK_9c653f28ae19c5884d5baf6a1d9" PRIMARY KEY ("id")`);
        await queryRunner.query(`ALTER TABLE "agents" ADD CONSTRAINT "FK_f535e5b2c0f0dc7b7fc656ebc91" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "agent_commissions" ADD CONSTRAINT "FK_456d0b5ba51837f336d39ea14ec" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "document_verifications" DROP COLUMN "driverId"`);
        await queryRunner.query(`ALTER TABLE "document_verifications" ADD "driverId" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "escrows" DROP COLUMN "passengerId"`);
        await queryRunner.query(`ALTER TABLE "escrows" ADD "passengerId" integer NOT NULL`);
        await queryRunner.query(`ALTER TABLE "escrows" DROP COLUMN "driverId"`);
        await queryRunner.query(`ALTER TABLE "escrows" ADD "driverId" integer NOT NULL`);
        await queryRunner.query(`ALTER TABLE "trips" DROP COLUMN "passengerId"`);
        await queryRunner.query(`ALTER TABLE "drivers" DROP COLUMN "userId"`);
        await queryRunner.query(`CREATE INDEX "IDX_456d0b5ba51837f336d39ea14e" ON "agent_commissions" ("agentId") `);
        await queryRunner.query(`ALTER TABLE "document_verifications" ADD CONSTRAINT "FK_03f7a5158ada4ae9e1f3cad3cbb" FOREIGN KEY ("id") REFERENCES "drivers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "drivers" ADD CONSTRAINT "FK_92ab3fb69e566d3eb0cae896047" FOREIGN KEY ("id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
