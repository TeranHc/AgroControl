import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

export default function CompletarPerfilScreen() {
  const router = useRouter();
  const [telefono, setTelefono] = useState('');
  const [nacionalidad, setNacionalidad] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGuardar = async () => {
    if (!telefono.trim() || !nacionalidad.trim()) {
      Alert.alert('Campos incompletos', 'Por favor llena todos los campos.');
      return;
    }

    setLoading(true);
    try {
      // Actualizamos los metadatos del usuario en Auth
      const { error } = await supabase.auth.updateUser({
        data: {
          phone: telefono.trim(),
          nacionalidad: nacionalidad.trim(),
        }
      });

      if (error) throw error;
      
      // Listo, redirigir a (tabs) que a su vez enviará a SetupFinca si no tiene finca
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo guardar la información.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, padding: 24, justifyContent: "center" }}>
        
        <View style={styles.header}>
          <FontAwesome5 name="tractor" size={42} color="#154212" />
          <Text style={styles.title}>Casi listos...</Text>
          <Text style={styles.subtitle}>
            Como iniciaste sesión con Google, necesitamos un par de datos adicionales para tu perfil.
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Teléfono *</Text>
          <View style={styles.inputContainer}>
            <MaterialCommunityIcons name="phone-outline" size={20} color="#6b7280" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Ej: +593 99 999 9999"
              placeholderTextColor="#9ca3af"
              keyboardType="phone-pad"
              value={telefono}
              onChangeText={setTelefono}
            />
          </View>

          <Text style={styles.label}>Nacionalidad *</Text>
          <View style={styles.inputContainer}>
            <MaterialIcons name="public" size={20} color="#6b7280" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Ej: Ecuatoriana"
              placeholderTextColor="#9ca3af"
              autoCapitalize="words"
              value={nacionalidad}
              onChangeText={setNacionalidad}
            />
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#1b4d1b" style={{ marginTop: 20 }} />
          ) : (
            <>
              <TouchableOpacity style={styles.button} onPress={handleGuardar} activeOpacity={0.85}>
                <Text style={styles.buttonText}>Continuar</Text>
                <MaterialIcons name="arrow-forward" size={20} color="#fff" style={{ marginLeft: 8 }} />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={async () => {
                  await supabase.auth.signOut();
                  router.replace('/(auth)/login');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancelar y volver al inicio</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f0ea' },
  header: { alignItems: 'center', marginBottom: 30 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#154212', marginTop: 16, marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#5b5f5c', textAlign: 'center', lineHeight: 22 },
  form: { width: '100%' },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, marginBottom: 20, paddingHorizontal: 14, height: 54 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 16, color: '#111827' },
  button: { backgroundColor: '#154212', height: 54, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  cancelButton: { marginTop: 20, alignItems: 'center' },
  cancelButtonText: { color: '#ba1a1a', fontSize: 14, fontWeight: '600' }
});
