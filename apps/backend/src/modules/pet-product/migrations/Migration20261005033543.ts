import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261005033543 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "pet_product_species" drop constraint if exists "pet_product_species_code_unique";`);
    this.addSql(`create table if not exists "pet_product_profile" ("id" text not null, "life_stage" text check ("life_stage" in ('puppy', 'adult', 'senior', 'all')) not null default 'all', "pet_size" text check ("pet_size" in ('small', 'medium', 'large', 'all')) not null default 'all', "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "pet_product_profile_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pet_product_profile_deleted_at" ON "pet_product_profile" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "pet_product_species" ("id" text not null, "code" text not null, "name" text not null, "is_active" boolean not null default true, "sort_order" integer not null default 0, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "pet_product_species_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pet_product_species_deleted_at" ON "pet_product_species" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_pet_product_species_code_unique" ON "pet_product_species" ("code") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "pet_product_profile_species" ("profile_id" text not null, "species_id" text not null, constraint "pet_product_profile_species_pkey" primary key ("profile_id", "species_id"));`);

    this.addSql(`alter table if exists "pet_product_profile_species" add constraint "pet_product_profile_species_profile_id_foreign" foreign key ("profile_id") references "pet_product_profile" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table if exists "pet_product_profile_species" add constraint "pet_product_profile_species_species_id_foreign" foreign key ("species_id") references "pet_product_species" ("id") on update cascade on delete cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "pet_product_profile_species" drop constraint if exists "pet_product_profile_species_profile_id_foreign";`);

    this.addSql(`alter table if exists "pet_product_profile_species" drop constraint if exists "pet_product_profile_species_species_id_foreign";`);

    this.addSql(`drop table if exists "pet_product_profile" cascade;`);

    this.addSql(`drop table if exists "pet_product_species" cascade;`);

    this.addSql(`drop table if exists "pet_product_profile_species" cascade;`);
  }

}
