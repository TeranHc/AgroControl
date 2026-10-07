import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppState } from 'react-native';
import { supabase } from '../lib/supabase';
import { syncFincaData } from '../lib/sync';
import { getDb } from '../lib/database';

type FincaInfo = {
  id: string;
  nombre: string;
  rol: 'Admin' | 'Worker' | 'Viewer';
  membresia_id: string; // ID en miembros_finca
};

type ActiveFincaContextType = {
  activeFinca: FincaInfo | null;
  fincas: FincaInfo[];
  loadingFincas: boolean;
  cambiarFinca: (id: string) => void;
  recargarFincas: () => Promise<void>;
};

const ActiveFincaContext = createContext<ActiveFincaContextType | undefined>(undefined);

export function ActiveFincaProvider({ children }: { children: React.ReactNode }) {
  const [activeFinca, setActiveFinca] = useState<FincaInfo | null>(null);
  const [fincas, setFincas] = useState<FincaInfo[]>([]);
  const [loadingFincas, setLoadingFincas] = useState(true);

  const cargarFincas = async (forceFetch = false) => {
    setLoadingFincas(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      
      if (!user) {
        setFincas([]);
        setActiveFinca(null);
        return;
      }

      const db = await getDb();
      
      // 1. Intentar leer de SQLite local primero
      const localData = await db.getAllAsync<any>(
        `SELECT m.finca_id as id, f.nombre, m.rol, m.id as membresia_id 
         FROM miembros_finca m 
         JOIN fincas f ON m.finca_id = f.id 
         WHERE m.user_id = ?`,
        user.id
      );

      let listaFincas: FincaInfo[] = [];

      if (localData && localData.length > 0 && !forceFetch) {
        listaFincas = localData;
      } else {
        // 2. Si no hay nada local, es el primer login o no tiene fincas. Descargamos de Supabase (requiere internet).
        try {
          const { data, error } = await supabase
            .from('miembros_finca')
            .select('id, rol, finca_id, fincas ( id, nombre )')
            .eq('user_id', user.id);

          if (error) throw error;
          
          if (data && data.length > 0) {
            // Guardar en SQLite local para la próxima vez
            for (const d of data) {
              const f = Array.isArray(d.fincas) ? d.fincas[0] : d.fincas;
              if (!f || !f.id) continue;
              
              // Guardar finca
              await db.runAsync(
                `INSERT OR IGNORE INTO fincas (id, nombre, created_at, updated_at, sync_status) VALUES (?, ?, ?, ?, 'synced')`,
                f.id ?? null, f.nombre ?? null, new Date().toISOString(), new Date().toISOString()
              );
              // Guardar miembro
              await db.runAsync(
                `INSERT OR IGNORE INTO miembros_finca (id, finca_id, user_id, nombre_completo, rol, created_at, updated_at, sync_status) VALUES (?, ?, ?, ?, ?, ?, ?, 'synced')`,
                d.id ?? null, d.finca_id ?? null, user.id, 'Cargado', d.rol ?? null, new Date().toISOString(), new Date().toISOString()
              );
              
              listaFincas.push({
                id: f.id,
                nombre: f.nombre,
                rol: d.rol,
                membresia_id: d.id
              });
            }
          }
        } catch (e) {
          console.error("No hay internet para la primera carga o falló Supabase:", e);
        }
      }

      if (listaFincas.length > 0) {
        setFincas(listaFincas);

        // Mantener la finca activa actual si sigue existiendo en la lista
        if (activeFinca) {
          const existe = listaFincas.find((f) => f.id === activeFinca.id);
          if (existe) {
            setActiveFinca(existe);
            syncFincaData(existe.id).catch(console.error);
          } else {
            setActiveFinca(listaFincas[0]);
            syncFincaData(listaFincas[0].id).catch(console.error);
          }
        } else {
          setActiveFinca(listaFincas[0]);
          syncFincaData(listaFincas[0].id).catch(console.error);
        }
      } else {
        setFincas([]);
        setActiveFinca(null);
      }
    } catch (err) {
      console.error('Error cargando fincas del usuario:', err);
    } finally {
      setLoadingFincas(false);
    }
  };


  useEffect(() => {
    cargarFincas();

    // Escuchar auth state para limpiar o recargar si cambia el usuario
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        cargarFincas();
      }
    });

    // Auto-sincronizar cuando la app vuelve a primer plano (foreground)
    const appStateSub = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        // Obtenemos la finca activa del estado actual mediante un callback
        setActiveFinca((currentActiveFinca) => {
          if (currentActiveFinca) {
            syncFincaData(currentActiveFinca.id).catch(console.error);
          }
          return currentActiveFinca;
        });
      }
    });

    return () => {
      subscription.unsubscribe();
      appStateSub.remove();
    };
  }, []);

  const cambiarFinca = (id: string) => {
    const finca = fincas.find((f) => f.id === id);
    if (finca) {
      setActiveFinca(finca);
      syncFincaData(finca.id).catch(console.error);
    }
  };

  const recargarFincas = async () => {
    await cargarFincas(true);
  };

  return (
    <ActiveFincaContext.Provider value={{ activeFinca, fincas, loadingFincas, cambiarFinca, recargarFincas }}>
      {children}
    </ActiveFincaContext.Provider>
  );
}

export function useActiveFinca() {
  const context = useContext(ActiveFincaContext);
  if (context === undefined) {
    throw new Error('useActiveFinca must be used within an ActiveFincaProvider');
  }
  return context;
}
