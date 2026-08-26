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
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

// Definimos la estructura de datos uniendo Pesajes y Animales
type Pesaje = {
  id: string;
  peso_kg: number;
  fecha_pesaje: string;
  condicion_corporal: number;
  animales: {
    nombre: string;
    codigo_animal: string;
  } | null;
};

export default function PesajesScreen() {
  const [pesajes, setPesajes] = useState<Pesaje[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Estadísticas calculadas localmente
  const [stats, setStats] = useState({
    recientes: 0,
    esteMes: 0,
    promedio: 0,
    ultimoDias: 'Sin datos'
  });

  const fetchPesajes = async () => {
    try {
      // Obtenemos los pesajes y hacemos JOIN con la tabla animales
      const { data, error } = await supabase
        .from('pesajes')
        .select(`
          id,
          peso_kg,
          fecha_pesaje,
          condicion_corporal,
          animales ( nombre, codigo_animal )
        `)
        .order('fecha_pesaje', { ascending: false });

      if (error) throw error;

      if (data) {
        // @ts-ignore (Supabase a veces confunde los tipos en los joins)
        const registros: Pesaje[] = data;
        setPesajes(registros);
        calcularEstadisticas(registros);
      }
    } catch (error) {
      console.error('Error obteniendo pesajes:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const calcularEstadisticas = (registros: Pesaje[]) => {
    if (registros.length === 0) return;

    const hoy = new Date();
    const hace7Dias = new Date();
    hace7Dias.setDate(hoy.getDate() - 7);
    
    let sumaPesos = 0;
    let recientes = 0;
    let esteMes = 0;

    registros.forEach(p => {
      const fecha = new Date(p.fecha_pesaje);
      sumaPesos += Number(p.peso_kg);
      
      if (fecha >= hace7Dias) recientes++;
      if (fecha.getMonth() === hoy.getMonth() && fecha.getFullYear() === hoy.getFullYear()) esteMes++;
    });

    // Calcular días desde el último pesaje
    const ultimaFecha = new Date(registros[0].fecha_pesaje);
    const diffTime = Math.abs(hoy.getTime() - ultimaFecha.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    setStats({
      recientes,
      esteMes,
      promedio: Math.round(sumaPesos / registros.length),
      ultimoDias: diffDays === 0 ? 'Hoy' : `Hace ${diffDays} días`
    });
  };

  useEffect(() => {
    fetchPesajes();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPesajes();
  };

  // Filtro de búsqueda
  const pesajesFiltrados = pesajes.filter(p => {
    if (!p.animales) return false;
    const busqueda = searchQuery.toLowerCase();
    return (
      (p.animales.nombre && p.animales.nombre.toLowerCase().includes(busqueda)) ||
      (p.animales.codigo_animal && p.animales.codigo_animal.toLowerCase().includes(busqueda))
    );
  });

  // Renderiza cada tarjeta de pesaje en la lista
  const renderItem = ({ item }: { item: Pesaje }) => {
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
              <Text style={styles.animalMeta}>{item.animales?.codigo_animal} • {item.fecha_pesaje}</Text>
            </View>
          </View>
          {/* Badge simulado de cambio de peso */}
          <View style={styles.badgeSuccess}>
            <Text style={styles.badgeSuccessText}>Registro</Text>
          </View>
        </View>

        <View style={styles.cardListBody}>
          <View>
            <Text style={styles.dataLabel}>PESO</Text>
            <Text style={styles.dataValue}>{item.peso_kg} kg</Text>
          </View>
          <View>
            <Text style={styles.dataLabel}>COND. CORP.</Text>
            <Text style={styles.dataValue}>{item.condicion_corporal}/5</Text>
          </View>
        </View>
      </View>
    );
  };

  // Cabecera principal con las métricas y gráficos
  const renderHeader = () => (
    <View style={styles.headerContent}>
      {/* Título y Botón */}
      <View style={styles.topRow}>
        <View>
          <Text style={styles.pageTitle}>Pesajes</Text>
          <Text style={styles.pageSubtitle}>Evolución del peso de los animales.</Text>
        </View>
        <TouchableOpacity style={styles.btnAdd}>
          <MaterialIcons name="add" size={20} color="#fff" />
          <Text style={styles.btnAddText}>REGISTRAR</Text>
        </TouchableOpacity>
      </View>

      {/* Grid de Estadísticas */}
      <View style={styles.statsGrid}>
        <View style={[styles.statBox, { borderTopColor: '#154212' }]}>
          <Text style={styles.statBoxLabel}>ÚLTIMOS 7 DÍAS</Text>
          <Text style={styles.statBoxValue}>{stats.recientes}</Text>
        </View>
        <View style={[styles.statBox, { borderTopColor: '#3b6934' }]}>
          <Text style={styles.statBoxLabel}>ESTE MES</Text>
          <Text style={styles.statBoxValue}>{stats.esteMes}</Text>
        </View>
        <View style={[styles.statBox, { borderTopColor: '#72796e' }]}>
          <Text style={styles.statBoxLabel}>PROMEDIO HATO</Text>
          <Text style={styles.statBoxValue}>{stats.promedio} <Text style={{fontSize: 14}}>kg</Text></Text>
        </View>
        <View style={[styles.statBox, { borderTopColor: '#5b5f5c' }]}>
          <Text style={styles.statBoxLabel}>ÚLTIMO PESAJE</Text>
          <Text style={styles.statBoxValue}>{stats.ultimoDias}</Text>
        </View>
      </View>

      {/* Barra de Búsqueda para el historial */}
      <Text style={styles.sectionTitle}>Historial de pesajes</Text>
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={20} color="#72796e" />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por animal o código..."
          placeholderTextColor="#72796e"
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
          data={pesajesFiltrados}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#154212" />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialIcons name="monitor-weight" size={48} color="#c2c9bb" />
              <Text style={styles.emptyText}>No hay pesajes registrados aún.</Text>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#154212',
  },
  pageSubtitle: {
    fontSize: 14,
    color: '#5b5f5c',
    marginTop: 4,
  },
  btnAdd: {
    backgroundColor: '#154212',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    gap: 4,
  },
  btnAddText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statBox: {
    width: '48%',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    borderTopWidth: 4,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statBoxLabel: {
    fontSize: 10,
    color: '#5b5f5c',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  statBoxValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a1c19',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1c19',
    marginBottom: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e3e3de',
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
    backgroundColor: '#e8f5e9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#2e7d32',
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
  badgeSuccess: {
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeSuccessText: {
    color: '#2e7d32',
    fontSize: 10,
    fontWeight: 'bold',
  },
  cardListBody: {
    flexDirection: 'row',
    gap: 24,
  },
  dataLabel: {
    fontSize: 10,
    color: '#5b5f5c',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  dataValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1c19',
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