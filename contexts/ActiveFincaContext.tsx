import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

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

  const cargarFincas = async () => {
    setLoadingFincas(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setFincas([]);
        setActiveFinca(null);
        return;
      }

      const { data, error } = await supabase
        .from('miembros_finca')
        .select(`
          id,
          rol,
          finca_id,
          fincas ( id, nombre )
        `)
        .eq('user_id', user.id);

      if (error) throw error;

      if (data && data.length > 0) {
        const listaFincas: FincaInfo[] = data.map((item: any) => ({
          id: item.fincas.id,
          nombre: item.fincas.nombre,
          rol: item.rol,
          membresia_id: item.id,
        }));

        setFincas(listaFincas);

        // Mantener la finca activa actual si sigue existiendo en la lista
        if (activeFinca) {
          const existe = listaFincas.find((f) => f.id === activeFinca.id);
          if (existe) {
            setActiveFinca(existe);
          } else {
            setActiveFinca(listaFincas[0]);
          }
        } else {
          setActiveFinca(listaFincas[0]);
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
      } else if (event === 'SIGNED_OUT') {
        setFincas([]);
        setActiveFinca(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const cambiarFinca = (id: string) => {
    const finca = fincas.find((f) => f.id === id);
    if (finca) {
      setActiveFinca(finca);
    }
  };

  const recargarFincas = async () => {
    await cargarFincas();
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
