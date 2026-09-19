import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useActiveFinca } from '../contexts/ActiveFincaContext';

export default function SetupFinca() {
  const router = useRouter();
  const [nombre, setNombre] = useState('');
  const [loading, setLoading] = useState(false);
  const { recargarFincas } = useActiveFinca();

  const handleCreateFinca = async () => {
    if (!nombre.trim()) {
      Alert.alert('Nombre requerido', 'Por favor, ingresa el nombre de tu finca.');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No hay sesión de usuario activa.');

      // Llamamos a la función segura de la base de datos
      const { data: fincaId, error: rpcError } = await supabase.rpc('crear_finca_y_miembro', {
        nombre_finca: nombre.trim(),
        nombre_usuario: user.user_metadata?.nombre_completo || 'Propietario / Administrador'
      });

      if (rpcError) throw rpcError;

      // 3. Recargar contexto
      await recargarFincas();
      
    } catch (error: any) {
      console.error(error);
      Alert.alert('Error', error.message || 'No se pudo crear la finca.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    // Navegamos primero
    router.replace('/(auth)/login');
    
    // Luego cerramos sesión
    setTimeout(async () => {
      try {
        await supabase.auth.signOut();
      } catch (err: any) {
        console.error(err);
      }
    }, 300);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <MaterialIcons name="landscape" size={64} color="#154212" />
        </View>
        <Text style={styles.title}>¡Bienvenido a AgroControl!</Text>
        <Text style={styles.subtitle}>
          Para comenzar, necesitas establecer un nombre para tu finca o rancho.
        </Text>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Nombre de tu Finca</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: Finca El Paraíso"
            value={nombre}
            onChangeText={setNombre}
            autoCapitalize="words"
          />
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#154212" style={{ marginTop: 20 }} />
        ) : (
          <TouchableOpacity style={styles.button} onPress={handleCreateFinca}>
            <Text style={styles.buttonText}>Comenzar</Text>
            <MaterialIcons name="arrow-forward" size={20} color="#ffffff" style={{ marginLeft: 8 }} />
          </TouchableOpacity>
        )}
        
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f0ea',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#e8f5e9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111111',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: '#5b5f5c',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 22,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 24,
  },
  label: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#424242',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 54,
    fontSize: 16,
    color: '#111111',
  },
  button: {
    width: '100%',
    height: 54,
    backgroundColor: '#154212',
    borderRadius: 27,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  logoutBtn: {
    marginTop: 30,
    padding: 10,
  },
  logoutText: {
    color: '#ba1a1a',
    fontSize: 14,
    fontWeight: '600',
  }
});
