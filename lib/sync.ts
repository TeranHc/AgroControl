import { supabase } from './supabase';
import { getDb } from './database';
import * as Network from 'expo-network';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';

export async function hasInternet() {
  const networkState = await Network.getNetworkStateAsync();
  return networkState.isConnected && networkState.isInternetReachable;
}

/**
 * Motor principal de sincronización.
 */
export async function syncFincaData(fincaId: string) {
  if (!fincaId) return;
  const isOnline = await hasInternet();
  if (!isOnline) {
    console.log('No hay internet. Sincronización omitida.');
    return;
  }

  console.log(`Iniciando sincronización para la finca: ${fincaId}...`);
  try {
    await pushPendingChanges(fincaId);
    await pullLatestChanges(fincaId);
    console.log('Sincronización completada exitosamente.');
  } catch (error) {
    console.error('Error durante la sincronización:', error);
  }
}

/**
 * 1. PULL: Descarga datos desde Supabase a SQLite
 */
async function pullLatestChanges(fincaId: string) {
  const db = await getDb();
  
  // Obtener la fecha de última sincronización
  const meta = await db.getFirstAsync<{ last_sync_at: string }>(
    `SELECT last_sync_at FROM sync_metadata WHERE finca_id = ?`,
    fincaId
  );
  const lastSyncAt = meta?.last_sync_at || '1970-01-01T00:00:00.000Z';
  
  const tablasOperativas = ['animales', 'pesajes', 'registros_salud', 'reproduccion'];

  // Sincronizar Finca
  const { data: fincaData } = await supabase
    .from('fincas')
    .select('*')
    .eq('id', fincaId)
    .gt('updated_at', lastSyncAt);
    
  if (fincaData && fincaData.length > 0) {
    for (const f of fincaData) {
      await db.runAsync(
        `INSERT OR REPLACE INTO fincas (id, nombre, created_at, updated_at, sync_status) VALUES (?, ?, ?, ?, 'synced')`,
        f.id, f.nombre, f.created_at, f.updated_at
      );
    }
  }

  // Sincronizar Miembros
  const { data: miembrosData } = await supabase
    .from('miembros_finca')
    .select('*')
    .eq('finca_id', fincaId)
    .gt('updated_at', lastSyncAt);
    
  if (miembrosData && miembrosData.length > 0) {
    for (const m of miembrosData) {
      await db.runAsync(
        `INSERT OR REPLACE INTO miembros_finca (id, finca_id, user_id, nombre_completo, telefono, nacionalidad, rol, created_at, updated_at, sync_status) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')`,
        m.id, m.finca_id, m.user_id, m.nombre_completo, m.telefono, m.nacionalidad, m.rol, m.created_at, m.updated_at
      );
    }
  }

  // Sincronizar Operativas
  for (const tabla of tablasOperativas) {
    const { data } = await supabase
      .from(tabla)
      .select('*')
      .eq('finca_id', fincaId)
      .gt('updated_at', lastSyncAt);

    if (data && data.length > 0) {
      for (const row of data) {
        if (tabla === 'animales') {
          await db.runAsync(
            `INSERT OR REPLACE INTO animales (id, finca_id, registrado_por, codigo_animal, nombre, especie, raza, genero, fecha_nacimiento, proposito, estado, madre_id, padre_id, fotografia_url, notas, created_at, updated_at, deleted_at, sync_status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')`,
            row.id ?? null, row.finca_id ?? null, row.registrado_por ?? null, row.codigo_animal ?? null, row.nombre ?? null, row.especie ?? null, row.raza ?? null, row.genero ?? null, row.fecha_nacimiento ?? null, row.proposito ?? null, row.estado ?? null, row.madre_id ?? null, row.padre_id ?? null, row.fotografia_url ?? null, row.notas ?? null, row.created_at ?? null, row.updated_at ?? null, row.deleted_at ?? null
          );
        } else if (tabla === 'pesajes') {
          await db.runAsync(
            `INSERT OR REPLACE INTO pesajes (id, finca_id, animal_id, registrado_por, peso_kg, fecha_pesaje, condicion_corporal, notas, created_at, updated_at, deleted_at, sync_status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')`,
            row.id ?? null, row.finca_id ?? null, row.animal_id ?? null, row.registrado_por ?? null, row.peso_kg ?? null, row.fecha_pesaje ?? null, row.condicion_corporal ?? null, row.notas ?? null, row.created_at ?? null, row.updated_at ?? null, row.deleted_at ?? null
          );
        } else if (tabla === 'registros_salud') {
          await db.runAsync(
            `INSERT OR REPLACE INTO registros_salud (id, finca_id, animal_id, registrado_por, tipo_evento, nombre_medicamento, dosis, fecha_aplicacion, proxima_dosis, veterinario_encargado, costo, notas, created_at, updated_at, deleted_at, sync_status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')`,
            row.id ?? null, row.finca_id ?? null, row.animal_id ?? null, row.registrado_por ?? null, row.tipo_evento ?? null, row.nombre_medicamento ?? null, row.dosis ?? null, row.fecha_aplicacion ?? null, row.proxima_dosis ?? null, row.veterinario_encargado ?? null, row.costo ?? null, row.notas ?? null, row.created_at ?? null, row.updated_at ?? null, row.deleted_at ?? null
          );
        } else if (tabla === 'reproduccion') {
          await db.runAsync(
            `INSERT OR REPLACE INTO reproduccion (id, finca_id, animal_id, registrado_por, tipo_evento, fecha_evento, macho_id, estado_gestacion, fecha_probable_parto, crias_nacidas, notas, created_at, updated_at, deleted_at, sync_status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')`,
            row.id ?? null, row.finca_id ?? null, row.animal_id ?? null, row.registrado_por ?? null, row.tipo_evento ?? null, row.fecha_evento ?? null, row.macho_id ?? null, row.estado_gestacion ?? null, row.fecha_probable_parto ?? null, row.crias_nacidas ?? null, row.notas ?? null, row.created_at ?? null, row.updated_at ?? null, row.deleted_at ?? null
          );
        }
      }
    }
  }

  // Actualizar la fecha de última sincronización a NOW()
  const newLastSync = new Date().toISOString();
  await db.runAsync(
    `INSERT OR REPLACE INTO sync_metadata (finca_id, last_sync_at) VALUES (?, ?)`,
    fincaId, newLastSync
  );
}

