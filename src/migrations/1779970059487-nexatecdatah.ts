import { MigrationInterface, QueryRunner } from "typeorm";

export class Nexatecdatah1779970059487 implements MigrationInterface {
    name = 'Nexatecdatah1779970059487'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "trips" DROP CONSTRAINT "FK_a4d572e126f5475433560c9a370"`);
        await queryRunner.query(`ALTER TABLE "trips" ALTER COLUMN "passengerId" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "trips" ADD CONSTRAINT "FK_a4d572e126f5475433560c9a370" FOREIGN KEY ("passengerId") REFERENCES "passengers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "trips" DROP CONSTRAINT "FK_a4d572e126f5475433560c9a370"`);
        await queryRunner.query(`ALTER TABLE "trips" ALTER COLUMN "passengerId" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "trips" ADD CONSTRAINT "FK_a4d572e126f5475433560c9a370" FOREIGN KEY ("passengerId") REFERENCES "passengers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
