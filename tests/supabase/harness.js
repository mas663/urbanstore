// Menjalankan skema Supabase di Postgres lokal (PGlite / WebAssembly) untuk pengujian.
// Stub meniru bagian Supabase yang dipakai skema: role anon/authenticated, auth.users, auth.uid(), storage.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const SUPABASE_STUBS = `
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}');
create function auth.uid() returns uuid language sql stable
  as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create schema storage;
create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
create function storage.foldername(name text) returns text[] language sql immutable
  as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
alter table storage.objects enable row level security;
grant usage on schema auth, storage to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
grant select, insert, update, delete on storage.objects to anon, authenticated;
`;

export async function createDb() {
  const db = new PGlite();
  await db.exec(SUPABASE_STUBS);
  await db.exec(fs.readFileSync(path.join(root, 'supabase/migrations/001_schema.sql'), 'utf8'));
  await db.exec(fs.readFileSync(path.join(root, 'supabase/seed.sql'), 'utf8'));
  // Migrasi lanjutan dijalankan berurutan, sama seperti di SQL Editor Supabase
  await db.exec(fs.readFileSync(path.join(root, 'supabase/migrations/002_engagement.sql'), 'utf8'));
  await db.exec(fs.readFileSync(path.join(root, 'supabase/migrations/003_mayar.sql'), 'utf8'));
  return db;
}

/** Buat user Supabase Auth (trigger otomatis membuat profil customer). */
export async function createUser(db, email, { admin = false } = {}) {
  const { rows } = await db.query(
    `insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id`,
    [email, JSON.stringify({ full_name: email.split('@')[0] })],
  );
  if (admin) await db.query(`update public.profiles set role = 'admin' where id = $1`, [rows[0].id]);
  return rows[0].id;
}

/**
 * Jalankan query sebagai role tertentu, seperti request dari supabase-js.
 * uid = null → anon. Superuser (postgres) mem-bypass RLS, jadi wajib SET ROLE.
 */
export function as(db, uid) {
  return async (sql, params = []) => {
    await db.exec(`set role ${uid ? 'authenticated' : 'anon'}`);
    await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [uid || '']);
    try {
      return await db.query(sql, params);
    } finally {
      await db.exec('reset role');
      await db.query(`select set_config('request.jwt.claim.sub', '', false)`);
    }
  };
}
