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
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useActiveFinca } from '../../contexts/ActiveFincaContext';
import SaludForm from '../../components/forms/SaludForm';
import CustomAlert from '../../components/CustomAlert';

// Definimos el tipo combinando Salud y Animales
type RegistroSalud = {
  id: string;
  animal_id: string;
  tipo_evento: string;
  nombre_medicamento: string | null;
  dosis: string | null;
  fecha_aplicacion: string;
  proxima_dosis: string | null;
  veterinario_encargado: string | null;
  costo: number | null;
  notas: string | null;
  animales?: { nombre: string | null; codigo_animal: string; especie?: string; fotografia_url?: string };
};

export default function SaludScreen() {
  const { activeFinca } = useActiveFinca();
  const [registros, setRegistros] = useState<RegistroSalud[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingSalud, setEditingSalud] = useState<RegistroSalud | null>(null);
  const [viewingSalud, setViewingSalud] = useState<RegistroSalud | null>(null);

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

  const confirmarEliminar = (registro: RegistroSalud) => {
    showAlert(
      'Eliminar Registro de Salud',
      `¿Estás seguro que deseas eliminar este registro de ${registro.tipo_evento}?`,
      'warning',
      () => handleDelete(registro.id),
      () => setAlertConfig(prev => ({ ...prev, visible: false }))
    );
  };

  const handleDelete = async (id: string) => {
    setAlertConfig(prev => ({ ...prev, visible: false }));
    try {
      const { error } = await supabase.from('registros_salud').delete().eq('id', id);
      if (error) throw error;
      showAlert('¡Éxito!', 'Registro eliminado correctamente.', 'success', () => {
        setAlertConfig(prev => ({ ...prev, visible: false }));
        fetchRegistros();
      });
    } catch (error: any) {
      console.error(error);
      showAlert('Error', 'No se pudo eliminar el registro.', 'error', () => setAlertConfig(prev => ({ ...prev, visible: false })));
    }
  };

  const [filtroEspecie, setFiltroEspecie] = useState<string>('General');

  const fetchRegistros = async () => {
    try {
      if (!activeFinca) return;

      const { data, error } = await supabase
        .from('registros_salud')
        .select(`
          id,
          animal_id,
          tipo_evento,
          nombre_medicamento,
          dosis,
          fecha_aplicacion,
          proxima_dosis,
          veterinario_encargado,
          costo,
          notas,
          animales!inner ( nombre, codigo_animal, finca_id, especie, fotografia_url )
        `)
        .eq('animales.finca_id', activeFinca.id)
        .order('fecha_aplicacion', { ascending: false });

      if (error) throw error;

      if (data) {
        // @ts-ignore
        const records: RegistroSalud[] = data;
        setRegistros(records);
      }
    } catch (error) {
      console.error('Error obteniendo registros de salud:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRegistros();
  }, [activeFinca]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRegistros();
  };

  // Filtrado por buscador y especie
  const registrosFiltrados = registros.filter(r => {
    const term = searchQuery.toLowerCase();
    const animalNombre = r.animales?.nombre?.toLowerCase() || '';
    const animalCod = r.animales?.codigo_animal?.toLowerCase() || '';
    const medicina = r.nombre_medicamento?.toLowerCase() || '';
    const especie = r.animales?.especie || '';
    
    const cumpleBusqueda = animalNombre.includes(term) || animalCod.includes(term) || medicina.includes(term);
    const cumpleEspecie = filtroEspecie === 'General' || especie === filtroEspecie;

    return cumpleBusqueda && cumpleEspecie;
  });

  const especiesDisponibles = ['General', ...Array.from(new Set(registros.map(r => r.animales?.especie).filter(Boolean))) as string[]];

  // Computar estadísticas sobre los filtrados
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0); 

  let eventosMes = 0;
  let proximasDosis = 0;
  let dosisVencidas = 0;
  let tratamientosActivos = 0;

  registrosFiltrados.forEach(r => {
    const fechaApp = new Date(r.fecha_aplicacion);
    if (fechaApp.getMonth() === hoy.getMonth() && fechaApp.getFullYear() === hoy.getFullYear()) {
      eventosMes++;
    }
    if (r.tipo_evento?.toLowerCase() === 'tratamiento') {
      tratamientosActivos++;
    }
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

  const stats = { eventosMes, proximasDosis, dosisVencidas, tratamientosActivos };

  const getEventTypeColor = (tipo: string) => {
    switch (tipo?.toLowerCase()) {
      case 'vacuna': return { bg: '#e8f5e9', text: '#2e7d32' };
      case 'tratamiento': return { bg: '#fff3e0', text: '#ef6c00' };
      case 'desparasitación': return { bg: '#e3f2fd', text: '#1565c0' };
      default: return { bg: '#e8e8e3', text: '#154212' };
    }
  };

  const getEventTypeIcon = (tipo: string) => {
    switch (tipo?.toLowerCase()) {
      case 'vacuna': return 'vaccines';
      case 'tratamiento': return 'healing';
      case 'desparasitación': return 'bug-report';
      default: return 'medical-services';
    }
  };

  // Renderizado de cada tarjeta de la lista
  const renderItem = ({ item }: { item: RegistroSalud }) => {
    return (
      <TouchableOpacity style={styles.cardList} activeOpacity={0.7} onPress={() => setViewingSalud(item)}>
        <View style={styles.cardListHeader}>
          <View style={styles.cardListProfile}>
            {item.animales?.fotografia_url ? (
              <Image source={{ uri: item.animales.fotografia_url }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: getEventTypeColor(item.tipo_evento).bg }]}>
                <MaterialIcons name={getEventTypeIcon(item.tipo_evento) as any} size={20} color={getEventTypeColor(item.tipo_evento).text} />
              </View>
            )}
            <View>
              <Text style={styles.animalName}>{item.animales?.nombre || 'Desconocido'}</Text>
              <Text style={styles.animalMeta}>{item.animales?.codigo_animal} {item.animales?.especie ? `• ${item.animales.especie}` : ''}</Text>
            </View>
          </View>
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => { setEditingSalud(item); setModalVisible(true); }}>
              <MaterialIcons name="edit" size={18} color="#154212" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => confirmarEliminar(item)}>
              <MaterialIcons name="delete" size={18} color="#ba1a1a" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.cardListBody}>
          <View style={{ marginBottom: 12 }}>
            <Text style={styles.dataLabel}>{item.tipo_evento.toUpperCase()}</Text>
            <Text style={styles.dataValue} numberOfLines={1}>
              {item.nombre_medicamento || 'Sin medicamento'}
            </Text>
            {item.dosis && <Text style={styles.dataSubValue}>Dosis: {item.dosis}</Text>}
          </View>
          
          <View style={{ flexDirection: 'row' }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.dataLabel}>FECHA DE APLICACIÓN</Text>
              <Text style={styles.dataValue} numberOfLines={1}>{item.fecha_aplicacion}</Text>
            </View>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Text style={styles.dataLabel}>PRÓXIMA DOSIS</Text>
              <Text style={styles.dataValue} numberOfLines={1}>{item.proxima_dosis || 'N/A'}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Cabecera principal (Estadísticas y Filtros del diseño HTML)
  const renderHeader = () => (
    <View style={styles.headerContent}>
      {/* Títulos y Botones Superiores */}
      <View style={styles.topRow}>
        <View>
          <Text style={styles.pageSubtitle}>Historial clínico y tratamientos.</Text>
        </View>
        <TouchableOpacity style={styles.btnAdd} onPress={() => { setEditingSalud(null); setModalVisible(true); }}>
          <MaterialIcons name="add" size={20} color="#fff" />
          <Text style={styles.btnAddText}>NUEVO REGISTRO</Text>
        </TouchableOpacity>
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
      <Header title="Salud Animal" />
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#154212" />}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyContainer}>
                <MaterialIcons name="medical-services" size={48} color="#c2c9bb" />
                <Text style={styles.emptyText}>No hay registros de salud en esta finca.</Text>
              </View>
            ) : null
          }
        />
      )}

      <Modal visible={modalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <SaludForm 
          onClose={() => setModalVisible(false)} 
          onSuccess={() => { setModalVisible(false); fetchRegistros(); }}
          initialData={editingSalud}
        />
      </Modal>

      <Modal visible={!!viewingSalud} animationType="fade" transparent onRequestClose={() => setViewingSalud(null)}>
        {viewingSalud && (
          <View style={styles.detailOverlay}>
            <View style={styles.detailContent}>
              <View style={styles.detailHeader}>
                <Text style={styles.detailTitle}>Detalle de Salud</Text>
                <TouchableOpacity onPress={() => setViewingSalud(null)}>
                  <MaterialIcons name="close" size={24} color="#5b5f5c" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.detailProfile}>
                {viewingSalud.animales?.fotografia_url ? (
                  <Image source={{ uri: viewingSalud.animales.fotografia_url }} style={styles.detailAvatarImage} />
                ) : (
                  <View style={[styles.avatar, { width: 80, height: 80, borderRadius: 40, backgroundColor: getEventTypeColor(viewingSalud.tipo_evento).bg }]}>
                    <MaterialIcons name={getEventTypeIcon(viewingSalud.tipo_evento) as any} size={40} color={getEventTypeColor(viewingSalud.tipo_evento).text} />
                  </View>
                )}
                <Text style={styles.detailAnimalName}>{viewingSalud.animales?.nombre || 'Desconocido'}</Text>
                <Text style={styles.detailAnimalMeta}>{viewingSalud.animales?.codigo_animal} • {viewingSalud.animales?.especie}</Text>
              </View>

              <View style={styles.detailDataRow}>
                <View style={styles.detailDataCol}>
                  <Text style={styles.dataLabel}>TIPO DE EVENTO</Text>
                  <Text style={styles.detailDataValue}>{viewingSalud.tipo_evento}</Text>
                </View>
                <View style={styles.detailDataCol}>
                  <Text style={styles.dataLabel}>FECHA</Text>
                  <Text style={styles.detailDataValue}>{viewingSalud.fecha_aplicacion}</Text>
                </View>
              </View>

              <View style={styles.detailDataRow}>
                <View style={styles.detailDataCol}>
                  <Text style={styles.dataLabel}>MEDICAMENTO</Text>
                  <Text style={styles.detailDataValue}>{viewingSalud.nombre_medicamento || '-'}</Text>
                </View>
                <View style={styles.detailDataCol}>
                  <Text style={styles.dataLabel}>DOSIS</Text>
                  <Text style={styles.detailDataValue}>{viewingSalud.dosis || '-'}</Text>
                </View>
              </View>

              <View style={styles.detailDataRow}>
                <View style={styles.detailDataCol}>
                  <Text style={styles.dataLabel}>PRÓXIMA DOSIS</Text>
                  <Text style={styles.detailDataValue}>{viewingSalud.proxima_dosis || 'N/A'}</Text>
                </View>
                <View style={styles.detailDataCol}>
                  <Text style={styles.dataLabel}>VETERINARIO</Text>
                  <Text style={styles.detailDataValue}>{viewingSalud.veterinario_encargado || '-'}</Text>
                </View>
              </View>

              <View style={styles.detailDataRow}>
                <View style={styles.detailDataCol}>
                  <Text style={styles.dataLabel}>COSTO</Text>
                  <Text style={styles.detailDataValue}>{viewingSalud.costo ? `$${viewingSalud.costo}` : '-'}</Text>
                </View>
              </View>

              <View style={styles.detailDataRow}>
                <View style={styles.detailDataCol}>
                  <Text style={styles.dataLabel}>NOTAS</Text>
                  <Text style={[styles.detailDataValue, { fontWeight: 'normal' }]}>{viewingSalud.notas || 'No hay notas.'}</Text>
                </View>
              </View>

              <View style={styles.detailActions}>
                <TouchableOpacity 
                  style={[styles.btnPrimary, { flex: 1 }]} 
                  onPress={() => {
                    setViewingSalud(null);
                    setEditingSalud(viewingSalud);
                    setModalVisible(true);
                  }}
                >
                  <MaterialIcons name="edit" size={20} color="#fff" />
                  <Text style={styles.btnPrimaryText}>Editar</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.btnSecondary, { flex: 1, borderColor: '#ba1a1a', backgroundColor: '#fff' }]} 
                  onPress={() => {
                    setViewingSalud(null);
                    confirmarEliminar(viewingSalud);
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
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    resizeMode: 'cover',
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
  filterScroll: {
    marginBottom: 5,
  },
  filterChip: {
    backgroundColor: '#e8e8e3',
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
});