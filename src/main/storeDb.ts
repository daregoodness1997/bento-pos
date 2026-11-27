import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { app } from 'electron';

import { createSeedData, DATA_VERSION } from 'store/seed';
import type { BentoData } from 'types/store';

type CollectionKey = {
  [Key in keyof BentoData]: BentoData[Key] extends unknown[] ? Key : never;
}[keyof BentoData];

const COLLECTIONS: { key: CollectionKey; table: string }[] = [
  { key: 'users', table: 'users' },
  { key: 'customers', table: 'customers' },
  { key: 'vendors', table: 'vendors' },
  { key: 'deliveries', table: 'deliveries' },
  { key: 'vendorPayments', table: 'vendor_payments' },
  { key: 'inventory', table: 'inventory' },
  { key: 'menu', table: 'menu_items' },
  { key: 'sales', table: 'sales' },
  { key: 'debtPayments', table: 'debt_payments' },
  { key: 'expenses', table: 'expenses' },
  { key: 'losses', table: 'losses' },
  { key: 'stockCounts', table: 'stock_counts' },
  { key: 'dayCloses', table: 'day_closes' },
  { key: 'auditEvents', table: 'audit_events' },
];

let database: Database.Database | null = null;

const getDatabase = () => {
  if (database) {
    return database;
  }

  const userDataPath = app.getPath('userData');
  fs.mkdirSync(userDataPath, { recursive: true });

  const nextDatabase = new Database(
    path.join(userDataPath, 'bento-pos.sqlite'),
  );
  nextDatabase.pragma('journal_mode = WAL');
  nextDatabase.pragma('busy_timeout = 5000');
  nextDatabase.exec(`
    CREATE TABLE IF NOT EXISTS app_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      version INTEGER NOT NULL,
      settings TEXT NOT NULL,
      session_user_id TEXT,
      locked INTEGER NOT NULL
    );

    ${COLLECTIONS.map(
      ({ table }) =>
        `CREATE TABLE IF NOT EXISTS ${table} (
          id TEXT PRIMARY KEY,
          payload TEXT NOT NULL
        );`,
    ).join('\n')}

    CREATE TABLE IF NOT EXISTS preferences (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  database = nextDatabase;
  return database;
};

export const loadSnapshot = (): BentoData | null => {
  const db = getDatabase();
  const state = db
    .prepare(
      'SELECT version, settings, session_user_id AS sessionUserId, locked FROM app_state WHERE id = 1',
    )
    .get() as
    | {
        version: number;
        settings: string;
        sessionUserId: string | null;
        locked: number;
      }
    | undefined;

  if (!state || state.version !== DATA_VERSION) {
    return null;
  }

  const snapshot: Record<string, unknown> = {
    version: state.version,
    settings: JSON.parse(state.settings),
    sessionUserId: state.sessionUserId ?? null,
    locked: Boolean(state.locked),
  };

  COLLECTIONS.forEach(({ key, table }) => {
    const rows = db.prepare(`SELECT payload FROM ${table}`).all() as {
      payload: string;
    }[];
    snapshot[key] = rows.map((row) => JSON.parse(row.payload));
  });

  return snapshot as unknown as BentoData;
};

export const saveSnapshot = (snapshot: BentoData) => {
  const db = getDatabase();

  const replaceAll = db.transaction((data: BentoData) => {
    db.prepare(
      `INSERT INTO app_state (id, version, settings, session_user_id, locked)
       VALUES (1, @version, @settings, @sessionUserId, @locked)
       ON CONFLICT(id) DO UPDATE SET
         version = excluded.version,
         settings = excluded.settings,
         session_user_id = excluded.session_user_id,
         locked = excluded.locked`,
    ).run({
      version: data.version,
      settings: JSON.stringify(data.settings),
      sessionUserId: data.sessionUserId,
      locked: data.locked ? 1 : 0,
    });

    COLLECTIONS.forEach(({ key, table }) => {
      db.prepare(`DELETE FROM ${table}`).run();
      const insert = db.prepare(
        `INSERT INTO ${table} (id, payload) VALUES (@id, @payload)`,
      );
      const rows = data[key] as { id: string }[];

      rows.forEach((row) => {
        insert.run({ id: row.id, payload: JSON.stringify(row) });
      });
    });
  });

  replaceAll(snapshot);
};

export const getPreference = (key: string): string | null => {
  const row = getDatabase()
    .prepare('SELECT value FROM preferences WHERE key = ?')
    .get(key) as { value: string } | undefined;
  return row?.value ?? null;
};

export const setPreference = (key: string, value: string) => {
  getDatabase()
    .prepare(
      `INSERT INTO preferences (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    )
    .run(key, value);
};

export const removePreference = (key: string) => {
  getDatabase().prepare('DELETE FROM preferences WHERE key = ?').run(key);
};

export const closeDatabase = () => {
  if (database) {
    database.close();
    database = null;
  }
};

export const seedDatabase = () => saveSnapshot(createSeedData());
