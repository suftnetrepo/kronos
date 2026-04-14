import { drizzle }     from 'drizzle-orm/expo-sqlite'
import * as SQLite     from 'expo-sqlite'
import * as schema     from './schema'
import { SQL_MIGRATIONS } from './migrations'

const sqlite = SQLite.openDatabaseSync('kronos.db')

// Enable cascade deletes
sqlite.execSync('PRAGMA foreign_keys = ON;')

export const db = drizzle(sqlite, { schema })

export const runMigrations = async (): Promise<void> => {
  try {
    await sqlite.execAsync(`
      CREATE TABLE IF NOT EXISTS __kronos_migrations (
        id     INTEGER PRIMARY KEY AUTOINCREMENT,
        name   TEXT NOT NULL UNIQUE,
        ran_at INTEGER NOT NULL
      );
    `)
    for (let i = 0; i < SQL_MIGRATIONS.length; i++) {
      const name = `migration_${String(i + 1).padStart(4, '0')}`
      const row  = await sqlite.getFirstAsync(
        'SELECT id FROM __kronos_migrations WHERE name = ?', [name]
      )
      if (!row) {
        await sqlite.execAsync(SQL_MIGRATIONS[i])
        await sqlite.runAsync(
          'INSERT INTO __kronos_migrations (name, ran_at) VALUES (?, ?)',
          [name, Date.now()]
        )
      }
    }
  } catch (err) {
    console.error('[Kronos DB] Migration error:', err)
    throw err
  }
}

export { schema }
