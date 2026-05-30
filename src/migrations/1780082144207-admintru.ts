import { MigrationInterface, QueryRunner } from "typeorm";

export class Admintru1780082144207 implements MigrationInterface {
    name = 'Admintru1780082144207'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "admins" RENAME COLUMN "roleName" TO "role"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "admins" RENAME COLUMN "role" TO "roleName"`);
    }

}
