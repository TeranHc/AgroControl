# -*- coding: utf-8 -*-
import re

# PESAJE
with open('c:/Users/teran/Documents/App/AgroControlApp/agro-control/app/(tabs)/pesajes.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = re.sub(
    r'const fetchPesajes = async \(\) => \{.*?\n\s+setRefreshing\(false\);\n\s+\};\n\s+\};',
    '''const fetchPesajes = async () => {
    try {
      if (!activeFinca) return;
      const db = await getDb();
      const data = await db.getAllAsync(
        SELECT 
          p.id, p.animal_id, p.peso_kg, p.fecha_pesaje, p.condicion_corporal, p.notas,
          a.nombre as animal_nombre, a.codigo_animal, a.finca_id, a.especie, a.fotografia_url
         FROM pesajes p
         INNER JOIN animales a ON p.animal_id = a.id
         WHERE p.finca_id = ? AND p.deleted_at IS NULL AND a.deleted_at IS NULL
         ORDER BY p.fecha_pesaje DESC,
        [activeFinca.id]
      );
      if (data) {
        const registros = data.map((r: any) => ({
          ...r,
          animales: {
            nombre: r.animal_nombre,
            codigo_animal: r.codigo_animal,
            finca_id: r.finca_id,
            especie: r.especie,
            fotografia_url: r.fotografia_url
          }
        }));
        setPesajes(registros as Pesaje[]);
      }
    } catch (error) {
      console.error('Error obteniendo pesajes:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };''', text, flags=re.DOTALL)

# Wait, if that regex failed before, I need to fix the regex!
# r'const fetchPesajes = async \(\) => \{.*?\n\s+setRefreshing\(false\);\n\s+\};\n\s+\};'
# Let's change it to match until the END of the function
