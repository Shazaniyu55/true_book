import { MigrationInterface, QueryRunner } from "typeorm";

export class Createescrol1781645208534 implements MigrationInterface {
    name = 'Createescrol1781645208534'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "vehicles" ALTER COLUMN "type" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "vehicles" ALTER COLUMN "make" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "vehicles" ALTER COLUMN "year" DROP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "vehicles" ALTER COLUMN "year" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "vehicles" ALTER COLUMN "make" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "vehicles" ALTER COLUMN "type" SET NOT NULL`);
    }

}
