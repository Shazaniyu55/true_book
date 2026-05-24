import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateRolesPermissions1779628306060
  implements MigrationInterface
{
  name = "UpdateRolesPermissions1779628306060";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ensure uuid extension exists
    await queryRunner.query(
      `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`
    );

    // Drop old Laravel/Spatie pivot tables
    await queryRunner.query(
      `DROP TABLE IF EXISTS "role_has_permissions" CASCADE`
    );

    await queryRunner.query(
      `DROP TABLE IF EXISTS "model_has_permissions" CASCADE`
    );

    await queryRunner.query(
      `DROP TABLE IF EXISTS "model_has_roles" CASCADE`
    );

    // Drop old constraints safely
    await queryRunner.query(`
      ALTER TABLE "permissions"
      DROP CONSTRAINT IF EXISTS "permissions_name_guard_name_unique"
    `);

    await queryRunner.query(`
      ALTER TABLE "roles"
      DROP CONSTRAINT IF EXISTS "roles_name_guard_name_unique"
    `);

    // Remove old Laravel timestamp columns
    await queryRunner.query(`
      ALTER TABLE "permissions"
      DROP COLUMN IF EXISTS "created_at"
    `);

    await queryRunner.query(`
      ALTER TABLE "permissions"
      DROP COLUMN IF EXISTS "updated_at"
    `);

    await queryRunner.query(`
      ALTER TABLE "permissions"
      DROP COLUMN IF EXISTS "guard_name"
    `);

    await queryRunner.query(`
      ALTER TABLE "roles"
      DROP COLUMN IF EXISTS "created_at"
    `);

    await queryRunner.query(`
      ALTER TABLE "roles"
      DROP COLUMN IF EXISTS "updated_at"
    `);

    await queryRunner.query(`
      ALTER TABLE "roles"
      DROP COLUMN IF EXISTS "guard_name"
    `);

    // Add new columns
    await queryRunner.query(`
      ALTER TABLE "permissions"
      ADD COLUMN IF NOT EXISTS "roleId" uuid
    `);

    await queryRunner.query(`
      ALTER TABLE "permissions"
      ADD COLUMN IF NOT EXISTS "status" boolean NOT NULL DEFAULT true
    `);

    await queryRunner.query(`
      ALTER TABLE "roles"
      ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP NOT NULL DEFAULT now()
    `);

    await queryRunner.query(`
      ALTER TABLE "roles"
      ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
    `);

    /**
     * =========================
     * Convert permissions.id to UUID
     * =========================
     */

    await queryRunner.query(`
      ALTER TABLE "permissions"
      DROP CONSTRAINT IF EXISTS "permissions_pkey" CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "permissions"
      DROP COLUMN IF EXISTS "id"
    `);

    await queryRunner.query(`
      ALTER TABLE "permissions"
      ADD COLUMN "id" uuid NOT NULL DEFAULT uuid_generate_v4()
    `);

    await queryRunner.query(`
      ALTER TABLE "permissions"
      ADD CONSTRAINT "PK_920331560282b8bd21bb02290df"
      PRIMARY KEY ("id")
    `);

    /**
     * =========================
     * Convert roles.id to UUID
     * =========================
     */

    await queryRunner.query(`
      ALTER TABLE "roles"
      DROP CONSTRAINT IF EXISTS "roles_pkey" CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "roles"
      DROP COLUMN IF EXISTS "id"
    `);

    await queryRunner.query(`
      ALTER TABLE "roles"
      ADD COLUMN "id" uuid NOT NULL DEFAULT uuid_generate_v4()
    `);

    await queryRunner.query(`
      ALTER TABLE "roles"
      ADD CONSTRAINT "PK_c1433d71a4838793a49dcad46ab"
      PRIMARY KEY ("id")
    `);

    /**
     * =========================
     * Fix roles.name safely
     * =========================
     */

    // Remove rows with null names
    await queryRunner.query(`
      DELETE FROM "roles"
      WHERE "name" IS NULL
    `);

    // Replace empty names
    await queryRunner.query(`
      UPDATE "roles"
      SET "name" = CONCAT('role-', FLOOR(RANDOM() * 100000)::text)
      WHERE TRIM("name") = ''
    `);

    // Ensure column type
    await queryRunner.query(`
      ALTER TABLE "roles"
      ALTER COLUMN "name" TYPE character varying
    `);

    // Set NOT NULL
    await queryRunner.query(`
      ALTER TABLE "roles"
      ALTER COLUMN "name" SET NOT NULL
    `);

    // Add unique constraint
    await queryRunner.query(`
      ALTER TABLE "roles"
      ADD CONSTRAINT "UQ_648e3f5447f725579d7d4ffdfb7"
      UNIQUE ("name")
    `);

    /**
     * =========================
     * Create default admin role
     * =========================
     */

    await queryRunner.query(`
      INSERT INTO "roles" ("id", "name", "createdAt", "updatedAt")
      VALUES (
        uuid_generate_v4(),
        'admin',
        now(),
        now()
      )
      ON CONFLICT ("name") DO NOTHING
    `);

    /**
     * =========================
     * Assign permissions.roleId
     * =========================
     */

    await queryRunner.query(`
      UPDATE "permissions"
      SET "roleId" = (
        SELECT "id"
        FROM "roles"
        WHERE "name" = 'admin'
        LIMIT 1
      )
      WHERE "roleId" IS NULL
    `);

    // Enforce NOT NULL
    await queryRunner.query(`
      ALTER TABLE "permissions"
      ALTER COLUMN "roleId" SET NOT NULL
    `);

    /**
     * =========================
     * Add Foreign Key
     * =========================
     */

    await queryRunner.query(`
      ALTER TABLE "permissions"
      ADD CONSTRAINT "FK_36d7b8e1a331102ec9161e879ce"
      FOREIGN KEY ("roleId")
      REFERENCES "roles"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "permissions"
      DROP CONSTRAINT IF EXISTS "FK_36d7b8e1a331102ec9161e879ce"
    `);

    await queryRunner.query(`
      ALTER TABLE "roles"
      DROP CONSTRAINT IF EXISTS "UQ_648e3f5447f725579d7d4ffdfb7"
    `);

    await queryRunner.query(`
      ALTER TABLE "permissions"
      DROP COLUMN IF EXISTS "roleId"
    `);

    await queryRunner.query(`
      ALTER TABLE "permissions"
      DROP COLUMN IF EXISTS "status"
    `);

    await queryRunner.query(`
      ALTER TABLE "roles"
      DROP COLUMN IF EXISTS "createdAt"
    `);

    await queryRunner.query(`
      ALTER TABLE "roles"
      DROP COLUMN IF EXISTS "updatedAt"
    `);
  }
}