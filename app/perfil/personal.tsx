import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

export default function PersonalScreen() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const [miembroId, setMiembroId] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [rol, setRol] = useState('Viewer');

  const [nombreCompleto, setNombreCompleto] = useState('');
  const [telefono, setTelefono] = useState('');
  const [nacionalidad, setNacionalidad] = useState('');

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.replace('/(auth)/login');
          return;
        }

        setEmail(user.email || '');

        const { data: miembro, error } = await supabase
          .from('miembros_finca')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;

        if (miembro) {
          setMiembroId(miembro.id);
          setNombreCompleto(miembro.nombre_completo || '');
          setTelefono(miembro.telefono || '');
          setNacionalidad(miembro.nacionalidad || '');
          setRol(miembro.rol || 'Viewer');
        }
      } catch (err: any) {
        console.error('Error cargando datos personales:', err);
        Alert.alert('Error', 'No se pudieron obtener tus datos.');
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, []);

  const handleGuardar = async () => {
    if (!nombreCompleto.trim()) {
      Alert.alert('Campo obligatorio', 'Por favor ingresa tu nombre completo.');
      return;
    }

    if (!miembroId) {
      Alert.alert('Aviso', 'Aún no estás asignado a ninguna finca como miembro.');
      return;
    }

    setGuardando(true);
    try {
      const { error } = await supabase
        .from('miembros_finca')
        .update({
          nombre_completo: nombreCompleto.trim(),
          telefono: telefono.trim() || null,
          nacionalidad: nacionalidad.trim() || null,
        })
        .eq('id', miembroId);

      if (error) throw error;

      Alert.alert('¡Éxito!', 'Tus datos han sido actualizados correctamente.', [
        { text: 'Aceptar', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      console.error('Error guardando datos:', err);
      Alert.alert('Error', err.message || 'Ocurrió un problema al guardar.');
    } finally {
      setGuardando(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#154212" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#154212" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Editar Datos Personales</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.card}>
            <View style={styles.sectionTitleRow}>
              <MaterialIcons name="badge" size={22} color="#154212" />
              <Text style={styles.cardTitle}>Información de Perfil</Text>
            </View>

            {/* Email (Solo lectura) */}
            <Text style={styles.label}>Correo Electrónico (Cuenta)</Text>
            <View style={styles.readOnlyBox}>
              <MaterialCommunityIcons name="email-outline" size={18} color="#72796e" />
              <Text style={styles.readOnlyText}>{email}</Text>
            </View>

            {/* Rol (Solo lectura) */}
            <Text style={styles.label}>Rol en la Finca</Text>
            <View style={styles.readOnlyBox}>
              <MaterialIcons name="verified-user" size={18} color="#72796e" />
              <Text style={styles.readOnlyText}>{rol}</Text>
            </View>

            {/* Nombre Completo */}
            <Text style={styles.label}>Nombre Completo *</Text>
            <TextInput
              style={styles.input}
              value={nombreCompleto}
              onChangeText={setNombreCompleto}
              placeholder="Ej: Manuel Terán"
            />

            {/* Teléfono */}
            <Text style={styles.label}>Teléfono de Contacto</Text>
            <TextInput
              style={styles.input}
              value={telefono}
              onChangeText={setTelefono}
              placeholder="Ej: +593 99 123 4567"
              keyboardType="phone-pad"
            />

            {/* Nacionalidad */}
            <Text style={styles.label}>Nacionalidad</Text>
            <TextInput
              style={styles.input}
              value={nacionalidad}
              onChangeText={setNacionalidad}
              placeholder="Ej: Ecuatoriana"
            />
          </View>

          {/* Botones de acción */}
          <View style={styles.actionsRow}>
            <TouchableOpacity 
              style={styles.btnCancel} 
              onPress={() => router.back()}
              disabled={guardando}
            >
              <Text style={styles.btnCancelText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.btnSave} 
              onPress={handleGuardar}
              disabled={guardando}
            >
              {guardando ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <MaterialIcons name="save" size={18} color="#fff" />
                  <Text style={styles.btnSaveText}>Guardar Cambios</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f4ee' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f4f4ee' },
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
  scrollContent: { padding: 16 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e3e3de',
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#2d5a27',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  cardTitle: { fontSize: 17, fontWeight: 'bold', color: '#154212' },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#42493e',
    textTransform: 'uppercase',
    marginBottom: 6,
    marginTop: 12,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#f4f4ee',
    borderWidth: 1,
    borderColor: '#c2c9bb',
    borderRadius: 8,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 14,
    color: '#1a1c19',
  },
  readOnlyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8e8e3',
    borderRadius: 8,
    paddingHorizontal: 14,
    height: 46,
    gap: 8,
  },
  readOnlyText: { fontSize: 14, color: '#5b5f5c', fontWeight: '500' },
  actionsRow: { flexDirection: 'row', gap: 12 },
  btnCancel: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#154212',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  btnCancelText: { color: '#154212', fontSize: 14, fontWeight: 'bold' },
  btnSave: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#154212',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  btnSaveText: { color: '#ffffff', fontSize: 14, fontWeight: 'bold' },
});
