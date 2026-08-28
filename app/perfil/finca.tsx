import React, { useEffect, useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';

export default function FincaScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [fincaActual, setFincaActual] = useState<{ nombre: string } | null>(null);
  const [nuevaFincaNombre, setNewFincaNombre] = useState('');

  // Verificar si el usuario ya tiene una finca asignada
  const checkFinca = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('miembros_finca')
        .select('fincas(nombre)')
        .eq('user_id', user.id)
        .single();

      if (data && data.fincas) {
        // @ts-ignore
        setFincaActual({ nombre: data.fincas.nombre });
      }
    } catch (error) {
      console.log('El usuario aún no tiene finca.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkFinca();
  }, []);

  // Función para crear la finca
  const handleCrearFinca = async () => {
    if (!nuevaFincaNombre.trim()) {
      Alert.alert('Campo requerido', 'Por favor ingresa el nombre de tu finca.');
      return;
    }

    setIsCreating(true);
    try {
      // 1. Insertamos la finca (El trigger en Supabase nos hará Admin automáticamente)
      const { error } = await supabase
        .from('fincas')
        .insert({ nombre: nuevaFincaNombre.trim() });

      if (error) throw error;

      Alert.alert('¡Finca Creada!', 'Tu finca se ha registrado con éxito. Ya puedes empezar a registrar animales.');
      checkFinca(); // Recargamos la pantalla para mostrar la finca recién creada
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo crear la finca.');
    } finally {
      setIsCreating(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#154212" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
          <MaterialIcons name="arrow-back" size={24} color="#42493e" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mi Finca</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        {fincaActual ? (
          // Vista cuando YA tiene finca
          <View style={styles.card}>
            <MaterialIcons name="agriculture" size={64} color="#154212" style={{ alignSelf: 'center', marginBottom: 16 }} />
            <Text style={styles.label}>Nombre de tu Finca Actual:</Text>
            <Text style={styles.fincaName}>{fincaActual.nombre}</Text>
            <Text style={styles.helperText}>
              Ya estás registrado como Administrador. Puedes ir a la pestaña de Animales y comenzar a registrar tu ganado.
            </Text>
          </View>
        ) : (
          // Vista cuando NO tiene finca (Formulario de creación)
          <View style={styles.card}>
            <View style={styles.alertBox}>
              <MaterialIcons name="info-outline" size={24} color="#93000a" />
              <Text style={styles.alertText}>
                Aún no tienes una finca registrada. Debes crear una para poder guardar animales y pesajes.
              </Text>
            </View>

            <Text style={styles.label}>Nombre de la nueva finca</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Hacienda La Esperanza"
              value={nuevaFincaNombre}
              onChangeText={setNewFincaNombre}
            />

            <TouchableOpacity 
              style={styles.btnPrimary} 
              onPress={handleCrearFinca}
              disabled={isCreating}
            >
              {isCreating ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <MaterialIcons name="add-location-alt" size={20} color="#fff" />
                  <Text style={styles.btnPrimaryText}>Crear Finca</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f4ee' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f4f4ee' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 16, backgroundColor: '#ffffff',
    borderBottomWidth: 1, borderBottomColor: '#e3e3de',
  },
  iconButton: { padding: 8, borderRadius: 20, backgroundColor: '#f4f4ee' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#154212' },
  content: { padding: 20 },
  card: {
    backgroundColor: '#ffffff', borderRadius: 16, padding: 24,
    borderWidth: 1, borderColor: '#e3e3de', shadowColor: '#2d5a27',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
  },
  label: { fontSize: 12, fontWeight: 'bold', color: '#5b5f5c', textTransform: 'uppercase', marginBottom: 8 },
  fincaName: { fontSize: 28, fontWeight: 'bold', color: '#1a1c19', textAlign: 'center', marginBottom: 16 },
  helperText: { fontSize: 14, color: '#5b5f5c', textAlign: 'center', lineHeight: 22 },
  alertBox: {
    flexDirection: 'row', backgroundColor: '#ffdad6', padding: 16, borderRadius: 12,
    marginBottom: 24, alignItems: 'center', gap: 12,
  },
  alertText: { flex: 1, color: '#93000a', fontSize: 14, fontWeight: '500' },
  input: {
    backgroundColor: '#f4f4ee', borderWidth: 1, borderColor: '#c2c9bb',
    borderRadius: 8, paddingHorizontal: 16, height: 52, fontSize: 16, color: '#1a1c19', marginBottom: 24,
  },
  btnPrimary: {
    flexDirection: 'row', backgroundColor: '#154212', height: 52, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center', gap: 8,
  },
  btnPrimaryText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
});