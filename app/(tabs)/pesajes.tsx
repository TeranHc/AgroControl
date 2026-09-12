import React, { useEffect, useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  FlatList, 
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
  ScrollView,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../../components/Header';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useActiveFinca } from '../../contexts/ActiveFincaContext';
import PesajeForm from '../../components/forms/PesajeForm';
import CustomAlert from '../../components/CustomAlert';

// Definimos la estructura de datos uniendo Pesajes y Animales
type Pesaje = {
  id: string;
  animal_id: string;
  peso_kg: number;
  fecha_pesaje: string;
  condicion_corporal: number;
  notas?: string;
  animales: {
    nombre: string;
    codigo_animal: string;
    especie?: string;
    fotografia_url?: string;
  } | null;
};

export default function PesajesScreen() {
  const { activeFinca } = useActiveFinca();
  const [pesajes, setPesajes] = useState<Pesaje[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filtroEspecie, setFiltroEspecie] = useState<string>('General');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPesaje, setEditingPesaje] = useState<Pesaje | null>(null);
  const [viewingPesaje, setViewingPesaje] = useState<Pesaje | null>(null);
  
  // Custom Alert para eliminar
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'warning' as 'success'|'error'|'warning'|'info',
    onConfirm: () => {},
    onCancel: undefined as (() => void) | undefined,
  });

  const showAlert = (title: string, message: string, type: 'success'|'error'|'warning'|'info', onConfirm: () => void, onCancel?: () => void) => {
    setAlertConfig({ visible: true, title, message, type, onConfirm, onCancel });
  };

  const confirmarEliminar = (pesaje: Pesaje) => {
    showAlert(
      'Eliminar Pesaje',
      `¿Estás seguro que deseas eliminar este pesaje de ${pesaje.peso_kg}kg?`,
      'warning',
      () => handleDelete(pesaje.id),
      () => setAlertConfig(prev => ({ ...prev, visible: false }))
    );
  };

  const handleDelete = async (id: string) => {
    setAlertConfig(prev => ({ ...prev, visible: false }));
    try {
      const { error } = await supabase.from('pesajes').delete().eq('id', id);
      if (error) throw error;
      showAlert('¡Éxito!', 'Pesaje eliminado correctamente.', 'success', () => {
        setAlertConfig(prev => ({ ...prev, visible: false }));
        fetchPesajes();
      });
    } catch (error: any) {
      console.error(error);
      showAlert('Error', 'No se pudo eliminar el pesaje.', 'error', () => setAlertConfig(prev => ({ ...prev, visible: false })));
    }
  };

  // Estadísticas calculadas localmente
  const fetchPesajes = async () => {
    try {
      if (!activeFinca) return;

      // Obtenemos los pesajes y hacemos JOIN con la tabla animales usando !inner para poder filtrar
      const { data, error } = await supabase
        .from('pesajes')
        .select(`
          id,
          animal_id,
          peso_kg,
          fecha_pesaje,
          condicion_corporal,
          notas,
          animales!inner ( nombre, codigo_animal, finca_id, especie, fotografia_url )
        `)
        .eq('animales.finca_id', activeFinca.id)
        .order('fecha_pesaje', { ascending: false });

      if (error) throw error;

      if (data) {
        // @ts-ignore (Supabase a veces confunde los tipos en los joins)
        const registros: Pesaje[] = data;
        setPesajes(registros);
      }
    } catch (error) {
      console.error('Error obteniendo pesajes:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPesajes();
  }, [activeFinca]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPesajes();
  };

  // Filtrado de la lista basado en búsqueda y especie
  const pesajesFiltrados = pesajes.filter((p) => {
    const term = searchQuery.toLowerCase();
    const animalName = p.animales?.nombre?.toLowerCase() || '';
    const animalCode = p.animales?.codigo_animal?.toLowerCase() || '';
    const especie = p.animales?.especie || '';
    
    const cumpleBusqueda = animalName.includes(term) || animalCode.includes(term);
    const cumpleEspecie = filtroEspecie === 'General' || especie === filtroEspecie;
    
    return cumpleBusqueda && cumpleEspecie;
  });

  const especiesDisponibles = ['General', ...Array.from(new Set(pesajes.map(p => p.animales?.especie).filter(Boolean)))];

  // Computar estadísticas a partir de pesajesFiltrados
  let stats = { recientes: 0, esteMes: 0, promedio: 0, ultimoDias: 'Sin datos' };
  if (pesajesFiltrados.length > 0) {
    const hoy = new Date();
    const hace7Dias = new Date();
    hace7Dias.setDate(hoy.getDate() - 7);
    
    let sumaPesos = 0;
    let recientes = 0;
    let esteMes = 0;

    pesajesFiltrados.forEach(p => {
      const fecha = new Date(p.fecha_pesaje);
      sumaPesos += Number(p.peso_kg);
      if (fecha >= hace7Dias) recientes++;
      if (fecha.getMonth() === hoy.getMonth() && fecha.getFullYear() === hoy.getFullYear()) esteMes++;
    });

    const ultimoPesaje = new Date(pesajesFiltrados[0].fecha_pesaje);
    const diffTime = Math.abs(hoy.getTime() - ultimoPesaje.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    stats = {
      recientes,
      esteMes,
      promedio: Math.round(sumaPesos / pesajesFiltrados.length),
      ultimoDias: diffDays === 0 ? 'Hoy' : `Hace ${diffDays} días`
    };
  }

  const getCondicionCorporalText = (valor?: number) => {
    switch(valor) {
      case 1: return 'Muy Flaco';
      case 2: return 'Flaco';
      case 3: return 'Normal';
      case 4: return 'Gordo';
      case 5: return 'Muy Gordo';
      default: return 'N/A';
    }
  };

  // Renderiza cada tarjeta de pesaje en la lista
  const renderItem = ({ item }: { item: Pesaje }) => {
    const inicial = item.animales?.nombre ? item.animales.nombre.charAt(0).toUpperCase() : 'A';
    
    return (
      <TouchableOpacity style={styles.cardList} activeOpacity={0.7} onPress={() => setViewingPesaje(item)}>
        <View style={styles.cardListHeader}>
          <View style={styles.cardListProfile}>
            {item.animales?.fotografia_url ? (
              <Image source={{ uri: item.animales.fotografia_url }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{inicial}</Text>
              </View>
            )}
            <View>
              <Text style={styles.animalName}>{item.animales?.nombre || 'Desconocido'}</Text>
              <Text style={styles.animalMeta}>{item.animales?.codigo_animal} • {item.fecha_pesaje}</Text>
            </View>
          </View>
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => { setEditingPesaje(item); setModalVisible(true); }}>
              <MaterialIcons name="edit" size={18} color="#154212" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => confirmarEliminar(item)}>
              <MaterialIcons name="delete" size={18} color="#ba1a1a" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.cardListBody}>
          <View style={styles.pesoRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.dataLabel}>PESO</Text>
              <Text style={styles.dataValue}>{item.peso_kg} kg</Text>
            </View>
            <View style={{ flex: 1.2 }}>
              <Text style={styles.dataLabel}>COND. CORP.</Text>
              <Text style={styles.dataValue} numberOfLines={1}>{getCondicionCorporalText(item.condicion_corporal)}</Text>
            </View>
            <View style={{ flex: 1.5 }}>
              <Text style={styles.dataLabel}>DESCRIPCIÓN</Text>
              <Text style={[styles.dataValue, { fontSize: 13, fontWeight: 'normal', color: '#4a5157' }]} numberOfLines={2}>
                {item.notas || '-'}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Cabecera principal con las métricas y gráficos
  const renderHeader = () => (
    <View style={styles.headerContent}>
      {/* Título y Botón */}
      <View style={styles.topRow}>
        <View>
          <Text style={styles.pageSubtitle}>Evolución del peso de los animales.</Text>
        </View>
        <TouchableOpacity style={styles.btnAdd} onPress={() => { setEditingPesaje(null); setModalVisible(true); }}>
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
          placeholder="Buscar por código o nombre..."
          placeholderTextColor="#72796e"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <MaterialIcons name="close" size={20} color="#72796e" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
        {especiesDisponibles.map(especie => (
          <TouchableOpacity 
            key={especie} 
            style={[styles.filterChip, filtroEspecie === especie && styles.filterChipActive]}
            onPress={() => setFiltroEspecie(especie)}
          >
            <Text style={[styles.filterChipText, filtroEspecie === especie && styles.filterChipTextActive]}>
              {especie}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <Header title="Registro de Pesajes" />
      
      {renderHeader()}

      <FlatList
        data={pesajesFiltrados}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#154212']} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialIcons name="monitor-weight" size={48} color="#c2c9bb" />
            <Text style={styles.emptyText}>No hay pesajes registrados</Text>
          </View>
        }
      />

      <Modal visible={modalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <PesajeForm 
          onClose={() => setModalVisible(false)} 
          onSuccess={() => { setModalVisible(false); fetchPesajes(); }} 
          initialData={editingPesaje}
        />
      </Modal>

      <Modal visible={!!viewingPesaje} animationType="fade" transparent onRequestClose={() => setViewingPesaje(null)}>
        {viewingPesaje && (
          <View style={styles.detailOverlay}>
            <View style={styles.detailContent}>
              <View style={styles.detailHeader}>
                <Text style={styles.detailTitle}>Detalle de Pesaje</Text>
                <TouchableOpacity onPress={() => setViewingPesaje(null)}>
                  <MaterialIcons name="close" size={24} color="#5b5f5c" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.detailProfile}>
                {viewingPesaje.animales?.fotografia_url ? (
                  <Image source={{ uri: viewingPesaje.animales.fotografia_url }} style={styles.detailAvatarImage} />
                ) : (
                  <View style={[styles.avatar, { width: 80, height: 80, borderRadius: 40 }]}>
                    <Text style={[styles.avatarText, { fontSize: 32 }]}>
                      {viewingPesaje.animales?.nombre ? viewingPesaje.animales.nombre.charAt(0).toUpperCase() : 'A'}
                    </Text>
                  </View>
                )}
                <Text style={styles.detailAnimalName}>{viewingPesaje.animales?.nombre || 'Desconocido'}</Text>
                <Text style={styles.detailAnimalMeta}>{viewingPesaje.animales?.codigo_animal} • {viewingPesaje.animales?.especie}</Text>
              </View>

              <View style={styles.detailDataRow}>
                <View style={styles.detailDataCol}>
                  <Text style={styles.dataLabel}>FECHA</Text>
                  <Text style={styles.detailDataValue}>{viewingPesaje.fecha_pesaje}</Text>
                </View>
                <View style={styles.detailDataCol}>
                  <Text style={styles.dataLabel}>PESO</Text>
                  <Text style={styles.detailDataValue}>{viewingPesaje.peso_kg} kg</Text>
                </View>
              </View>
              
              <View style={styles.detailDataRow}>
                <View style={styles.detailDataCol}>
                  <Text style={styles.dataLabel}>COND. CORPORAL</Text>
                  <Text style={styles.detailDataValue}>{getCondicionCorporalText(viewingPesaje.condicion_corporal)} ({viewingPesaje.condicion_corporal}/5)</Text>
                </View>
              </View>

              <View style={styles.detailDataRow}>
                <View style={styles.detailDataCol}>
                  <Text style={styles.dataLabel}>DESCRIPCIÓN</Text>
                  <Text style={[styles.detailDataValue, { fontWeight: 'normal' }]}>{viewingPesaje.notas || 'No hay notas adicionales.'}</Text>
                </View>
              </View>

              <View style={styles.detailActions}>
                <TouchableOpacity 
                  style={[styles.btnPrimary, { flex: 1 }]} 
                  onPress={() => {
                    setViewingPesaje(null);
                    setEditingPesaje(viewingPesaje);
                    setModalVisible(true);
                  }}
                >
                  <MaterialIcons name="edit" size={20} color="#fff" />
                  <Text style={styles.btnPrimaryText}>Editar</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.btnSecondary, { flex: 1, borderColor: '#ba1a1a', backgroundColor: '#fff' }]} 
                  onPress={() => {
                    setViewingPesaje(null);
                    confirmarEliminar(viewingPesaje);
                  }}
                >
                  <MaterialIcons name="delete" size={20} color="#ba1a1a" />
                  <Text style={[styles.btnPrimaryText, { color: '#ba1a1a' }]}>Eliminar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </Modal>

      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onConfirm={alertConfig.onConfirm}
        onCancel={alertConfig.onCancel}
      />
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
    backgroundColor: '#e3e3de',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#1a1c19',
    outlineStyle: 'none',
  },
  filterScroll: {
    marginBottom: 5,
  },
  filterChip: {
    backgroundColor: '#e3e3de',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#154212',
  },
  filterChipText: {
    color: '#42493e',
    fontSize: 13,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 20,
    marginBottom: 16,
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
    backgroundColor: '#e7ece6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#154212',
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
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    padding: 6,
    backgroundColor: '#f4f4ee',
    borderRadius: 6,
  },
  cardListBody: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e3e3de',
  },
  pesoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  notesContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f4f4ee',
  },
  notesText: {
    fontSize: 14,
    color: '#4a5157',
    fontStyle: 'italic',
  },
  emptyOptionsText: {
    textAlign: 'center',
    color: '#72796e',
    marginTop: 20,
    fontStyle: 'italic',
  },
  detailOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  detailContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1c19',
  },
  detailProfile: {
    alignItems: 'center',
    marginBottom: 24,
  },
  detailAvatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    resizeMode: 'cover',
    marginBottom: 12,
  },
  detailAnimalName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1c19',
  },
  detailAnimalMeta: {
    fontSize: 14,
    color: '#5b5f5c',
    marginTop: 4,
  },
  detailDataRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  detailDataCol: {
    flex: 1,
  },
  detailDataValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1c19',
    marginTop: 4,
  },
  detailActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  btnPrimary: {
    backgroundColor: '#154212',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  btnSecondary: {
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
  },
  btnPrimaryText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
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
  },
});