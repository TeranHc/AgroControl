import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

export default function HomeScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fincaName, setFincaName] = useState('Mi Finca');
  
  const [stats, setStats] = useState({
    total: 0,
    activos: 0,
    machos: 0,
    hembras: 0,
    gestaciones: 0,
    alertasSalud: 0
  });

  const fetchDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Obtener el nombre real de la finca del usuario
      const { data: miembro } = await supabase
        .from('miembros_finca')
        .select('fincas(nombre)')
        .eq('user_id', user.id)
        .single();

      if (miembro && miembro.fincas) {
        // @ts-ignore
        setFincaName(miembro.fincas.nombre);
      }

      const hoy = new Date().toISOString().split('T')[0];

      // 2. Consultar las métricas de todas las tablas en paralelo
      const [
        { count: total },
        { count: activos },
        { count: machos },
        { count: hembras },
        { count: gestaciones },
        { count: alertasSalud }
      ] = await Promise.all([
        supabase.from('animales').select('*', { count: 'exact', head: true }),
        supabase.from('animales').select('*', { count: 'exact', head: true }).eq('estado', 'Activo'),
        supabase.from('animales').select('*', { count: 'exact', head: true }).eq('genero', 'Macho'),
        supabase.from('animales').select('*', { count: 'exact', head: true }).eq('genero', 'Hembra'),
        supabase.from('reproduccion').select('*', { count: 'exact', head: true }).eq('estado_gestacion', 'Confirmada'),
        supabase.from('registros_salud').select('*', { count: 'exact', head: true }).lt('proxima_dosis', hoy)
      ]);

      setStats({
        total: total || 0,
        activos: activos || 0,
        machos: machos || 0,
        hembras: hembras || 0,
        gestaciones: gestaciones || 0,
        alertasSalud: alertasSalud || 0
      });
    } catch (error) {
      console.error('Error cargando el dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#154212" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#154212" />
        }
      >
        {/* Encabezado */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Panel Principal</Text>
            <Text style={styles.fincaName}>{fincaName}</Text>
          </View>
          <TouchableOpacity style={styles.profileBtn}>
            <MaterialIcons name="person" size={24} color="#154212" />
          </TouchableOpacity>
        </View>

        {/* Cuadrícula de Estadísticas */}
        <View style={styles.statsGrid}>
          {/* Total Animales */}
          <View style={[styles.statCard, { borderLeftColor: '#154212' }]}>
            <Text style={styles.statLabel}>TOTAL ANIMALES</Text>
            <View style={styles.statRow}>
              <Text style={styles.statValue}>{stats.total}</Text>
              <MaterialIcons name="pets" size={24} color="#154212" />
            </View>
          </View>

          {/* Activos */}
          <View style={[styles.statCard, { borderLeftColor: '#154212' }]}>
            <Text style={styles.statLabel}>ACTIVOS</Text>
            <View style={styles.statRow}>
              <Text style={styles.statValue}>{stats.activos}</Text>
              <MaterialCommunityIcons name="heart-pulse" size={24} color="#154212" />
            </View>
          </View>

          {/* Macho / Hembra */}
          <View style={[styles.statCard, { borderLeftColor: '#5b5f5c' }]}>
            <Text style={styles.statLabel}>MACHO / HEMBRA</Text>
            <View style={styles.statRow}>
              <View style={styles.genderBox}>
                <Text style={styles.genderLabel}>M</Text>
                <Text style={styles.genderValue}>{stats.machos}</Text>
              </View>
              <View style={[styles.genderBox, { marginLeft: 16 }]}>
                <Text style={styles.genderLabel}>H</Text>
                <Text style={styles.genderValue}>{stats.hembras}</Text>
              </View>
            </View>
          </View>

          {/* Gestaciones */}
          <View style={[styles.statCard, { borderLeftColor: '#eab308' }]}>
            <Text style={styles.statLabel}>GESTACIONES</Text>
            <View style={styles.statRow}>
              <Text style={styles.statValue}>{stats.gestaciones}</Text>
              <View style={styles.badgeYellow}>
                <Text style={styles.badgeTextYellow}>Activas</Text>
              </View>
            </View>
          </View>

          {/* Dosis Atrasadas (Abarca todo el ancho) */}
          <View style={[styles.statCard, { width: '100%', borderLeftColor: '#ba1a1a', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
            <View>
              <Text style={styles.statLabel}>DOSIS ATRASADAS</Text>
              <View style={[styles.statRow, { justifyContent: 'flex-start', gap: 10 }]}>
                <Text style={[styles.statValue, { color: '#ba1a1a' }]}>{stats.alertasSalud}</Text>
                <View style={styles.badgeRed}>
                  <Text style={styles.badgeTextRed}>Requiere Atención</Text>
                </View>
              </View>
            </View>
            <MaterialIcons name="priority-high" size={28} color="#ba1a1a" />
          </View>
        </View>

        {/* Acciones Rápidas */}
        <Text style={styles.sectionTitle}>Acciones Rápidas</Text>
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.actionBtnPrimary}>
            <MaterialIcons name="add-circle" size={20} color="#ffffff" />
            <Text style={styles.actionBtnPrimaryText}>REGISTRAR ANIMAL</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtnSecondary}>
            <MaterialIcons name="monitor-weight" size={20} color="#154212" />
            <Text style={styles.actionBtnSecondaryText}>NUEVO PESAJE</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtnSecondary}>
            <MaterialIcons name="qr-code-scanner" size={20} color="#154212" />
            <Text style={styles.actionBtnSecondaryText}>ESCANEAR QR</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f4ee' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f4f4ee' },
  scrollContent: { padding: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  greeting: { fontSize: 14, color: '#5b5f5c' },
  fincaName: { fontSize: 24, fontWeight: 'bold', color: '#154212', marginTop: 4 },
  profileBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#e3e3de', justifyContent: 'center', alignItems: 'center' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  statCard: {
    width: '48%', backgroundColor: '#ffffff', borderRadius: 12, padding: 16, marginBottom: 16,
    borderLeftWidth: 4, shadowColor: '#2d5a27', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2
  },
  statLabel: { fontSize: 10, fontWeight: '700', color: '#5b5f5c', marginBottom: 8, textTransform: 'uppercase' },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  statValue: { fontSize: 24, fontWeight: 'bold', color: '#1a1c19' },
  genderBox: { alignItems: 'flex-start' },
  genderLabel: { fontSize: 12, color: '#5b5f5c' },
  genderValue: { fontSize: 18, fontWeight: 'bold', color: '#1a1c19' },
  badgeYellow: { backgroundColor: '#fef9c3', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, marginBottom: 4 },
  badgeTextYellow: { color: '#a16207', fontSize: 12, fontWeight: '600' },
  badgeRed: { backgroundColor: '#ffdad6', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  badgeTextRed: { color: '#ba1a1a', fontSize: 12, fontWeight: '600' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a1c19', marginTop: 8, marginBottom: 16 },
  actionsContainer: { gap: 12 },
  actionBtnPrimary: {
    backgroundColor: '#154212', flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', paddingVertical: 14, borderRadius: 8, gap: 8
  },
  actionBtnPrimaryText: { color: '#ffffff', fontSize: 12, fontWeight: 'bold', letterSpacing: 0.5 },
  actionBtnSecondary: {
    backgroundColor: '#ffffff', flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', paddingVertical: 14, borderRadius: 8,
    borderWidth: 1, borderColor: '#154212', gap: 8
  },
  actionBtnSecondaryText: { color: '#154212', fontSize: 12, fontWeight: 'bold', letterSpacing: 0.5 }
});