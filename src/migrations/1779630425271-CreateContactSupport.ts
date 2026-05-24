import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateContactSupport1779630425271 implements MigrationInterface {
    name = 'CreateContactSupport1779630425271'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."contact_supports_user_type_enum" AS ENUM('passenger', 'driver', 'admin', 'agent', 'guest')`);
        await queryRunner.query(`CREATE TYPE "public"."contact_supports_status_enum" AS ENUM('pending', 'in_progress', 'resolved', 'closed')`);
        await queryRunner.query(`CREATE TABLE "contact_supports" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(255) NOT NULL, "email" character varying(255) NOT NULL, "subject" character varying(500) NOT NULL, "message" text NOT NULL, "user_type" "public"."contact_supports_user_type_enum" NOT NULL DEFAULT 'passenger', "status" "public"."contact_supports_status_enum" NOT NULL DEFAULT 'pending', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_4f5dbe0ffa86a795b1d24792518" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_af589fcb313540f293708b1b8f" ON "contact_supports" ("created_at") `);
        await queryRunner.query(`CREATE INDEX "IDX_01e8bd0b9f21cfd0ee7a26ab72" ON "contact_supports" ("user_type") `);
        await queryRunner.query(`CREATE INDEX "IDX_4fdc065c324424996091e425e9" ON "contact_supports" ("status") `);
        await queryRunner.query(`CREATE INDEX "IDX_884a8b83fbbaf469a154ef307d" ON "contact_supports" ("email") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_884a8b83fbbaf469a154ef307d"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_4fdc065c324424996091e425e9"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_01e8bd0b9f21cfd0ee7a26ab72"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_af589fcb313540f293708b1b8f"`);
        await queryRunner.query(`DROP TABLE "contact_supports"`);
        await queryRunner.query(`DROP TYPE "public"."contact_supports_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."contact_supports_user_type_enum"`);
    }

}
