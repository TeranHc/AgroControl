import React, { useEffect, useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert,
  ScrollView,
  Platform,
  Modal
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';
import { useActiveFinca } from '../../contexts/ActiveFincaContext';
import { getDb } from '../../lib/database';

export default function FincaScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { activeFinca, recargarFincas, fincas, cambiarFinca } = useActiveFinca();
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  // Datos de la finca actual
  const [fincaActual, setFincaActual] = useState<{ id: string; nombre: string; created_at: string } | null>(null);
  const [esAdmin, setEsAdmin] = useState(false);
  const [totalAnimales, setTotalAnimales] = useState(0);
  const [totalMiembros, setTotalMiembros] = useState(0);

  // Estados de edición / creación
  const [nombreFinca, setNombreFinca] = useState('');
  const [modoEdicion, setModoEdicion] = useState(false);
  const [modalAction, setModalAction] = useState<'eliminar' | 'salir' | null>(null);
  const [passwordAction, setPasswordAction] = useState('');

  // Verificar si el usuario ya tiene una finca asignada
  const checkFinca = async () => {
    try {
      if (activeFinca) {
        setFincaActual({
          id: activeFinca.id,
          nombre: activeFinca.nombre,
          created_at: new Date().toISOString() // Or fetch if needed, but we don't display it
        });
        setNombreFinca(activeFinca.nombre);
        setEsAdmin(activeFinca.rol === 'Admin');

        // Consultar estadísticas de la finca
        const [animRes, miembRes] = await Promise.all([
          supabase.from('animales').select('*', { count: 'exact', head: true }).eq('finca_id', activeFinca.id),
          supabase.from('miembros_finca').select('*', { count: 'exact', head: true }).eq('finca_id', activeFinca.id),
        ]);
        setTotalAnimales(animRes.count || 0);
        setTotalMiembros(miembRes.count || 0);
      } else {
        setFincaActual(null);
      }
    } catch (error) {
      console.log('Error cargando stats de finca:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkFinca();
  }, [activeFinca]);


  // Función para crear una nueva finca
  const handleCrearFinca = async () => {
    if (!nombreFinca.trim()) {
      Alert.alert('Campo requerido', 'Por favor ingresa el nombre de tu finca.');
      return;
    }

    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('fincas')
        .insert({ nombre: nombreFinca.trim() });

      if (error) throw error;

      Alert.alert('¡Finca Creada!', 'Tu finca se ha registrado con éxito. El trigger de la base de datos te asignó como Administrador.');
      await recargarFincas();
      checkFinca();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo crear la finca.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmarAccionPeligrosa = async () => {
    if (!passwordAction) {
      Alert.alert('Contraseña requerida', 'Debes ingresar tu contraseña para confirmar.');
      return;
    }
    if (!fincaActual || !modalAction) return;

    setIsProcessing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user?.email) throw new Error('No se pudo identificar tu usuario.');

      // 1. Verify password
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: passwordAction
      });

      if (authError) {
        throw new Error('Contraseña incorrecta.');
      }

      const db = await getDb();

      if (modalAction === 'eliminar') {
        // 2. Delete Finca via RPC
        const { error: deleteError } = await supabase.rpc('eliminar_finca', {
          finca_id_to_delete: fincaActual.id
        });

        if (deleteError) {
          throw new Error(deleteError.message || 'Error al eliminar la finca en el servidor.');
        }

        // 3. Limpiar base de datos local para forzar el reinicio
        await db.runAsync('DELETE FROM fincas WHERE id = ?', fincaActual.id);
        await db.runAsync('DELETE FROM miembros_finca WHERE finca_id = ?', fincaActual.id);
        
        Alert.alert('Finca Eliminada', 'Todos los datos de la finca han sido borrados.');
      } else if (modalAction === 'salir') {
        // Leave Finca via RPC
        const { error: leaveError } = await supabase.rpc('salir_de_finca', {
          finca_id_to_leave: fincaActual.id
        });
          
        if (leaveError) throw leaveError;
        
        await db.runAsync('DELETE FROM miembros_finca WHERE finca_id = ? AND user_id = ?', fincaActual.id, user.id);
        Alert.alert('Has salido', 'Ya no formas parte de esta finca.');
      }

      setModalAction(null);
      setPasswordAction('');
      await recargarFincas();
      if (modalAction === 'eliminar' || fincas.length <= 1) {
        router.back();
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo completar la acción.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Función para actualizar el nombre de la finca existente
  const handleActualizarFinca = async () => {
    if (!nombreFinca.trim()) {
      Alert.alert('Campo requerido', 'El nombre de la finca no puede estar vacío.');
      return;
    }

    if (!fincaActual) return;

    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('fincas')
        .update({ nombre: nombreFinca.trim() })
        .eq('id', fincaActual.id);

      if (error) throw error;

      Alert.alert('¡Actualizada!', 'El nombre de tu finca se ha modificado correctamente.');
      setModoEdicion(false);
      await recargarFincas();
      checkFinca();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo actualizar la finca.');
    } finally {
      setIsProcessing(false);
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
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/perfil')} style={styles.iconButton}>
          <MaterialIcons name="arrow-back" size={24} color="#154212" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gestión de Finca</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {fincaActual ? (
          <>
          {/* ========================================================= */}
          {/* VISTA: CUANDO YA TIENE FINCA REGISTRADA */}
          {/* ========================================================= */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <MaterialIcons name="agriculture" size={40} color="#154212" />
              <View style={[styles.badgeAdmin, { backgroundColor: esAdmin ? '#e8f5e9' : '#e0f2fe' }]}>
                <Text style={[styles.badgeAdminText, { color: esAdmin ? '#154212' : '#0369a1' }]}>
                  {esAdmin ? 'ADMINISTRADOR' : 'MIEMBRO'}
                </Text>
              </View>
            </View>

            {modoEdicion ? (
              <View style={{ marginTop: 12 }}>
                <Text style={styles.label}>Editar Nombre de la Finca:</Text>
                <TextInput
                  style={styles.input}
                  value={nombreFinca}
                  onChangeText={setNombreFinca}
                  placeholder="Nombre de la finca..."
                />

                <View style={styles.editBtnRow}>
                  <TouchableOpacity
                    style={styles.btnCancelEdit}
                    onPress={() => {
                      setNombreFinca(fincaActual.nombre);
                      setModoEdicion(false);
                    }}
                    disabled={isProcessing}
                  >
                    <Text style={styles.btnCancelEditText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.btnSaveEdit}
                    onPress={handleActualizarFinca}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.btnSaveEditText}>Guardar Cambios</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={{ marginTop: 8 }}>
                <Text style={styles.label}>Nombre de tu Finca:</Text>
                <Text style={styles.fincaName}>{fincaActual.nombre}</Text>

                {esAdmin && (
                  <TouchableOpacity
                    style={styles.btnEditFinca}
                    onPress={() => setModoEdicion(true)}
                  >
                    <MaterialIcons name="edit" size={16} color="#154212" />
                    <Text style={styles.btnEditFincaText}>EDITAR NOMBRE</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            <View style={styles.divider} />

            {/* Estadísticas de la finca */}
            <Text style={styles.statsHeader}>Estadísticas Actuales</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <MaterialCommunityIcons name="cow" size={24} color="#154212" />
                <Text style={styles.statVal}>{totalAnimales}</Text>
                <Text style={styles.statLab}>Animales</Text>
              </View>

              <View style={styles.statBox}>
                <MaterialIcons name="groups" size={24} color="#154212" />
                <Text style={styles.statVal}>{totalMiembros}</Text>
                <Text style={styles.statLab}>Miembros</Text>
              </View>
            </View>

            <View style={styles.metaBox}>
              <Text style={styles.metaLabel}>Fecha de Fundación:</Text>
              <Text style={styles.metaValue}>
                {new Date(fincaActual.created_at).toLocaleDateString()}
              </Text>
            </View>

            {!esAdmin && (
              <TouchableOpacity
                style={{ marginTop: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ba1a1a15', padding: 12, borderRadius: 8 }}
                onPress={() => setModalAction('salir')}
              >
                <MaterialIcons name="exit-to-app" size={20} color="#ba1a1a" style={{ marginRight: 8 }} />
                <Text style={{ color: '#ba1a1a', fontWeight: 'bold' }}>Salir de la Finca</Text>
              </TouchableOpacity>
            )}

            {esAdmin && (
              <TouchableOpacity
                style={{ marginTop: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ba1a1a15', padding: 12, borderRadius: 8 }}
                onPress={() => setModalAction('eliminar')}
              >
                <MaterialIcons name="delete-forever" size={20} color="#ba1a1a" style={{ marginRight: 8 }} />
                <Text style={{ color: '#ba1a1a', fontWeight: 'bold' }}>Eliminar Finca Permanentemente</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ========================================================= */}
          {/* VISTA: LISTA DE TODAS LAS FINCAS */}
          {/* ========================================================= */}
          {fincas && fincas.length > 1 && (
            <View style={{ marginTop: 24, paddingHorizontal: 4 }}>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#154212', marginBottom: 12 }}>Tus Fincas</Text>
              {fincas.map(f => (
                <TouchableOpacity 
                  key={f.id} 
                  style={[
                    styles.card, 
                    { marginBottom: 12, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
                    f.id === fincaActual.id && { borderColor: '#154212', borderWidth: 2 }
                  ]}
                  onPress={async () => {
                    if (f.id !== fincaActual.id) {
                      await cambiarFinca(f.id);
                    }
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ backgroundColor: f.id === fincaActual.id ? '#154212' : '#f4f4ee', padding: 10, borderRadius: 12 }}>
                      <MaterialIcons name="agriculture" size={24} color={f.id === fincaActual.id ? '#ffffff' : '#154212'} />
                    </View>
                    <View>
                      <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1a1c19' }}>
                        {f.nombre}
                      </Text>
                      <Text style={{ fontSize: 12, color: '#72796e', marginTop: 2 }}>
                        Rol: {f.rol}
                      </Text>
                    </View>
                  </View>
                  {f.id === fincaActual.id && (
                    <MaterialIcons name="check-circle" size={24} color="#154212" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
          </>
        ) : (
          <>
          {/* ========================================================= */}
          {/* VISTA: CREACION DE FINCA */}
          {/* ========================================================= */}
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
              placeholder="Ej: Hacienda San José"
              value={nombreFinca}
              onChangeText={setNombreFinca}
            />

            <TouchableOpacity 
              style={styles.btnPrimary} 
              onPress={handleCrearFinca}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <MaterialIcons name="add-location-alt" size={20} color="#fff" />
                  <Text style={styles.btnPrimaryText}>Crear Finca</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </>
          )}
      </ScrollView>

      {/* Modal Confirmar Eliminar */}
      <Modal statusBarTranslucent
        visible={!!modalAction}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setModalAction(null);
          setPasswordAction('');
        }}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => {
            setModalAction(null);
            setPasswordAction('');
          }}
        >
          <TouchableOpacity activeOpacity={1} style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: '#ba1a1a' }]}>¡Atención!</Text>
              <TouchableOpacity onPress={() => {
                setModalAction(null);
                setPasswordAction('');
              }}>
                <MaterialIcons name="close" size={24} color="#5b5f5c" />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 16, color: '#5b5f5c', marginBottom: 15 }}>
              {modalAction === "eliminar" ? "Estás a punto de eliminar la finca permanentemente. Todos los animales, pesajes y registros asociados se perderán sin recuperación." : "¿Estás seguro de salir de la Finca? No volverás a poder consultar los datos."}
            </Text>

            <Text style={styles.label}>Ingresa tu contraseña para confirmar:</Text>
            <TextInput
              style={styles.input}
              placeholder="Contraseña..."
              secureTextEntry
              value={passwordAction}
              onChangeText={setPasswordAction}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.btnModalCancel}
                onPress={() => {
                  setModalAction(null);
                  setPasswordAction('');
                }}
                disabled={isProcessing}
              >
                <Text style={styles.btnModalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.btnModalSave, { backgroundColor: '#ba1a1a' }]}
                onPress={handleConfirmarAccionPeligrosa}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.btnModalSaveText}>{modalAction === "eliminar" ? "Eliminar Finca" : "Salir"}</Text>
                )}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f4ee' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f4f4ee' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#ffffff',
    borderBottomWidth: 1, borderBottomColor: '#e3e3de',
  },
  iconButton: { padding: 8, borderRadius: 20, backgroundColor: '#f4f4ee' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#154212' },
  scrollContent: { padding: 16 },
  card: {
    backgroundColor: '#ffffff', borderRadius: 16, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 0,
    borderWidth: 1, borderColor: '#e3e3de', shadowColor: '#2d5a27',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
  },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badgeAdmin: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeAdminText: { fontSize: 11, fontWeight: 'bold' },
  label: { fontSize: 11, fontWeight: '700', color: '#5b5f5c', textTransform: 'uppercase', marginBottom: 6, marginTop: 10, letterSpacing: 0.5 },
  fincaName: { fontSize: 26, fontWeight: 'bold', color: '#1a1c19', marginVertical: 4 },
  btnEditFinca: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f4f4ee',
    alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
    borderWidth: 1, borderColor: '#c2c9bb', marginTop: 8
  },
  btnEditFincaText: { fontSize: 11, fontWeight: 'bold', color: '#154212' },
  editBtnRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  btnCancelEdit: {
    flex: 1, height: 44, borderRadius: 8, borderWidth: 1, borderColor: '#154212',
    justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff'
  },
  btnCancelEditText: { color: '#154212', fontSize: 13, fontWeight: 'bold' },
  btnSaveEdit: {
    flex: 1, height: 44, borderRadius: 8, backgroundColor: '#154212',
    justifyContent: 'center', alignItems: 'center'
  },
  btnSaveEditText: { color: '#ffffff', fontSize: 13, fontWeight: 'bold' },
  divider: { height: 1, backgroundColor: '#f0f0ea', marginVertical: 18 },
  statsHeader: { fontSize: 14, fontWeight: 'bold', color: '#154212', marginBottom: 12 },
  statsGrid: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statBox: {
    flex: 1, backgroundColor: '#f4f4ee', padding: 14, borderRadius: 12,
    alignItems: 'center', gap: 4
  },
  statVal: { fontSize: 22, fontWeight: 'bold', color: '#1a1c19' },
  statLab: { fontSize: 11, color: '#5b5f5c', fontWeight: '600' },
  metaBox: { backgroundColor: '#f9f9f6', padding: 12, borderRadius: 8, gap: 4 },
  metaLabel: { fontSize: 10, color: '#72796e', fontWeight: 'bold' },
  metaValue: { fontSize: 12, color: '#1a1c19', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', marginBottom: 4 },
  alertBox: {
    flexDirection: 'row', backgroundColor: '#ffdad6', padding: 16, borderRadius: 12,
    marginBottom: 20, alignItems: 'center', gap: 12,
  },
  alertText: { flex: 1, color: '#93000a', fontSize: 13, fontWeight: '500' },
  input: {
    backgroundColor: '#f4f4ee', borderWidth: 1, borderColor: '#c2c9bb',
    borderRadius: 8, paddingHorizontal: 14, height: 48, fontSize: 15, color: '#1a1c19',
    marginBottom: 12,
  },
  btnPrimary: {
    flexDirection: 'row', backgroundColor: '#154212', height: 48, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 8
  },
  btnPrimaryText: { color: '#ffffff', fontSize: 15, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#ffffff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 10 },
  btnModalCancel: { flex: 1, height: 48, borderRadius: 8, borderWidth: 1, borderColor: '#5b5f5c', justifyContent: 'center', alignItems: 'center' },
  btnModalCancelText: { color: '#5b5f5c', fontWeight: 'bold' },
  btnModalSave: { flex: 1, height: 48, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  btnModalSaveText: { color: '#fff', fontWeight: 'bold' }
});











