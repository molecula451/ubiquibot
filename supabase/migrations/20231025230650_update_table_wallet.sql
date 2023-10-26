alter table "public"."wallets" drop constraint "wallets_pkey";

drop index if exists "public"."wallets_pkey";

alter table "public"."wallets" add column "id" integer not null;

CREATE UNIQUE INDEX wallets_pkey ON public.wallets USING btree (id);

alter table "public"."wallets" add constraint "wallets_pkey" PRIMARY KEY using index "wallets_pkey";


