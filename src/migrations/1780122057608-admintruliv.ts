import { MigrationInterface, QueryRunner } from "typeorm";

export class Admintruliv1780122057608 implements MigrationInterface {
    name = 'Admintruliv1780122057608'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "roleId" uuid`);
        await queryRunner.query(`ALTER TABLE "admins" ADD COLUMN IF NOT EXISTS "role" character varying`);
        await queryRunner.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint
                    WHERE conname = 'FK_368e146b785b574f42ae9e53d5e'
                ) THEN
                    ALTER TABLE "users"
                    ADD CONSTRAINT "FK_368e146b785b574f42ae9e53d5e"
                    FOREIGN KEY ("roleId") REFERENCES "roles"("id")
                    ON DELETE NO ACTION ON UPDATE NO ACTION;
                END IF;
            END
            $$;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "FK_368e146b785b574f42ae9e53d5e"`);
        await queryRunner.query(`ALTER TABLE "admins" DROP COLUMN IF EXISTS "role"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "roleId"`);
    }

}