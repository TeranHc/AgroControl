import React, { useEffect, useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  FlatList, 
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  ScrollView,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import Header from '../../components/Header';
import { supabase } from '../../lib/supabase';
import { useActiveFinca } from '../../contexts/ActiveFincaContext';
import ReproduccionForm from '../../components/forms/ReproduccionForm';
import CustomAlert from '../../components/CustomAlert';

// Definimos el tipo uniendo Reproducción y Animales
type ReproduccionItem = {
  id: string;
  animal_id: string;
  macho_id: string | null;
  tipo_evento: string;
  fecha_evento: string;
  estado_gestacion: string | null;
  fecha_probable_parto: string | null;
  crias_nacidas: number | null;
  notas: string | null;
  hembra?: { nombre: string | null; codigo_animal: string; especie?: string; fotografia_url?: string };
  macho?: { nombre: string | null; codigo_animal: string };
};

export default function ReproduccionScreen() {
  const { activeFinca } = useActiveFinca();
  const [registros, setRegistros] = useState<ReproduccionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ReproduccionItem | null>(null);
  const [viewingEvent, setViewingEvent] = useState<ReproduccionItem | null>(null);

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

  const confirmarEliminar = (evento: ReproduccionItem) => {
    showAlert(
      'Eliminar Evento',
      `¿Estás seguro que deseas eliminar este registro de ${evento.tipo_evento}?`,
      'warning',
      () => handleDelete(evento.id),
      () => setAlertConfig(prev => ({ ...prev, visible: false }))
    );
  };

  const handleDelete = async (id: string) => {
    setAlertConfig(prev => ({ ...prev, visible: false }));
    try {
      const { error } = await supabase.from('reproduccion').delete().eq('id', id);
      if (error) throw error;
      showAlert('¡Éxito!', 'Evento eliminado correctamente.', 'success', () => {
        setAlertConfig(prev => ({ ...prev, visible: false }));
        fetchReproduccion();
      });
    } catch (error: any) {
      console.error(error);
      showAlert('Error', 'No se pudo eliminar el evento.', 'error', () => setAlertConfig(prev => ({ ...prev, visible: false })));
    }
  };

  const [filtroEspecie, setFiltroEspecie] = useState<string>('General');

  const fetchReproduccion = async () => {
    try {
      if (!activeFinca) return;

      // Hacemos JOIN con la tabla animales dos veces (para hembra y macho)
      const { data, error } = await supabase
        .from('reproduccion')
        .select(`
          id,
          animal_id,
          macho_id,
          tipo_evento,
          fecha_evento,
          estado_gestacion,
          fecha_probable_parto,
          crias_nacidas,
          notas,
          hembra:animales!animal_id!inner ( nombre, codigo_animal, finca_id, especie, fotografia_url ),
          macho:animales!macho_id ( codigo_animal )
        `)
        .eq('hembra.finca_id', activeFinca.id)
        .order('fecha_evento', { ascending: false });

      if (error) throw error;

      if (data) {
        // @ts-ignore
        const records: ReproduccionItem[] = data;
        setRegistros(records);
      }
    } catch (error) {
      console.error('Error obteniendo registros de reproducción:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReproduccion();
  }, [activeFinca]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchReproduccion();
  };

  const registrosFiltrados = registros.filter((item) => {
    const term = searchQuery.toLowerCase();
    const codigoMadre = item.hembra?.codigo_animal?.toLowerCase() || '';
    const especie = item.hembra?.especie || '';
    
    const cumpleBusqueda = codigoMadre.includes(term);
    const cumpleEspecie = filtroEspecie === 'General' || especie === filtroEspecie;
    
    return cumpleBusqueda && cumpleEspecie;
  });

  const especiesDisponibles = ['General', ...Array.from(new Set(registros.map(r => r.hembra?.especie).filter(Boolean))) as string[]];

  // Computar estadísticas y alertas a partir de registrosFiltrados
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  
  const limite30Dias = new Date();
  limite30Dias.setDate(hoy.getDate() + 30);

  let gestacionesActivas = 0;
  let partosMes = 0;
  let alertasParto: ReproduccionItem[] = [];

  registrosFiltrados.forEach(r => {
    if (r.estado_gestacion?.toLowerCase() === 'positivo') {
      gestacionesActivas++;
    }

    const fechaEvento = new Date(r.fecha_evento);
    if (r.tipo_evento?.toLowerCase() === 'parto' && fechaEvento.getMonth() === hoy.getMonth() && fechaEvento.getFullYear() === hoy.getFullYear()) {
      partosMes++;
    }

    if (r.fecha_probable_parto) {
      const fechaParto = new Date(r.fecha_probable_parto);
      // Incluir alertas dentro de los próximos 30 días, o incluso atrasadas (>= hoy o lo que sea)
      // La lógica anterior era >= hoy y <= limite30Dias
      if (fechaParto >= hoy && fechaParto <= limite30Dias) {
        alertasParto.push(r);
      }
    }
  });

  alertasParto.sort((a, b) => new Date(a.fecha_probable_parto!).getTime() - new Date(b.fecha_probable_parto!).getTime());

  const stats = { gestacionesActivas, partosMes };

  const getStatusColor = (status: string | null) => {
    switch (status?.toLowerCase()) {
      case 'positivo': return { bg: '#e8f5e9', text: '#2e7d32' };
      case 'negativo': return { bg: '#ffebee', text: '#c62828' };
      case 'pendiente': return { bg: '#fff8e1', text: '#f57f17' };
      case 'completado': return { bg: '#e3e3de', text: '#42493e' };
      default: return { bg: '#e8f5e9', text: '#2e7d32' };
    }
  };

  // Renderiza cada registro en la lista del historial
  const renderItem = ({ item }: { item: ReproduccionItem }) => {
    const statusStyle = getStatusColor(item.estado_gestacion || 'Exitoso'); // Mock de status si no aplica
    
    return (
      <TouchableOpacity style={styles.recordCard} activeOpacity={0.7} onPress={() => setViewingEvent(item)}>
        <View style={styles.cardHeader}>
          <View style={styles.eventTypeBadge}>
            <Text style={styles.eventTypeText}>{item.tipo_evento.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            {item.hembra?.fotografia_url ? (
              <Image source={{ uri: item.hembra.fotografia_url }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.hembra?.nombre ? item.hembra.nombre.charAt(0).toUpperCase() : 'A'}</Text>
              </View>
            )}
            <View>
              <Text style={styles.animalMeta}>
                Madre: {item.hembra?.codigo_animal} {item.hembra?.nombre ? `(${item.hembra.nombre})` : ''}
              </Text>
              {item.macho && (
                <Text style={styles.animalMeta}>
                  Padre: {item.macho?.codigo_animal}
                </Text>
              )}
            </View>
          </View>

          <View style={{ flexDirection: 'row', marginBottom: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.dataLabel}>ESTADO GESTACIÓN</Text>
              {item.estado_gestacion ? (
                <View style={[styles.statusBadge, { alignSelf: 'flex-start', marginTop: 2, backgroundColor: getStatusColor(item.estado_gestacion).bg }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(item.estado_gestacion).text }]}>
                    {item.estado_gestacion}
                  </Text>
                </View>
              ) : (
                <Text style={styles.dataValue}>-</Text>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.dataLabel}>PROBABLE PARTO</Text>
              {item.fecha_probable_parto ? (
                <View style={[styles.dateRow, { marginTop: 2 }]}>
                  <MaterialIcons name="event" size={14} color="#3b6934" />
                  <Text style={[styles.dataValue, { color: '#3b6934', fontWeight: 'bold' }]}>{item.fecha_probable_parto}</Text>
                </View>
              ) : (
                <Text style={styles.dataValue}>-</Text>
              )}
            </View>
          </View>

          <View style={[styles.cardFooter, { alignItems: 'center' }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.dataLabel}>FECHA DEL EVENTO</Text>
              <Text style={styles.dataValue}>{item.fecha_evento}</Text>
            </View>
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => { setEditingEvent(item); setModalVisible(true); }}>
                <MaterialIcons name="edit" size={18} color="#154212" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => confirmarEliminar(item)}>
                <MaterialIcons name="delete" size={18} color="#ba1a1a" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Sección de Alertas
  const renderAlerts = () => {
    if (alertasParto.length === 0) return null;

    return (
      <View style={styles.alertsContainer}>
        <View style={styles.alertsHeader}>
          <MaterialIcons name="warning" size={18} color="#ba1a1a" />
          <Text style={styles.alertsTitle}>Próximos Partos (Alertas)</Text>
        </View>
        
        {alertasParto.slice(0, 3).map((alerta, index) => {
          const hoy = new Date();
          const parto = new Date(alerta.fecha_probable_parto!);
          const diasFaltantes = Math.ceil((parto.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
          
          return (
            <View key={index} style={styles.alertItem}>
              <View>
                <Text style={styles.alertAnimalName}>Hembra {alerta.hembra?.codigo_animal}</Text>
                <Text style={styles.alertDate}>Est. {alerta.fecha_probable_parto}</Text>
              </View>
              <View style={styles.alertDaysBadge}>
                <Text style={styles.alertDaysText}>En {diasFaltantes} días</Text>
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.headerContent}>
      {/* Títulos y Botones Superiores */}
      <View style={styles.topRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.pageSubtitle}>Gestiona el ciclo reproductivo y alertas de parto.</Text>
        </View>
        <TouchableOpacity style={styles.btnPrimary} onPress={() => { setEditingEvent(null); setModalVisible(true); }}>
          <MaterialIcons name="add" size={20} color="#fff" />
          <Text style={styles.btnPrimaryText}>NUEVO REGISTRO</Text>
        </TouchableOpacity>
      </View>

      {/* Widgets Bento Grid */}
      <View style={styles.statsGrid}>
        <View style={[styles.statBox, { borderLeftColor: '#154212' }]}>
          <View style={styles.statHeader}>
            <Text style={styles.statLabel}>GESTACIONES ACTIVAS</Text>
            <MaterialIcons name="monitor-heart" size={18} color="#154212" />
          </View>
          <Text style={styles.statValue}>{stats.gestacionesActivas}</Text>
        </View>
        <View style={[styles.statBox, { borderLeftColor: '#e7ece6' }]}>
          <View style={styles.statHeader}>
            <Text style={styles.statLabel}>PARTOS ESTE MES</Text>
            <MaterialIcons name="child-care" size={18} color="#72796e" />
          </View>
          <Text style={styles.statValue}>{stats.partosMes}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <Header title="Reproducción" />
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#154212" />
        </View>
      ) : (
        <FlatList
          data={registrosFiltrados}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListHeaderComponent={() => (
            <>
              {renderHeader()}
              <View style={{ paddingHorizontal: 20 }}>
                {renderAlerts()}
                <Text style={styles.sectionTitle}>Historial Reproductivo</Text>
                
                <View style={styles.searchContainer}>
                  <MaterialIcons name="search" size={20} color="#72796e" />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Buscar por código de madre..."
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
            </>
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#154212" />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialIcons name="favorite-outline" size={48} color="#c2c9bb" />
              <Text style={styles.emptyText}>No hay eventos reproductivos registrados.</Text>
            </View>
          }
        />
      )}

      <Modal visible={modalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <ReproduccionForm 
          onClose={() => setModalVisible(false)} 
          onSuccess={() => { setModalVisible(false); fetchReproduccion(); }}
          initialData={editingEvent}
        />
      </Modal>

      <Modal visible={!!viewingEvent} animationType="fade" transparent onRequestClose={() => setViewingEvent(null)}>
        {viewingEvent && (
          <View style={styles.detailOverlay}>
            <View style={styles.detailContent}>
              <View style={styles.detailHeader}>
                <Text style={styles.detailTitle}>Detalle de Reproducción</Text>
                <TouchableOpacity onPress={() => setViewingEvent(null)}>
                  <MaterialIcons name="close" size={24} color="#5b5f5c" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.detailProfile}>
                {viewingEvent.hembra?.fotografia_url ? (
                  <Image source={{ uri: viewingEvent.hembra.fotografia_url }} style={styles.detailAvatarImage} />
                ) : (
                  <View style={[styles.avatar, { width: 80, height: 80, borderRadius: 40 }]}>
                    <Text style={[styles.avatarText, { fontSize: 32 }]}>
                      {viewingEvent.hembra?.nombre ? viewingEvent.hembra.nombre.charAt(0).toUpperCase() : 'A'}
                    </Text>
                  </View>
                )}
                <Text style={styles.detailAnimalName}>{viewingEvent.hembra?.nombre || 'Desconocido'}</Text>
                <Text style={styles.detailAnimalMeta}>{viewingEvent.hembra?.codigo_animal} • {viewingEvent.hembra?.especie}</Text>
              </View>

              <View style={styles.detailDataRow}>
                <View style={styles.detailDataCol}>
                  <Text style={styles.dataLabel}>TIPO DE EVENTO</Text>
                  <Text style={styles.detailDataValue}>{viewingEvent.tipo_evento}</Text>
                </View>
                <View style={styles.detailDataCol}>
                  <Text style={styles.dataLabel}>FECHA</Text>
                  <Text style={styles.detailDataValue}>{viewingEvent.fecha_evento}</Text>
                </View>
              </View>

              {viewingEvent.macho && (
                <View style={styles.detailDataRow}>
                  <View style={styles.detailDataCol}>
                    <Text style={styles.dataLabel}>MACHO (PADRE)</Text>
                    <Text style={styles.detailDataValue}>{viewingEvent.macho.codigo_animal}</Text>
                  </View>
                </View>
              )}

              <View style={styles.detailDataRow}>
                <View style={styles.detailDataCol}>
                  <Text style={styles.dataLabel}>ESTADO DE GESTACIÓN</Text>
                  <Text style={styles.detailDataValue}>{viewingEvent.estado_gestacion || 'No aplica'}</Text>
                </View>
              </View>

              <View style={styles.detailDataRow}>
                <View style={styles.detailDataCol}>
                  <Text style={styles.dataLabel}>FECHA PROBABLE DE PARTO</Text>
                  <Text style={styles.detailDataValue}>{viewingEvent.fecha_probable_parto || '-'}</Text>
                </View>
                <View style={styles.detailDataCol}>
                  <Text style={styles.dataLabel}>CRÍAS NACIDAS</Text>
                  <Text style={styles.detailDataValue}>{viewingEvent.crias_nacidas !== null ? viewingEvent.crias_nacidas : '-'}</Text>
                </View>
              </View>

              <View style={styles.detailDataRow}>
                <View style={styles.detailDataCol}>
                  <Text style={styles.dataLabel}>NOTAS</Text>
                  <Text style={[styles.detailDataValue, { fontWeight: 'normal' }]}>{viewingEvent.notas || 'No hay notas adicionales.'}</Text>
                </View>
              </View>

              <View style={styles.detailActions}>
                <TouchableOpacity 
                  style={[styles.btnPrimary, { flex: 1 }]} 
                  onPress={() => {
                    setViewingEvent(null);
                    setEditingEvent(viewingEvent);
                    setModalVisible(true);
                  }}
                >
                  <MaterialIcons name="edit" size={20} color="#fff" />
                  <Text style={styles.btnPrimaryText}>Editar</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.btnSecondary, { flex: 1, borderColor: '#ba1a1a', backgroundColor: '#fff' }]} 
                  onPress={() => {
                    setViewingEvent(null);
                    confirmarEliminar(viewingEvent);
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
    marginBottom: 16,
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
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  btnSecondary: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#154212',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnSecondaryText: {
    color: '#154212',
    fontSize: 12,
    fontWeight: 'bold',
  },
  btnPrimary: {
    flex: 1,
    backgroundColor: '#154212',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  btnPrimaryText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
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
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 10,
    color: '#42493e',
    fontWeight: 'bold',
    flex: 1,
    marginRight: 8,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a1c19',
  },
  alertsContainer: {
    backgroundColor: '#ffdad6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#ba1a1a',
  },
  alertsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  alertsTitle: {
    color: '#ba1a1a',
    fontSize: 16,
    fontWeight: 'bold',
  },
  alertItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#ffdad6',
  },
  alertAnimalName: {
    fontWeight: 'bold',
    color: '#1a1c19',
    fontSize: 14,
  },
  alertDate: {
    fontSize: 12,
    color: '#5b5f5c',
    marginTop: 2,
  },
  alertDaysBadge: {
    backgroundColor: '#ba1a1a',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  alertDaysText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1c19',
    marginBottom: 12,
  },
  recordCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e3e3de',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  eventTypeBadge: {
    backgroundColor: '#e7ece6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  eventTypeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#154212',
  },
  cardBody: {
    marginBottom: 12,
  },
  animalMeta: {
    fontSize: 14,
    color: '#1a1c19',
    marginBottom: 4,
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
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f4f4ee',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 12,
    color: '#72796e',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: '#5b5f5c',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  actionBtn: {
    padding: 6,
    backgroundColor: '#e3e3de',
    borderRadius: 6,
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
    marginBottom: 15,
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
  dataLabel: {
    fontSize: 10,
    color: '#5b5f5c',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  dataValue: {
    fontSize: 14,
    color: '#1a1c19',
    fontWeight: '500',
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