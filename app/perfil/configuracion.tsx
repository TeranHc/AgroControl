import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

export default function ConfiguracionScreen() {
  const router = useRouter();
  const [notificaciones, setNotificaciones] = React.useState(true);

  const handleCerrarSesion = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro de que deseas salir de tu cuenta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar Sesión',
          style: 'destructive',
          onPress: async () => {
            await supabase.auth.signOut();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#154212" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Configuración</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Preferencias */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Preferencias de la Aplicación</Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Alertas y Notificaciones</Text>
              <Text style={styles.settingSub}>Recordatorios de partos y vacunas</Text>
            </View>
            <Switch
              value={notificaciones}
              onValueChange={setNotificaciones}
              trackColor={{ false: '#e3e3de', true: '#a1d494' }}
              thumbColor={notificaciones ? '#154212' : '#f4f4ee'}
            />
          </View>
        </View>

        {/* Accesos de Perfil */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Accesos Rápidos</Text>

          <TouchableOpacity 
            style={styles.actionRow} 
            onPress={() => router.push('/perfil/personal')}
          >
            <View style={styles.actionLeft}>
              <MaterialIcons name="person-outline" size={22} color="#154212" />
              <Text style={styles.actionText}>Editar Información Personal</Text>
            </View>
            <MaterialIcons name="chevron-right" size={22} color="#72796e" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity 
            style={styles.actionRow} 
            onPress={() => router.push('/perfil/finca')}
          >
            <View style={styles.actionLeft}>
              <MaterialIcons name="agriculture" size={22} color="#154212" />
              <Text style={styles.actionText}>Detalles y Administración de Finca</Text>
            </View>
            <MaterialIcons name="chevron-right" size={22} color="#72796e" />
          </TouchableOpacity>
        </View>

        {/* Información del Sistema */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Acerca de</Text>

          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>Plataforma</Text>
            <Text style={styles.aboutValue}>AgroControl Móvil</Text>
          </View>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>Versión</Text>
            <Text style={styles.aboutValue}>1.0.0</Text>
          </View>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>Base de Datos</Text>
            <Text style={styles.aboutValue}>Supabase PostgreSQL Cloud</Text>
          </View>
        </View>

        {/* Cerrar Sesión */}
        <TouchableOpacity style={styles.btnLogout} onPress={handleCerrarSesion}>
          <MaterialIcons name="logout" size={20} color="#ba1a1a" />
          <Text style={styles.btnLogoutText}>CERRAR SESIÓN</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f4ee' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e3e3de',
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f4f4ee',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#154212' },
  scrollContent: { padding: 16, gap: 16 },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e3e3de',
  },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#154212', marginBottom: 14 },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  settingInfo: { flex: 1, marginRight: 12 },
  settingLabel: { fontSize: 15, fontWeight: '600', color: '#1a1c19' },
  settingSub: { fontSize: 12, color: '#5b5f5c', marginTop: 2 },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  actionLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  actionText: { fontSize: 14, fontWeight: '600', color: '#1a1c19' },
  divider: { height: 1, backgroundColor: '#f0f0ea', marginVertical: 10 },
  aboutRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  aboutLabel: { fontSize: 13, color: '#5b5f5c' },
  aboutValue: { fontSize: 13, fontWeight: '600', color: '#1a1c19' },
  btnLogout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#ba1a1a',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  btnLogoutText: { color: '#ba1a1a', fontSize: 13, fontWeight: 'bold', letterSpacing: 0.5 },
});