/**
 * 2. PUSH: Sube cambios locales (creados o actualizados offline) a Supabase
 */
async function pushPendingChanges(fincaId: string) {
  const db = await getDb();
  
  const tablasOperativas = ['animales', 'pesajes', 'registros_salud', 'reproduccion'];

  for (const tabla of tablasOperativas) {
    // Buscar registros locales pendientes
    const pendientes = await db.getAllAsync<any>(
      `SELECT * FROM ${tabla} WHERE finca_id = ? AND sync_status IN ('created', 'updated')`,
      fincaId
    );

    for (const row of pendientes) {
      // Remover sync_status antes de mandar a Supabase (porque Supabase no tiene esa columna)
      const { sync_status, ...dataToUpload } = row;

      // Si hay una URL local de foto (guardada offline), la subimos antes de sincronizar el registro
      if (dataToUpload.fotografia_url && dataToUpload.fotografia_url.startsWith('file://')) {
        try {
          const base64 = await FileSystem.readAsStringAsync(dataToUpload.fotografia_url, { encoding: 'base64' });
          const fileName = `${dataToUpload.codigo_animal || 'animal'}_${new Date().getTime()}.jpg`;
          const filePath = `animales/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('fotografias_animales')
            .upload(filePath, decode(base64), { contentType: 'image/jpeg' });

          if (!uploadError) {
            const { data: publicUrlData } = supabase.storage
              .from('fotografias_animales')
              .getPublicUrl(filePath);
            
            dataToUpload.fotografia_url = publicUrlData.publicUrl;
            
            // Actualizar SQLite para que apunte a la pública
            await db.runAsync(`UPDATE animales SET fotografia_url = ? WHERE id = ?`, publicUrlData.publicUrl, row.id);
          }
        } catch (e) {
          console.error('Error subiendo foto pendiente:', e);
          // Si falla, podemos continuar y enviarla con file:// (Supabase guardará la cadena 'file://', 
          // lo cual no es ideal, o podríamos omitirla, pero lo dejaremos así por ahora).
        }
      }
      
      const { error } = await supabase.from(tabla).upsert(dataToUpload);
      
      if (!error) {
        // Si subió con éxito, marcamos en SQLite como 'synced'
        await db.runAsync(`UPDATE ${tabla} SET sync_status = 'synced' WHERE id = ?`, row.id);
      } else {
        console.error(`Error subiendo pendiente en tabla ${tabla}:`, error);
      }
    }
  }
}
