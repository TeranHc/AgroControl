import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

export default function CambiarPasswordScreen() {
  const router = useRouter();
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [loading, setLoading] = useState(false);

  // Validaciones en tiempo real
  const coinciden = nueva !== '' && confirmar !== '' && nueva === confirmar;
  const errorConfirmar = confirmar !== '' && nueva !== confirmar;

  const handleChangePassword = async () => {
    if (!actual || !nueva || !confirmar) {
      Alert.alert('Campos incompletos', 'Por favor llena todos los campos.');
      return;
    }
    if (nueva.length < 6) {
      Alert.alert('Contraseña muy corta', 'La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (nueva !== confirmar) {
      Alert.alert('Error', 'Las nuevas contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !user.email) throw new Error('No hay sesión activa.');

      // 1. Verificar la contraseña actual intentando iniciar sesión
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: actual,
      });

      if (signInError) {
        throw new Error('La contraseña actual es incorrecta.');
      }

      // 2. Si es correcta, actualizamos la contraseña
      const { error: updateError } = await supabase.auth.updateUser({
        password: nueva
      });

      if (updateError) throw updateError;

      const doSignOut = async () => {
        router.replace('/(auth)/login');
        setTimeout(async () => {
          await supabase.auth.signOut();
        }, 300);
      };

      if (Platform.OS === 'web') {
        window.alert('Tu contraseña ha sido actualizada correctamente. Por seguridad, vuelve a iniciar sesión.');
        doSignOut();
      } else {
        Alert.alert(
          '¡Éxito!',
          'Tu contraseña ha sido actualizada correctamente. Por seguridad, vuelve a iniciar sesión.',
          [
            {
              text: 'Iniciar Sesión',
              onPress: doSignOut
            }
          ]
        );
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo actualizar la contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#154212" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cambiar Contraseña</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.label}>Contraseña Actual</Text>
          <TextInput
            style={styles.input}
            value={actual}
            onChangeText={setActual}
            secureTextEntry
            placeholder="Ingresa tu contraseña actual"
          />

          <Text style={styles.label}>Nueva Contraseña</Text>
          <TextInput
            style={styles.input}
            value={nueva}
            onChangeText={setNueva}
            secureTextEntry
            placeholder="Al menos 6 caracteres"
          />

          <Text style={styles.label}>Confirmar Nueva Contraseña</Text>
          <TextInput
            style={[styles.input, errorConfirmar ? styles.inputError : (coinciden ? styles.inputSuccess : null)]}
            value={confirmar}
            onChangeText={setConfirmar}
            secureTextEntry
            placeholder="Vuelve a escribir la nueva contraseña"
          />
          {errorConfirmar && (
            <Text style={styles.errorText}>Las contraseñas no coinciden</Text>
          )}
          {coinciden && (
            <Text style={styles.successText}>¡Las contraseñas coinciden!</Text>
          )}

          <TouchableOpacity
            style={[styles.btnSave, (!actual || !coinciden) && { opacity: 0.6 }]}
            onPress={handleChangePassword}
            disabled={loading || !actual || !coinciden}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnSaveText}>Actualizar Contraseña</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f4ee' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#ffffff',
    borderBottomWidth: 1, borderBottomColor: '#e3e3de',
  },
  headerBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f4f4ee', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#154212' },
  content: { padding: 16 },
  card: { backgroundColor: '#ffffff', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#e3e3de' },
  label: { fontSize: 12, fontWeight: '700', color: '#5b5f5c', textTransform: 'uppercase', marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#f4f4ee', borderWidth: 1, borderColor: '#c2c9bb', borderRadius: 8, paddingHorizontal: 14, height: 48, fontSize: 15, color: '#1a1c19' },
  inputError: { borderColor: '#ba1a1a', backgroundColor: '#ffdad6' },
  inputSuccess: { borderColor: '#154212', backgroundColor: '#e8f5e9' },
  errorText: { color: '#ba1a1a', fontSize: 12, marginTop: 4, fontWeight: '500' },
  successText: { color: '#154212', fontSize: 12, marginTop: 4, fontWeight: '500' },
  btnSave: { backgroundColor: '#154212', height: 48, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginTop: 24 },
  btnSaveText: { color: '#ffffff', fontSize: 15, fontWeight: 'bold' },
});
