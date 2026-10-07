# -*- coding: utf-8 -*-
import codecs

filepath = 'c:/Users/teran/Documents/App/AgroControlApp/agro-control/app/(tabs)/index.tsx'

with codecs.open(filepath, 'r', 'utf-8') as f:
    text = f.read()

# I will extract the top part and rewrite the JSX.
# It's safer to just replace the whole file from top to bottom since I have the whole content.

new_content = """import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, ActivityIndicator, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useActiveFinca } from '../../contexts/ActiveFincaContext';
import Header from '../../components/Header';
import AnimalForm from '../../components/forms/AnimalForm';
import PesajeForm from '../../components/forms/PesajeForm';
import { supabase } from '../../lib/supabase';
import { getDb } from '../../lib/database';

export default function DashboardScreen() {
  const { activeFinca, loading: loadingFincas } = useActiveFinca();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const [modalAnimalVisible, setModalAnimalVisible] = useState(false);
  const [modalPesajeVisible, setModalPesajeVisible] = useState(false);

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
      if (!activeFinca) return;

      const hoy = new Date().toISOString().split('T')[0];
      const db = await getDb();

      // Consultar las métricas de SQLite localmente
      const [totalRow, activosRow, machosRow, hembrasRow, gestacionesRow, alertasSaludRow] = await Promise.all([
        db.getFirstAsync<{count: number}>("SELECT COUNT(*) as count FROM animales WHERE finca_id = ? AND deleted_at IS NULL", [activeFinca.id]),
        db.getFirstAsync<{count: number}>("SELECT COUNT(*) as count FROM animales WHERE finca_id = ? AND estado = 'Activo' AND deleted_at IS NULL", [activeFinca.id]),
        db.getFirstAsync<{count: number}>("SELECT COUNT(*) as count FROM animales WHERE finca_id = ? AND genero = 'Macho' AND deleted_at IS NULL", [activeFinca.id]),
        db.getFirstAsync<{count: number}>("SELECT COUNT(*) as count FROM animales WHERE finca_id = ? AND genero = 'Hembra' AND deleted_at IS NULL", [activeFinca.id]),
        db.getFirstAsync<{count: number}>("SELECT COUNT(*) as count FROM reproduccion WHERE finca_id = ? AND estado_gestacion = 'Confirmada' AND deleted_at IS NULL", [activeFinca.id]),
        db.getFirstAsync<{count: number}>("SELECT COUNT(*) as count FROM registros_salud WHERE finca_id = ? AND proxima_dosis < ? AND deleted_at IS NULL", [activeFinca.id, hoy])
      ]);

      setStats({
        total: totalRow?.count || 0,
        activos: activosRow?.count || 0,
        machos: machosRow?.count || 0,
        hembras: hembrasRow?.count || 0,
        gestaciones: gestacionesRow?.count || 0,
        alertasSalud: alertasSaludRow?.count || 0
      });

    } catch (error) {
      console.error('Error cargando datos del dashboard:', error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (activeFinca) {
      fetchDashboardData();
    } else {
      setLoading(false);
    }
  }, [activeFinca]);

  useEffect(() => {
    if (!loadingFincas) {
      fetchDashboardData();
    }
  }, [activeFinca, loadingFincas]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-[#f4f4ee]">
        <ActivityIndicator size="large" color="#154212" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#f4f4ee]" edges={['top', 'left', 'right']}>
      <Header title="Inicio" />
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#154212" />
        }
      >
        <View className="mb-[20px]">
          <Text className="text-[14px] text-[#5b5f5c]">Bienvenido a</Text>
          <Text className="text-[24px] font-bold text-[#154212] mt-[4px]">{activeFinca ? activeFinca.nombre : ''}</Text>
        </View>

        {/* Cuadrícula de Estadísticas */}
        <View className="flex-row flex-wrap justify-between">
          {/* Total Animales */}
          <View className="w-[48%] bg-white rounded-xl p-4 mb-4 border-l-4 border-[#154212] shadow-sm elevation-2">
            <Text className="text-[10px] font-bold text-[#5b5f5c] mb-2 uppercase">TOTAL ANIMALES</Text>
            <View className="flex-row justify-between items-end">
              <Text className="text-2xl font-bold text-[#1a1c19]">{stats.total}</Text>
              <MaterialIcons name="pets" size={24} color="#154212" />
            </View>
          </View>

          {/* Activos */}
          <View className="w-[48%] bg-white rounded-xl p-4 mb-4 border-l-4 border-[#154212] shadow-sm elevation-2">
            <Text className="text-[10px] font-bold text-[#5b5f5c] mb-2 uppercase">ACTIVOS</Text>
            <View className="flex-row justify-between items-end">
              <Text className="text-2xl font-bold text-[#1a1c19]">{stats.activos}</Text>
              <MaterialCommunityIcons name="heart-pulse" size={24} color="#154212" />
            </View>
          </View>

          {/* Macho / Hembra */}
          <View className="w-[48%] bg-white rounded-xl p-4 mb-4 border-l-4 border-[#5b5f5c] shadow-sm elevation-2">
            <Text className="text-[10px] font-bold text-[#5b5f5c] mb-2 uppercase">MACHO / HEMBRA</Text>
            <View className="flex-row justify-between items-end">
              <View className="items-start">
                <Text className="text-[12px] text-[#5b5f5c]">M</Text>
                <Text className="text-lg font-bold text-[#1a1c19]">{stats.machos}</Text>
              </View>
              <View className="items-start ml-4">
                <Text className="text-[12px] text-[#5b5f5c]">H</Text>
                <Text className="text-lg font-bold text-[#1a1c19]">{stats.hembras}</Text>
              </View>
            </View>
          </View>

          {/* Gestaciones */}
          <View className="w-[48%] bg-white rounded-xl p-4 mb-4 border-l-4 border-[#eab308] shadow-sm elevation-2">
            <Text className="text-[10px] font-bold text-[#5b5f5c] mb-2 uppercase">GESTACIONES</Text>
            <View className="flex-row justify-between items-end">
              <Text className="text-2xl font-bold text-[#1a1c19]">{stats.gestaciones}</Text>
              <View className="bg-[#fef9c3] px-2 py-0.5 rounded-xl mb-1">
                <Text className="text-[#a16207] text-[12px] font-semibold">Activas</Text>
              </View>
            </View>
          </View>

          {/* Dosis Atrasadas (Abarca todo el ancho) */}
          <View className="w-full bg-white rounded-xl p-4 mb-4 border-l-4 border-[#ba1a1a] flex-row justify-between items-center shadow-sm elevation-2">
            <View>
              <Text className="text-[10px] font-bold text-[#5b5f5c] mb-2 uppercase">DOSIS ATRASADAS</Text>
              <View className="flex-row justify-start items-center gap-2.5">
                <Text className="text-2xl font-bold text-[#ba1a1a]">{stats.alertasSalud}</Text>
                <View className="bg-[#ffdad6] px-2 py-0.5 rounded-xl">
                  <Text className="text-[#ba1a1a] text-[12px] font-semibold">Requiere Atención</Text>
                </View>
              </View>
            </View>
            <MaterialIcons name="priority-high" size={28} color="#ba1a1a" />
          </View>
        </View>

        {/* Acciones Rápidas */}
        <Text className="text-lg font-bold text-[#1a1c19] mt-2 mb-4">Acciones Rápidas</Text>
        <View className="gap-3">
          <TouchableOpacity className="bg-[#154212] flex-row items-center justify-center py-3.5 rounded-lg gap-2" onPress={() => setModalAnimalVisible(true)}>
            <MaterialIcons name="add-circle" size={20} color="#ffffff" />
            <Text className="text-white text-[12px] font-bold tracking-wider">REGISTRAR ANIMAL</Text>
          </TouchableOpacity>
          <TouchableOpacity className="bg-white flex-row items-center justify-center py-3.5 rounded-lg border border-[#154212] gap-2" onPress={() => setModalPesajeVisible(true)}>
            <MaterialIcons name="monitor-weight" size={20} color="#154212" />
            <Text className="text-[#154212] text-[12px] font-bold tracking-wider">NUEVO PESAJE</Text>
          </TouchableOpacity>
          <TouchableOpacity className="bg-white flex-row items-center justify-center py-3.5 rounded-lg border border-[#154212] gap-2" onPress={() => Alert.alert('Próximamente', 'Módulo de escáner en desarrollo.')}>
            <MaterialIcons name="qr-code-scanner" size={20} color="#154212" />
            <Text className="text-[#154212] text-[12px] font-bold tracking-wider">ESCANEAR QR</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modales */}
      <Modal statusBarTranslucent visible={modalAnimalVisible} animationType="slide" onRequestClose={() => setModalAnimalVisible(false)}>
        <AnimalForm 
          onClose={() => setModalAnimalVisible(false)} 
          onSuccess={() => { setModalAnimalVisible(false); fetchDashboardData(); }} 
        />
      </Modal>

      <Modal statusBarTranslucent visible={modalPesajeVisible} animationType="slide" onRequestClose={() => setModalPesajeVisible(false)}>
        <PesajeForm 
          onClose={() => setModalPesajeVisible(false)} 
          onSuccess={() => { setModalPesajeVisible(false); fetchDashboardData(); }} 
        />
      </Modal>
    </SafeAreaView>
  );
}
"""

with codecs.open(filepath, 'w', 'utf-8') as f:
    f.write(new_content)

print("Dashboard migrated to NativeWind.")
