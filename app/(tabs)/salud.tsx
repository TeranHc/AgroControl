import React, { useEffect, useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  FlatList, 
  ActivityIndicator,
  RefreshControl,
  TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

// Tipo de dato combinando registros_salud con datos de animales
type RegistroSalud = {
  id: string;
  tipo_evento: string;
  nombre_medicamento: string;
  dosis: string;
  fecha_aplicacion: string;
  proxima_dosis: string | null;
  animales: {
    nombre: string;
    codigo_animal: string;
  } | null;
};

export default function SaludScreen() {
  const [registros, setRegistros] = useState<RegistroSalud[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Estadísticas calculadas
  const [stats, setStats] = useState({
    eventosMes: 0,
    proximasDosis: 0,
    dosisVencidas: 0,
    tratamientosActivos: 0
  });

  const fetchRegistros = async () => {
    try {
      const { data, error } = await supabase
        .from('registros_salud')
        .select(`
          id,
          tipo_evento,
          nombre_medicamento,
          dosis,
          fecha_aplicacion,
          proxima_dosis,
          animales ( nombre, codigo_animal )
        `)
        .order('fecha_aplicacion', { ascending: false });

      if (error) throw error;

      if (data) {
        // @ts-ignore
        const records: RegistroSalud[] = data;
        setRegistros(records);
        calcularEstadisticas(records);
      }
    } catch (error) {
      console.error('Error obteniendo registros de salud:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const calcularEstadisticas = (records: RegistroSalud[]) => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0); // Normalizar a medianoche para comparar fechas

    let eventosMes = 0;
    let proximasDosis = 0;
    let dosisVencidas = 0;
    let tratamientosActivos = 0;

    records.forEach(r => {
      const fechaApp = new Date(r.fecha_aplicacion);
      
      // Eventos este mes
      if (fechaApp.getMonth() === hoy.getMonth() && fechaApp.getFullYear() === hoy.getFullYear()) {
        eventosMes++;
      }

      // Tratamientos activos (Ejemplo: marcados como Tratamiento)
      if (r.tipo_evento.toLowerCase() === 'tratamiento') {
        tratamientosActivos++;
      }

      // Lógica de próximas dosis y vencidas
      if (r.proxima_dosis) {
        const proxima = new Date(r.proxima_dosis);
        const diffTime = proxima.getTime() - hoy.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
          dosisVencidas++;
        } else if (diffDays >= 0 && diffDays <= 7) {
          proximasDosis++;
        }
      }
    });

    setStats({ eventosMes, proximasDosis, dosisVencidas, tratamientosActivos });
  };

  useEffect(() => {
    fetchRegistros();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRegistros();
  };

  // Filtrado por buscador
  const registrosFiltrados = registros.filter(r => {
    const term = searchQuery.toLowerCase();
    const animalNombre = r.animales?.nombre?.toLowerCase() || '';
    const animalCod = r.animales?.codigo_animal?.toLowerCase() || '';
    const medicina = r.nombre_medicamento?.toLowerCase() || '';
    
    return animalNombre.includes(term) || animalCod.includes(term) || medicina.includes(term);
  });

  // Renderizado de cada tarjeta de la lista
  const renderItem = ({ item }: { item: RegistroSalud }) => {
    const inicial = item.animales?.nombre ? item.animales.nombre.charAt(0).toUpperCase() : 'A';
    
    return (
      <View style={styles.cardList}>
        <View style={styles.cardListHeader}>
          <View style={styles.cardListProfile}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{inicial}</Text>
            </View>
            <View>
              <Text style={styles.animalName}>{item.animales?.nombre || 'Desconocido'}</Text>
              <Text style={styles.animalMeta}>{item.animales?.codigo_animal} • {item.tipo_evento}</Text>
            </View>
          </View>
          <View style={styles.dateBadge}>
            <Text style={styles.dateBadgeText}>{item.fecha_aplicacion}</Text>
          </View>
        </View>

        <View style={styles.cardListBody}>
          <View style={styles.dataCol}>
            <Text style={styles.dataLabel}>MEDICAMENTO / VACUNA</Text>
            <Text style={styles.dataValue}>{item.nombre_medicamento || 'No especificado'}</Text>
            {item.dosis && <Text style={styles.dataSubValue}>Dosis: {item.dosis}</Text>}
          </View>
          
          {item.proxima_dosis && (
            <View style={styles.dataColRight}>
              <Text style={styles.dataLabel}>PRÓXIMA DOSIS</Text>
              <View style={styles.nextDoseContainer}>
                <MaterialIcons name="event" size={14} color="#3b6934" />
                <Text style={styles.nextDoseText}>{item.proxima_dosis}</Text>
              </View>
            </View>
          )}
        </View>
      </View>
    );
  };

  // Cabecera principal (Estadísticas y Filtros del diseño HTML)
  const renderHeader = () => (
    <View style={styles.headerContent}>
      {/* Títulos y Botones Superiores */}
      <View style={styles.topRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.pageTitle}>Salud</Text>
          <Text style={styles.pageSubtitle}>Gestiona el historial sanitario y tratamientos.</Text>
        </View>
        <View style={styles.headerActionRow}>
          <TouchableOpacity style={styles.btnSecondary}>
            <MaterialIcons name="calendar-month" size={18} color="#1a1c19" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnPrimary}>
            <MaterialIcons name="add" size={20} color="#fff" />
            <Text style={styles.btnPrimaryText}>REGISTRAR</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Grid de Estadísticas Bento */}
      <View style={styles.statsGrid}>
        <View style={[styles.statBox, { borderLeftColor: '#154212' }]}>
          <View style={styles.statHeader}>
            <Text style={styles.statBoxLabel}>EVENTOS MES</Text>
            <MaterialIcons name="event-note" size={18} color="#154212" />
          </View>
          <Text style={styles.statBoxValue}>{stats.eventosMes}</Text>
        </View>

        <View style={[styles.statBox, { borderLeftColor: '#3b6934' }]}>
          <View style={styles.statHeader}>
            <Text style={styles.statBoxLabel}>PRÓX. DOSIS</Text>
            <MaterialIcons name="vaccines" size={18} color="#3b6934" />
          </View>
          <Text style={styles.statBoxValue}>{stats.proximasDosis}</Text>
          <Text style={styles.statBoxSub}>Próx. 7 días</Text>
        </View>

        <View style={[styles.statBox, { borderLeftColor: '#ba1a1a', backgroundColor: '#ffdad6' }]}>
          <View style={styles.statHeader}>
            <Text style={[styles.statBoxLabel, { color: '#93000a' }]}>VENCIDAS</Text>
            <MaterialIcons name="warning" size={18} color="#ba1a1a" />
          </View>
          <Text style={[styles.statBoxValue, { color: '#93000a' }]}>{stats.dosisVencidas}</Text>
          <Text style={[styles.statBoxSub, { color: '#ba1a1a', fontWeight: '600' }]}>Atención requerida</Text>
        </View>

        <View style={[styles.statBox, { borderLeftColor: '#2d5a27' }]}>
          <View style={styles.statHeader}>
            <Text style={styles.statBoxLabel}>TRATAMIENTOS</Text>
            <MaterialIcons name="healing" size={18} color="#2d5a27" />
          </View>
          <Text style={styles.statBoxValue}>{stats.tratamientosActivos}</Text>
          <Text style={styles.statBoxSub}>Activos</Text>
        </View>
      </View>

      {/* Buscador */}
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={20} color="#5b5f5c" />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar animal o medicamento..."
          placeholderTextColor="#5b5f5c"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#154212" />
        </View>
      ) : (
        <FlatList
          data={registrosFiltrados}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#154212" />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialIcons name="medical-services" size={48} color="#c2c9bb" />
              <Text style={styles.emptyText}>No hay registros de salud.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f4ee',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingBottom: 20,
  },
  headerContent: {
    padding: 20,
    paddingBottom: 10,
  },
  topRow: {
    flexDirection: 'column',
    gap: 16,
    marginBottom: 20,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1c19',
  },
  pageSubtitle: {
    fontSize: 14,
    color: '#42493e',
    marginTop: 4,
  },
  headerActionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  btnSecondary: {
    backgroundColor: '#e8e8e3',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c2c9bb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnPrimary: {
    flex: 1,
    backgroundColor: '#154212',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  btnPrimaryText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statBox: {
    width: '48%',
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: 12,
    borderLeftWidth: 4,
    marginBottom: 16,
    shadowColor: '#2d5a27',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statBoxLabel: {
    fontSize: 10,
    color: '#42493e',
    fontWeight: 'bold',
  },
  statBoxValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1c19',
  },
  statBoxSub: {
    fontSize: 11,
    color: '#5b5f5c',
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8e8e3',
    paddingHorizontal: 12,
    height: 46,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c2c9bb',
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1a1c19',
    marginLeft: 8,
  },
  cardList: {
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e3e3de',
    shadowColor: '#2d5a27',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  cardListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  cardListProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e8e8e3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#154212',
    fontWeight: 'bold',
    fontSize: 16,
  },
  animalName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1c19',
  },
  animalMeta: {
    fontSize: 12,
    color: '#5b5f5c',
    marginTop: 2,
  },
  dateBadge: {
    backgroundColor: '#f4f4ee',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  dateBadgeText: {
    color: '#42493e',
    fontSize: 11,
    fontWeight: '600',
  },
  cardListBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#f4f4ee',
    paddingTop: 12,
  },
  dataCol: {
    flex: 1,
  },
  dataColRight: {
    alignItems: 'flex-end',
  },
  dataLabel: {
    fontSize: 10,
    color: '#5b5f5c',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  dataValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1a1c19',
  },
  dataSubValue: {
    fontSize: 12,
    color: '#5b5f5c',
    marginTop: 2,
  },
  nextDoseContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  nextDoseText: {
    color: '#2e7d32',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: '#5b5f5c',
  }
});