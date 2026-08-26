import React, { useEffect, useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  FlatList, 
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

// Tipo de dato combinando Reproducción con datos del Animal (Hembra y Macho)
type RegistroReproduccion = {
  id: string;
  tipo_evento: string;
  fecha_evento: string;
  estado_gestacion: string | null;
  fecha_probable_parto: string | null;
  hembra: {
    nombre: string;
    codigo_animal: string;
  } | null;
  macho: {
    codigo_animal: string;
  } | null;
};

export default function ReproduccionScreen() {
  const [registros, setRegistros] = useState<RegistroReproduccion[]>([]);
  const [alertasParto, setAlertasParto] = useState<RegistroReproduccion[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Estadísticas calculadas localmente
  const [stats, setStats] = useState({
    gestacionesActivas: 0,
    partosEsperados30d: 0,
    partosYTD: 0,
  });

  const fetchReproduccion = async () => {
    try {
      // Hacemos JOIN con la tabla animales dos veces (para hembra y macho)
      const { data, error } = await supabase
        .from('reproduccion')
        .select(`
          id,
          tipo_evento,
          fecha_evento,
          estado_gestacion,
          fecha_probable_parto,
          hembra:animales!animal_id ( nombre, codigo_animal ),
          macho:animales!macho_id ( codigo_animal )
        `)
        .order('fecha_evento', { ascending: false });

      if (error) throw error;

      if (data) {
        // @ts-ignore
        const records: RegistroReproduccion[] = data;
        setRegistros(records);
        calcularEstadisticas(records);
      }
    } catch (error) {
      console.error('Error obteniendo registros de reproducción:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const calcularEstadisticas = (records: RegistroReproduccion[]) => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    const limite30Dias = new Date();
    limite30Dias.setDate(hoy.getDate() + 30);

    let gestacionesActivas = 0;
    let partosEsperados30d = 0;
    let partosYTD = 0;
    let alertas: RegistroReproduccion[] = [];

    records.forEach(r => {
      // Gestaciones Activas
      if (r.estado_gestacion?.toLowerCase() === 'confirmada') {
        gestacionesActivas++;
      }

      // Partos Registrados este año (Year-to-Date)
      const fechaEvento = new Date(r.fecha_evento);
      if (r.tipo_evento?.toLowerCase() === 'parto' && fechaEvento.getFullYear() === hoy.getFullYear()) {
        partosYTD++;
      }

      // Próximos Partos (Alertas y métricas a 30 días)
      if (r.fecha_probable_parto) {
        const fechaParto = new Date(r.fecha_probable_parto);
        if (fechaParto >= hoy && fechaParto <= limite30Dias) {
          partosEsperados30d++;
          alertas.push(r);
        }
      }
    });

    // Ordenar alertas por fecha más próxima
    alertas.sort((a, b) => new Date(a.fecha_probable_parto!).getTime() - new Date(b.fecha_probable_parto!).getTime());

    setAlertasParto(alertas);
    setStats({ gestacionesActivas, partosEsperados30d, partosYTD });
  };

  useEffect(() => {
    fetchReproduccion();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchReproduccion();
  };

  const getStatusColor = (status: string | null) => {
    switch (status?.toLowerCase()) {
      case 'confirmada': return { bg: '#e8f5e9', text: '#2e7d32' };
      case 'vacía': return { bg: '#ffebee', text: '#c62828' };
      case 'pendiente': return { bg: '#e3e3de', text: '#42493e' };
      default: return { bg: '#e8f5e9', text: '#2e7d32' }; // Color por defecto para partos/inseminaciones exitosas
    }
  };

  // Renderiza cada registro en la lista del historial
  const renderItem = ({ item }: { item: RegistroReproduccion }) => {
    const statusStyle = getStatusColor(item.estado_gestacion || 'Exitoso'); // Mock de status si no aplica
    
    return (
      <View style={styles.recordCard}>
        <View style={styles.recordInfo}>
          <Text style={styles.recordAnimalId}>{item.hembra?.codigo_animal || 'N/A'}</Text>
          <Text style={styles.recordType}>{item.tipo_evento}</Text>
          <Text style={styles.recordDate}>{item.fecha_evento}</Text>
          {item.macho?.codigo_animal && (
            <Text style={styles.recordMale}>Macho: {item.macho.codigo_animal}</Text>
          )}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
          <Text style={[styles.statusText, { color: statusStyle.text }]}>
            {item.estado_gestacion || 'Completado'}
          </Text>
        </View>
      </View>
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
      {/* Título y Botones */}
      <View style={styles.topRow}>
        <View>
          <Text style={styles.pageTitle}>Reproducción</Text>
          <Text style={styles.pageSubtitle}>Ciclos actuales y eventos esperados.</Text>
        </View>
      </View>
      
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.btnSecondary}>
          <Text style={styles.btnSecondaryText}>REGISTRAR EVENTO</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnPrimary}>
          <Text style={styles.btnPrimaryText}>NUEVA GESTACIÓN</Text>
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

        <View style={[styles.statBox, { borderLeftColor: '#4a5157' }]}>
          <View style={styles.statHeader}>
            <Text style={styles.statLabel}>PARTOS (30 DÍAS)</Text>
            <MaterialIcons name="calendar-month" size={18} color="#4a5157" />
          </View>
          <Text style={styles.statValue}>{stats.partosEsperados30d}</Text>
        </View>

        <View style={[styles.statBox, { borderLeftColor: '#72796e', width: '100%' }]}>
          <View style={styles.statHeader}>
            <Text style={styles.statLabel}>NACIMIENTOS REGISTRADOS (AÑO)</Text>
            <MaterialIcons name="child-care" size={18} color="#72796e" />
          </View>
          <Text style={styles.statValue}>{stats.partosYTD}</Text>
        </View>
      </View>

      {/* Alertas */}
      {renderAlerts()}

      <Text style={styles.sectionTitle}>Historial Reciente</Text>
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
          data={registros}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListHeaderComponent={renderHeader}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e3e3de',
  },
  recordInfo: {
    flex: 1,
  },
  recordAnimalId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1c19',
  },
  recordType: {
    fontSize: 14,
    color: '#154212',
    marginTop: 2,
  },
  recordDate: {
    fontSize: 12,
    color: '#5b5f5c',
    marginTop: 4,
  },
  recordMale: {
    fontSize: 12,
    color: '#4a5157',
    marginTop: 2,
    fontStyle: 'italic',
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
    marginTop: 40,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: '#5b5f5c',
  }
});