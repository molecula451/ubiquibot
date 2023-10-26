alter table "public"."issues" drop constraint "issues_pkey";

drop index if exists "public"."issues_pkey";

drop table "public"."issues";

drop sequence if exists "public"."issues_id_seq";


