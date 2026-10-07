import * as SQLite from 'expo-sqlite';

let dbInstance: SQLite.SQLiteDatabase | null = null;

/**
 * Abre o crea la base de datos local SQLite (Singleton para evitar NPE por concurrencia).
 */
export async function getDb() {
  if (!dbInstance) {
    dbInstance = await SQLite.openDatabaseAsync('agrocontrol.db');
  }
  return dbInstance;
}

/**
 * Inicializa todas las tablas locales. 
 * Estas tablas son una copia exacta de Supabase, pero con la columna especial `sync_status`.
 * Los valores de sync_status pueden ser:
 * - 'synced': El registro es idéntico a Supabase.
 * - 'created': Fue creado sin internet, necesita ser insertado (INSERT) en Supabase.
 * - 'updated': Fue editado sin internet, necesita ser actualizado (UPDATE) en Supabase.
 */
export async function initDatabase() {
  const db = await getDb();
  
  // Tabla para guardar la última vez que sincronizamos (Sincronización Delta)
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS sync_metadata (
      finca_id TEXT PRIMARY KEY,
      last_sync_at TEXT
    );
  `);

  // ==========================================
  // TABLAS OPERATIVAS CON SYNC_STATUS
  // ==========================================

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS fincas (
      id TEXT PRIMARY KEY,
      nombre TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      sync_status TEXT DEFAULT 'synced'
    );
    
    CREATE TABLE IF NOT EXISTS miembros_finca (
      id TEXT PRIMARY KEY,
      finca_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      nombre_completo TEXT NOT NULL,
      telefono TEXT,
      nacionalidad TEXT,
      rol TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      sync_status TEXT DEFAULT 'synced'
    );
    
    CREATE TABLE IF NOT EXISTS animales (
      id TEXT PRIMARY KEY,
      finca_id TEXT NOT NULL,
      registrado_por TEXT,
      codigo_animal TEXT NOT NULL,
      nombre TEXT,
      especie TEXT NOT NULL,
      raza TEXT,
      genero TEXT,
      fecha_nacimiento TEXT,
      proposito TEXT,
      estado TEXT DEFAULT 'Activo',
      madre_id TEXT,
      padre_id TEXT,
      fotografia_url TEXT,
      notas TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      sync_status TEXT DEFAULT 'synced'
    );
    
    CREATE TABLE IF NOT EXISTS pesajes (
      id TEXT PRIMARY KEY,
      finca_id TEXT NOT NULL,
      animal_id TEXT NOT NULL,
      registrado_por TEXT,
      peso_kg REAL NOT NULL,
      fecha_pesaje TEXT NOT NULL,
      condicion_corporal INTEGER,
      notas TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      sync_status TEXT DEFAULT 'synced'
    );

    CREATE TABLE IF NOT EXISTS registros_salud (
      id TEXT PRIMARY KEY,
      finca_id TEXT NOT NULL,
      animal_id TEXT NOT NULL,
      registrado_por TEXT,
      tipo_evento TEXT NOT NULL,
      nombre_medicamento TEXT,
      dosis TEXT,
      fecha_aplicacion TEXT NOT NULL,
      proxima_dosis TEXT,
      veterinario_encargado TEXT,
      costo REAL,
      notas TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      sync_status TEXT DEFAULT 'synced'
    );

    CREATE TABLE IF NOT EXISTS reproduccion (
      id TEXT PRIMARY KEY,
      finca_id TEXT NOT NULL,
      animal_id TEXT NOT NULL,
      registrado_por TEXT,
      tipo_evento TEXT NOT NULL,
      fecha_evento TEXT NOT NULL,
      macho_id TEXT,
      estado_gestacion TEXT,
      fecha_probable_parto TEXT,
      crias_nacidas INTEGER DEFAULT 0,
      notas TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      sync_status TEXT DEFAULT 'synced'
    );
  `);
}

/**
 * Borra toda la base de datos local (útil para cuando se cierra sesión).
 */
export async function clearDatabase() {
  const db = await getDb();
  await db.execAsync(`
    DELETE FROM reproduccion;
    DELETE FROM registros_salud;
    DELETE FROM pesajes;
    DELETE FROM animales;
    DELETE FROM miembros_finca;
    DELETE FROM fincas;
    DELETE FROM sync_metadata;
  `);
}
