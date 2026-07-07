import { MigrationInterface, QueryRunner } from "typeorm";

export class Createescrol1783436736099 implements MigrationInterface {
    name = 'Createescrol1783436736099'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "trips" ALTER COLUMN "status" SET DEFAULT 'upcoming'`);
        await queryRunner.query(`ALTER TABLE "payouts" DROP CONSTRAINT "FK_672112e73dccff279d1cbe47ab5"`);
        await queryRunner.query(`ALTER TABLE "payouts" ALTER COLUMN "beneficiaryId" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "payouts" ADD CONSTRAINT "FK_672112e73dccff279d1cbe47ab5" FOREIGN KEY ("beneficiaryId") REFERENCES "beneficiaries"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "payouts" DROP CONSTRAINT "FK_672112e73dccff279d1cbe47ab5"`);
        await queryRunner.query(`ALTER TABLE "payouts" ALTER COLUMN "beneficiaryId" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "payouts" ADD CONSTRAINT "FK_672112e73dccff279d1cbe47ab5" FOREIGN KEY ("beneficiaryId") REFERENCES "beneficiaries"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "trips" ALTER COLUMN "status" SET DEFAULT 'pending'`);
    }

}
