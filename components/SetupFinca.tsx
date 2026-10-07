import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useActiveFinca } from '../contexts/ActiveFincaContext';

type SetupFincaProps = {
  fromProfile?: boolean;
};

export default function SetupFinca({ fromProfile = false }: SetupFincaProps) {
  const router = useRouter();
  const [mode, setMode] = useState<'select' | 'create' | 'join'>('select');
  
  const [nombre, setNombre] = useState('');
  const [codigo, setCodigo] = useState('');
  const [loading, setLoading] = useState(false);
  const { recargarFincas } = useActiveFinca();

  const handleCreateFinca = async () => {
    if (!nombre.trim()) {
      Alert.alert('Nombre requerido', 'Por favor, ingresa el nombre de tu finca.');
      return;
    }
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) throw new Error('No hay sesión de usuario activa.');

      const { data: fincaId, error: rpcError } = await supabase.rpc('crear_finca_y_miembro', {
        nombre_finca: nombre.trim(),
        nombre_usuario: user.user_metadata?.full_name || user.user_metadata?.nombre_completo || 'Propietario / Administrador'
      });

      if (rpcError) throw rpcError;

      if (user.user_metadata?.phone || user.user_metadata?.nacionalidad) {
        await supabase.from('miembros_finca')
          .update({
            telefono: user.user_metadata?.phone || null,
            nacionalidad: user.user_metadata?.nacionalidad || null
          })
          .eq('finca_id', fincaId)
          .eq('user_id', user.id);
      }

      await recargarFincas();
      if (fromProfile && router.canGoBack()) {
        router.back();
      }
    } catch (error: any) {
      console.error(error);
      Alert.alert('Error', error.message || 'No se pudo crear la finca.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinFinca = async () => {
    if (!codigo.trim() || codigo.trim().length !== 6) {
      Alert.alert('Código inválido', 'Por favor ingresa un código válido de 6 caracteres.');
      return;
    }
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) throw new Error('No hay sesión de usuario activa.');

      const nombreTrabajador = user.user_metadata?.full_name || user.user_metadata?.nombre_completo || 'Miembro del Equipo';
      const telefonoTrabajador = user.user_metadata?.phone || null;
      const nacionalidadTrabajador = user.user_metadata?.nacionalidad || null;

      const { data, error } = await supabase.rpc('unirse_a_finca', {
        codigo_ingresado: codigo.trim(),
        nombre_trabajador: nombreTrabajador,
        telefono_trabajador: telefonoTrabajador,
        nacionalidad_trabajador: nacionalidadTrabajador
      });

      if (error) throw error;

      Alert.alert('¡Éxito!', 'Te has unido a la finca correctamente.');
      await recargarFincas();
      if (fromProfile && router.canGoBack()) {
        router.back();
      }
    } catch (error: any) {
      console.error(error);
      Alert.alert('Error', error.message || 'El código de invitación es inválido o ha expirado.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    router.replace('/(auth)/login');
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
        
        {mode === 'select' && (
          <>
            <View style={styles.iconContainer}>
              <MaterialIcons name="handshake" size={64} color="#154212" />
            </View>
            <Text style={styles.title}>¡Bienvenido a AgroControl!</Text>
            <Text style={styles.subtitle}>
              ¿Eres propietario de una finca o has sido invitado a trabajar en una?
            </Text>

            <TouchableOpacity style={styles.optionCard} onPress={() => setMode('create')} activeOpacity={0.8}>
              <View style={[styles.optionIcon, { backgroundColor: '#e8f5e9' }]}>
                <MaterialIcons name="add-business" size={28} color="#154212" />
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={styles.optionTitle}>Crear nueva Finca</Text>
                <Text style={styles.optionDesc}>Inicia tu propia finca como propietario</Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color="#9ca3af" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.optionCard} onPress={() => setMode('join')} activeOpacity={0.8}>
              <View style={[styles.optionIcon, { backgroundColor: '#e3f2fd' }]}>
                <MaterialIcons name="group-add" size={28} color="#0277bd" />
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={styles.optionTitle}>Unirse a una Finca</Text>
                <Text style={styles.optionDesc}>Tengo un código de invitación de 6 dígitos</Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color="#9ca3af" />
            </TouchableOpacity>
          </>
        )}

        {mode === 'create' && (
          <>
            <TouchableOpacity style={styles.backBtn} onPress={() => setMode('select')}>
              <MaterialIcons name="arrow-back" size={24} color="#5b5f5c" />
            </TouchableOpacity>
            
            <View style={styles.iconContainer}>
              <MaterialIcons name="landscape" size={64} color="#154212" />
            </View>
            <Text style={styles.title}>Crear Finca</Text>
            <Text style={styles.subtitle}>Establece un nombre para tu finca o rancho.</Text>

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
          </>
        )}

        {mode === 'join' && (
          <>
            <TouchableOpacity style={styles.backBtn} onPress={() => setMode('select')}>
              <MaterialIcons name="arrow-back" size={24} color="#5b5f5c" />
            </TouchableOpacity>
            
            <View style={[styles.iconContainer, { backgroundColor: '#e3f2fd' }]}>
              <MaterialIcons name="group-add" size={64} color="#0277bd" />
            </View>
            <Text style={styles.title}>Unirse a Finca</Text>
            <Text style={styles.subtitle}>Ingresa el código de 6 dígitos que te dio el administrador.</Text>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Código de Invitación</Text>
              <TextInput
                style={[styles.input, { textTransform: 'uppercase', textAlign: 'center', fontSize: 24, letterSpacing: 5 }]}
                placeholder="A7X9P2"
                value={codigo}
                onChangeText={(text) => setCodigo(text.toUpperCase().trim())}
                autoCapitalize="characters"
                maxLength={6}
              />
            </View>

            {loading ? (
              <ActivityIndicator size="large" color="#0277bd" style={{ marginTop: 20 }} />
            ) : (
              <TouchableOpacity style={[styles.button, { backgroundColor: '#0277bd' }]} onPress={handleJoinFinca}>
                <Text style={styles.buttonText}>Unirse ahora</Text>
                <MaterialIcons name="arrow-forward" size={20} color="#ffffff" style={{ marginLeft: 8 }} />
              </TouchableOpacity>
            )}
          </>
        )}
        
        {mode === 'select' && (
          fromProfile ? (
            <TouchableOpacity style={styles.logoutBtn} onPress={() => router.canGoBack() && router.back()}>
              <Text style={[styles.logoutText, { color: '#5b5f5c' }]}>Volver al Perfil</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <Text style={styles.logoutText}>Cerrar Sesión</Text>
            </TouchableOpacity>
          )
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f0ea' },
  content: { flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center' },
  backBtn: { position: 'absolute', top: 20, left: 24, padding: 8, zIndex: 10 },
  iconContainer: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#e8f5e9', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#111111', textAlign: 'center', marginBottom: 12 },
  subtitle: { fontSize: 15, color: '#5b5f5c', textAlign: 'center', marginBottom: 40, lineHeight: 22 },
  optionCard: { width: '100%', backgroundColor: '#fff', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: '#e5e7eb' },
  optionIcon: { width: 50, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  optionTextContainer: { flex: 1 },
  optionTitle: { fontSize: 17, fontWeight: 'bold', color: '#111827', marginBottom: 4 },
  optionDesc: { fontSize: 13, color: '#6b7280' },
  inputContainer: { width: '100%', marginBottom: 24 },
  label: { fontSize: 12, fontWeight: 'bold', color: '#424242', marginBottom: 8, textTransform: 'uppercase' },
  input: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 12, paddingHorizontal: 16, height: 54, fontSize: 16, color: '#111111' },
  button: { width: '100%', height: 54, backgroundColor: '#154212', borderRadius: 27, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  logoutBtn: { marginTop: 30, padding: 10 },
  logoutText: { color: '#ba1a1a', fontSize: 14, fontWeight: '600' }
});
