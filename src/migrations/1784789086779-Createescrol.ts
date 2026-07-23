import { MigrationInterface, QueryRunner } from "typeorm";

export class Createescrol1784789086779 implements MigrationInterface {
    name = 'Createescrol1784789086779'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "coupons" ADD "userId" uuid`);
        await queryRunner.query(`ALTER TABLE "coupons" ADD CONSTRAINT "FK_81dcb5419991c66b6fd4a1b6188" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "coupons" DROP CONSTRAINT "FK_81dcb5419991c66b6fd4a1b6188"`);
        await queryRunner.query(`ALTER TABLE "coupons" DROP COLUMN "userId"`);
    }

}
