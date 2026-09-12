import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useActiveFinca } from '../../contexts/ActiveFincaContext';

type Miembro = {
  id: string;
  finca_id: string;
  user_id: string | null;
  nombre_completo: string;
  telefono: string | null;
  nacionalidad: string | null;
  rol: 'Admin' | 'Worker' | 'Viewer';
  created_at: string;
};

type Finca = {
  id: string;
  nombre: string;
  created_at: string;
};

export default function PerfilScreen() {
  const router = useRouter();
  const { activeFinca } = useActiveFinca();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Datos de usuario y sesión
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Datos de finca y membresía
  const [miMembresia, setMiMembresia] = useState<Miembro | null>(null);
  const [finca, setFinca] = useState<Finca | null>(null);
  const [miembros, setMiembros] = useState<Miembro[]>([]);

  // Modales de edición rápida
  const [modalPersonalVisible, setModalPersonalVisible] = useState(false);
  const [modalFincaVisible, setModalFincaVisible] = useState(false);
  const [modalNuevoMiembroVisible, setModalNuevoMiembroVisible] = useState(false);

  // Estados temporales para formularios de edición
  const [editNombre, setEditNombre] = useState('');
  const [editTelefono, setEditTelefono] = useState('');
  const [editNacionalidad, setEditNacionalidad] = useState('');

  const [editNombreFinca, setEditNombreFinca] = useState('');

  // Estados para nuevo miembro
  const [nuevoNombreMiembro, setNuevoNombreMiembro] = useState('');
  const [nuevoTelefonoMiembro, setNuevoTelefonoMiembro] = useState('');
  const [nuevoNacionalidadMiembro, setNuevoNacionalidadMiembro] = useState('');
  const [nuevoRolMiembro, setNuevoRolMiembro] = useState<'Worker' | 'Viewer' | 'Admin'>('Worker');

  const [guardando, setGuardando] = useState(false);

  // Cargar todos los datos del perfil
  const cargarDatosPerfil = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/(auth)/login');
        return;
      }

      setUserId(user.id);
      setUserEmail(user.email || 'Sin correo');

      if (!activeFinca) {
        setMiMembresia(null);
        setFinca(null);
        setMiembros([]);
        return;
      }

      // 1. Obtener la membresía del usuario actual para la finca activa
      const { data: membresiaData, error: memError } = await supabase
        .from('miembros_finca')
        .select(`
          id,
          finca_id,
          user_id,
          nombre_completo,
          telefono,
          nacionalidad,
          rol,
          created_at,
          fincas (
            id,
            nombre,
            created_at
          )
        `)
        .eq('id', activeFinca.membresia_id)
        .maybeSingle();

      if (memError) throw memError;

      if (membresiaData) {
        setMiMembresia({
          id: membresiaData.id,
          finca_id: membresiaData.finca_id,
          user_id: membresiaData.user_id,
          nombre_completo: membresiaData.nombre_completo,
          telefono: membresiaData.telefono,
          nacionalidad: membresiaData.nacionalidad,
          rol: membresiaData.rol as 'Admin' | 'Worker' | 'Viewer',
          created_at: membresiaData.created_at,
        });

        // @ts-ignore (Supabase nested join type)
        const fincaInfo = Array.isArray(membresiaData.fincas) ? membresiaData.fincas[0] : membresiaData.fincas;
        if (fincaInfo) {
          setFinca({
            id: fincaInfo.id,
            nombre: fincaInfo.nombre,
            created_at: fincaInfo.created_at,
          });
        }

        // 2. Obtener todos los miembros de esa finca
        const { data: listaMiembros, error: teamError } = await supabase
          .from('miembros_finca')
          .select('*')
          .eq('finca_id', activeFinca.id)
          .order('created_at', { ascending: true });

        if (teamError) throw teamError;
        if (listaMiembros) {
          setMiembros(listaMiembros);
        }
      } else {
        setMiMembresia(null);
        setFinca(null);
        setMiembros([]);
      }
    } catch (error: any) {
      console.error('Error cargando perfil:', error);
      Alert.alert('Error', 'No se pudieron cargar los datos del perfil.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      cargarDatosPerfil();
    }, [activeFinca])
  );

  const onRefresh = () => {
    setRefreshing(true);
    cargarDatosPerfil();
  };

  // Abrir modal de edición personal
  const abrirEdicionPersonal = () => {
    setEditNombre(miMembresia?.nombre_completo || '');
    setEditTelefono(miMembresia?.telefono || '');
    setEditNacionalidad(miMembresia?.nacionalidad || '');
    setModalPersonalVisible(true);
  };

  // Guardar cambios personales
  const guardarDatosPersonales = async () => {
    if (!editNombre.trim()) {
      Alert.alert('Campo requerido', 'Por favor ingresa tu nombre completo.');
      return;
    }

    if (!miMembresia) return;

    setGuardando(true);
    try {
      const { error } = await supabase
        .from('miembros_finca')
        .update({
          nombre_completo: editNombre.trim(),
          telefono: editTelefono.trim() || null,
          nacionalidad: editNacionalidad.trim() || null,
        })
        .eq('id', miMembresia.id);

      if (error) throw error;

      Alert.alert('¡Actualizado!', 'Tus datos personales han sido guardados.');
      setModalPersonalVisible(false);
      cargarDatosPerfil();
    } catch (error: any) {
      console.error('Error actualizando datos personales:', error);
      Alert.alert('Error', error.message || 'No se pudieron guardar tus datos.');
    } finally {
      setGuardando(false);
    }
  };

  // Abrir modal de edición de finca
  const abrirEdicionFinca = () => {
    if (miMembresia?.rol !== 'Admin') {
      Alert.alert('Acceso Restringido', 'Solo los administradores pueden cambiar el nombre de la finca.');
      return;
    }
    setEditNombreFinca(finca?.nombre || '');
    setModalFincaVisible(true);
  };

  // Guardar cambio de nombre de la finca
  const guardarFinca = async () => {
    if (!editNombreFinca.trim()) {
      Alert.alert('Campo requerido', 'Por favor ingresa un nombre válido para la finca.');
      return;
    }

    if (!finca) return;

    setGuardando(true);
    try {
      const { error } = await supabase
        .from('fincas')
        .update({ nombre: editNombreFinca.trim() })
        .eq('id', finca.id);

      if (error) throw error;

      Alert.alert('¡Finca Actualizada!', 'El nombre de la finca ha sido modificado con éxito.');
      setModalFincaVisible(false);
      cargarDatosPerfil();
    } catch (error: any) {
      console.error('Error actualizando finca:', error);
      Alert.alert('Error', error.message || 'No se pudo actualizar el nombre de la finca.');
    } finally {
      setGuardando(false);
    }
  };

  // Agregar nuevo miembro a la finca
  const handleAgregarMiembro = async () => {
    if (!nuevoNombreMiembro.trim()) {
      Alert.alert('Campo requerido', 'Por favor ingresa el nombre del nuevo miembro.');
      return;
    }

    if (!finca) return;

    setGuardando(true);
    try {
      const { error } = await supabase
        .from('miembros_finca')
        .insert({
          finca_id: finca.id,
          nombre_completo: nuevoNombreMiembro.trim(),
          telefono: nuevoTelefonoMiembro.trim() || null,
          nacionalidad: nuevoNacionalidadMiembro.trim() || null,
          rol: nuevoRolMiembro,
        });

      if (error) throw error;

      Alert.alert('¡Miembro Agregado!', `Se añadió a ${nuevoNombreMiembro.trim()} como ${nuevoRolMiembro}.`);
      setModalNuevoMiembroVisible(false);
      setNuevoNombreMiembro('');
      setNuevoTelefonoMiembro('');
      setNuevoNacionalidadMiembro('');
      setNuevoRolMiembro('Worker');
      cargarDatosPerfil();
    } catch (error: any) {
      console.error('Error agregando miembro:', error);
      Alert.alert('Error', error.message || 'No se pudo registrar el miembro.');
    } finally {
      setGuardando(false);
    }
  };

  // Eliminar miembro del equipo
  const confirmarEliminarMiembro = (miembro: Miembro) => {
    if (miembro.user_id === userId) {
      Alert.alert('Operación no permitida', 'No puedes eliminarte a ti mismo de la finca.');
      return;
    }

    Alert.alert(
      'Eliminar Miembro',
      `¿Estás seguro de que deseas eliminar a "${miembro.nombre_completo}" del equipo de la finca?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('miembros_finca')
                .delete()
                .eq('id', miembro.id);

              if (error) throw error;

              Alert.alert('Miembro Eliminado', 'El miembro ha sido retirado de la finca.');
              cargarDatosPerfil();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'No se pudo eliminar el miembro.');
            }
          },
        },
      ]
    );
  };

  // Cerrar Sesión
  const handleCerrarSesion = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Deseas cerrar tu sesión actual de AgroControl?',
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

  // Función para obtener estilos según el rol
  const getRolBadgeStyle = (rol: string) => {
    switch (rol) {
      case 'Admin':
        return { bg: '#e8f5e9', text: '#154212', border: '#a1d494', label: 'ADMINISTRADOR' };
      case 'Worker':
        return { bg: '#e0f2fe', text: '#0369a1', border: '#7dd3fc', label: 'TRABAJADOR' };
      default:
        return { bg: '#f4f4ee', text: '#5b5f5c', border: '#c2c9bb', label: 'OBSERVADOR' };
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#154212" />
        <Text style={styles.loadingText}>Cargando perfil...</Text>
      </SafeAreaView>
    );
  }

  const esAdmin = miMembresia?.rol === 'Admin';
  const rolStyle = getRolBadgeStyle(miMembresia?.rol || 'Viewer');

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#154212" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mi Perfil y Finca</Text>
        <TouchableOpacity 
          style={styles.headerBtn} 
          onPress={() => router.push('/perfil/configuracion')}
        >
          <MaterialIcons name="settings" size={22} color="#154212" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#154212" />
        }
      >
        {/* ========================================================= */}
        {/* 1. SECCIÓN: MIS DATOS PERSONALES */}
        {/* ========================================================= */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.sectionTitleRow}>
              <MaterialIcons name="person" size={22} color="#154212" />
              <Text style={styles.cardTitle}>Mis Datos</Text>
            </View>
            <TouchableOpacity 
              style={styles.btnEditSmall}
              onPress={abrirEdicionPersonal}
            >
              <MaterialIcons name="edit" size={16} color="#154212" />
              <Text style={styles.btnEditSmallText}>EDITAR</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.userProfileRow}>
            {/* Avatar con iniciales */}
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {miMembresia?.nombre_completo ? miMembresia.nombre_completo.charAt(0).toUpperCase() : 'U'}
              </Text>
            </View>

            <View style={styles.userInfoCol}>
              <Text style={styles.userName}>
                {miMembresia?.nombre_completo || 'Usuario sin nombre'}
              </Text>
              
              <View style={[styles.badgeRol, { backgroundColor: rolStyle.bg, borderColor: rolStyle.border }]}>
                <MaterialIcons name="verified-user" size={12} color={rolStyle.text} />
                <Text style={[styles.badgeRolText, { color: rolStyle.text }]}>
                  {rolStyle.label}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Detalles personales */}
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>CORREO ELECTRÓNICO</Text>
              <View style={styles.infoValueRow}>
                <MaterialCommunityIcons name="email-outline" size={16} color="#5b5f5c" />
                <Text style={styles.infoValueText}>{userEmail}</Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>TELÉFONO</Text>
              <View style={styles.infoValueRow}>
                <MaterialIcons name="phone" size={16} color="#5b5f5c" />
                <Text style={styles.infoValueText}>
                  {miMembresia?.telefono || 'No registrado'}
                </Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>NACIONALIDAD</Text>
              <View style={styles.infoValueRow}>
                <MaterialIcons name="public" size={16} color="#5b5f5c" />
                <Text style={styles.infoValueText}>
                  {miMembresia?.nacionalidad || 'No registrada'}
                </Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>MIEMBRO DESDE</Text>
              <View style={styles.infoValueRow}>
                <MaterialIcons name="calendar-today" size={16} color="#5b5f5c" />
                <Text style={styles.infoValueText}>
                  {miMembresia?.created_at ? new Date(miMembresia.created_at).toLocaleDateString() : 'Reciente'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ========================================================= */}
        {/* 2. SECCIÓN: DATOS DE MI FINCA */}
        {/* ========================================================= */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.sectionTitleRow}>
              <MaterialIcons name="agriculture" size={22} color="#154212" />
              <Text style={styles.cardTitle}>Mi Finca</Text>
            </View>
            {finca ? (
              esAdmin ? (
                <TouchableOpacity 
                  style={styles.btnEditSmall}
                  onPress={abrirEdicionFinca}
                >
                  <MaterialIcons name="edit" size={16} color="#154212" />
                  <Text style={styles.btnEditSmallText}>EDITAR NOMBRE</Text>
                </TouchableOpacity>
              ) : null
            ) : (
              <TouchableOpacity 
                style={styles.btnActionPrimary}
                onPress={() => router.push('/perfil/finca')}
              >
                <MaterialIcons name="add" size={16} color="#fff" />
                <Text style={styles.btnActionPrimaryText}>CREAR FINCA</Text>
              </TouchableOpacity>
            )}
          </View>

          {finca ? (
            <View>
              <View style={styles.fincaBanner}>
                <MaterialCommunityIcons name="barn" size={36} color="#154212" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.fincaNombreText}>{finca.nombre}</Text>
                  <Text style={styles.fincaSubText}>
                    {esAdmin ? 'Eres Propietario / Administrador' : 'Perteneces a esta finca'}
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.fincaStatsRow}>
                <View style={styles.fincaStatBox}>
                  <Text style={styles.fincaStatLabel}>EQUIPO</Text>
                  <Text style={styles.fincaStatValue}>
                    {miembros.length} {miembros.length === 1 ? 'miembro' : 'miembros'}
                  </Text>
                </View>
                <View style={styles.fincaStatBox}>
                  <Text style={styles.fincaStatLabel}>FECHA REGISTRO</Text>
                  <Text style={styles.fincaStatValue}>
                    {new Date(finca.created_at).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.noFincaBox}>
              <MaterialIcons name="error-outline" size={32} color="#ba1a1a" />
              <Text style={styles.noFincaTitle}>Aún no tienes una finca registrada</Text>
              <Text style={styles.noFincaDesc}>
                Para registrar animales, pesajes y coordinar tu equipo debes registrar tu primera finca.
              </Text>
              <TouchableOpacity 
                style={styles.btnCrearFincaGrande} 
                onPress={() => router.push('/perfil/finca')}
              >
                <MaterialIcons name="add-business" size={18} color="#fff" />
                <Text style={styles.btnCrearFincaGrandeText}>REGISTRAR MI FINCA AHORA</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ========================================================= */}
        {/* 3. SECCIÓN: MIEMBROS DE LA FINCA Y ROLES */}
        {/* ========================================================= */}
        {finca && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.sectionTitleRow}>
                <MaterialIcons name="groups" size={22} color="#154212" />
                <Text style={styles.cardTitle}>Miembros del Equipo</Text>
                <View style={styles.badgeCount}>
                  <Text style={styles.badgeCountText}>{miembros.length}</Text>
                </View>
              </View>

              {esAdmin && (
                <TouchableOpacity 
                  style={styles.btnActionPrimary}
                  onPress={() => setModalNuevoMiembroVisible(true)}
                >
                  <MaterialIcons name="person-add" size={16} color="#ffffff" />
                  <Text style={styles.btnActionPrimaryText}>INVITAR</Text>
                </TouchableOpacity>
              )}
            </View>

            <Text style={styles.helperTextSection}>
              Personas con acceso a la gestión de {finca.nombre}.
            </Text>

            {miembros.map((m) => {
              const mStyle = getRolBadgeStyle(m.rol);
              const esYo = m.user_id === userId;

              return (
                <View key={m.id} style={styles.memberCard}>
                  <View style={styles.memberAvatar}>
                    <Text style={styles.memberAvatarText}>
                      {m.nombre_completo.charAt(0).toUpperCase()}
                    </Text>
                  </View>

                  <View style={styles.memberInfo}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.memberName}>{m.nombre_completo}</Text>
                      {esYo && (
                        <View style={styles.badgeYou}>
                          <Text style={styles.badgeYouText}>TÚ</Text>
                        </View>
                      )}
                    </View>

                    <Text style={styles.memberMeta}>
                      {m.telefono ? `📞 ${m.telefono}` : 'Sin teléfono'} • {m.nacionalidad || 'Sin nacionalidad'}
                    </Text>
                  </View>

                  <View style={{ alignItems: 'flex-end', gap: 6 }}>
                    <View style={[styles.badgeRolSmall, { backgroundColor: mStyle.bg, borderColor: mStyle.border }]}>
                      <Text style={[styles.badgeRolSmallText, { color: mStyle.text }]}>
                        {mStyle.label}
                      </Text>
                    </View>

                    {esAdmin && !esYo && (
                      <TouchableOpacity 
                        onPress={() => confirmarEliminarMiembro(m)}
                        style={styles.btnDeleteMember}
                      >
                        <MaterialIcons name="delete-outline" size={18} color="#ba1a1a" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* ========================================================= */}
        {/* BOTÓN CERRAR SESIÓN */}
        {/* ========================================================= */}
        <TouchableOpacity style={styles.btnLogout} onPress={handleCerrarSesion}>
          <MaterialIcons name="logout" size={20} color="#ba1a1a" />
          <Text style={styles.btnLogoutText}>CERRAR SESIÓN</Text>
        </TouchableOpacity>

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* ========================================================= */}
      {/* MODAL: EDITAR DATOS PERSONALES */}
      {/* ========================================================= */}
      <Modal
        visible={modalPersonalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalPersonalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setModalPersonalVisible(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Editar Mis Datos</Text>
              <TouchableOpacity onPress={() => setModalPersonalVisible(false)}>
                <MaterialIcons name="close" size={24} color="#5b5f5c" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Nombre Completo *</Text>
            <TextInput
              style={styles.modalInput}
              value={editNombre}
              onChangeText={setEditNombre}
              placeholder="Ej: Juan Pérez"
            />

            <Text style={styles.inputLabel}>Teléfono</Text>
            <TextInput
              style={styles.modalInput}
              value={editTelefono}
              onChangeText={setEditTelefono}
              placeholder="Ej: +593 999 999 999"
              keyboardType="phone-pad"
            />

            <Text style={styles.inputLabel}>Nacionalidad</Text>
            <TextInput
              style={styles.modalInput}
              value={editNacionalidad}
              onChangeText={setEditNacionalidad}
              placeholder="Ej: Ecuatoriana, Colombiana..."
            />

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.btnModalCancel}
                onPress={() => setModalPersonalVisible(false)}
                disabled={guardando}
              >
                <Text style={styles.btnModalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.btnModalSave}
                onPress={guardarDatosPersonales}
                disabled={guardando}
              >
                {guardando ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.btnModalSaveText}>Guardar</Text>
                )}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ========================================================= */}
      {/* MODAL: EDITAR FINCA */}
      {/* ========================================================= */}
      <Modal
        visible={modalFincaVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalFincaVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setModalFincaVisible(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Editar Nombre de la Finca</Text>
              <TouchableOpacity onPress={() => setModalFincaVisible(false)}>
                <MaterialIcons name="close" size={24} color="#5b5f5c" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Nombre de la Finca *</Text>
            <TextInput
              style={styles.modalInput}
              value={editNombreFinca}
              onChangeText={setEditNombreFinca}
              placeholder="Ej: Hacienda San José"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.btnModalCancel}
                onPress={() => setModalFincaVisible(false)}
                disabled={guardando}
              >
                <Text style={styles.btnModalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.btnModalSave}
                onPress={guardarFinca}
                disabled={guardando}
              >
                {guardando ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.btnModalSaveText}>Guardar Cambios</Text>
                )}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ========================================================= */}
      {/* MODAL: AGREGAR NUEVO MIEMBRO AL EQUIPO */}
      {/* ========================================================= */}
      <Modal
        visible={modalNuevoMiembroVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalNuevoMiembroVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setModalNuevoMiembroVisible(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Agregar Miembro al Equipo</Text>
              <TouchableOpacity onPress={() => setModalNuevoMiembroVisible(false)}>
                <MaterialIcons name="close" size={24} color="#5b5f5c" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Nombre Completo *</Text>
            <TextInput
              style={styles.modalInput}
              value={nuevoNombreMiembro}
              onChangeText={setNuevoNombreMiembro}
              placeholder="Ej: Carlos Zambrano"
            />

            <Text style={styles.inputLabel}>Teléfono</Text>
            <TextInput
              style={styles.modalInput}
              value={nuevoTelefonoMiembro}
              onChangeText={setNuevoTelefonoMiembro}
              placeholder="Ej: +593 98 765 4321"
              keyboardType="phone-pad"
            />

            <Text style={styles.inputLabel}>Nacionalidad</Text>
            <TextInput
              style={styles.modalInput}
              value={nuevoNacionalidadMiembro}
              onChangeText={setNuevoNacionalidadMiembro}
              placeholder="Ej: Ecuatoriano"
            />

            <Text style={styles.inputLabel}>Rol Asignado *</Text>
            <View style={styles.roleSelectorRow}>
              {(['Worker', 'Viewer', 'Admin'] as const).map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[
                    styles.roleBtn,
                    nuevoRolMiembro === r && styles.roleBtnActive,
                  ]}
                  onPress={() => setNuevoRolMiembro(r)}
                >
                  <Text
                    style={[
                      styles.roleBtnText,
                      nuevoRolMiembro === r && styles.roleBtnTextActive,
                    ]}
                  >
                    {r === 'Admin' ? 'Admin' : r === 'Worker' ? 'Trabajador' : 'Observador'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.btnModalCancel}
                onPress={() => setModalNuevoMiembroVisible(false)}
                disabled={guardando}
              >
                <Text style={styles.btnModalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.btnModalSave}
                onPress={handleAgregarMiembro}
                disabled={guardando}
              >
                {guardando ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.btnModalSaveText}>Registrar</Text>
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
  loadingText: { marginTop: 12, fontSize: 14, color: '#154212', fontWeight: '600' },
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

  // Tarjetas principales
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e3e3de',
    shadowColor: '#2d5a27',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 17, fontWeight: 'bold', color: '#154212' },
  badgeCount: {
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badgeCountText: { fontSize: 12, fontWeight: 'bold', color: '#154212' },
  btnEditSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f4f4ee',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: '#c2c9bb',
  },
  btnEditSmallText: { fontSize: 11, fontWeight: 'bold', color: '#154212' },
  btnActionPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#154212',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  btnActionPrimaryText: { fontSize: 11, fontWeight: 'bold', color: '#ffffff' },

  // Perfil de Usuario
  userProfileRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 8 },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#154212',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: 26, fontWeight: 'bold', color: '#ffffff' },
  userInfoCol: { flex: 1, gap: 4 },
  userName: { fontSize: 20, fontWeight: 'bold', color: '#1a1c19' },
  badgeRol: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: 'flex-start',
    gap: 4,
  },
  badgeRolText: { fontSize: 10, fontWeight: 'bold', letterSpacing: 0.5 },

  divider: { height: 1, backgroundColor: '#f0f0ea', marginVertical: 14 },

  // Grid de datos personales
  infoGrid: { gap: 12 },
  infoItem: { gap: 2 },
  infoLabel: { fontSize: 10, fontWeight: '700', color: '#5b5f5c', letterSpacing: 0.5 },
  infoValueRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoValueText: { fontSize: 14, color: '#1a1c19', fontWeight: '500' },

  // Finca
  fincaBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    padding: 14,
    borderRadius: 12,
    gap: 12,
  },
  fincaNombreText: { fontSize: 18, fontWeight: 'bold', color: '#154212' },
  fincaSubText: { fontSize: 12, color: '#2e7d32', marginTop: 2 },
  fincaStatsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  fincaStatBox: { flex: 1, backgroundColor: '#f4f4ee', padding: 10, borderRadius: 8 },
  fincaStatLabel: { fontSize: 9, fontWeight: '700', color: '#5b5f5c', marginBottom: 2 },
  fincaStatCode: { fontSize: 12, fontWeight: '600', color: '#1a1c19', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  fincaStatValue: { fontSize: 12, fontWeight: '600', color: '#1a1c19' },
  noFincaBox: { alignItems: 'center', padding: 20, gap: 8 },
  noFincaTitle: { fontSize: 16, fontWeight: 'bold', color: '#1a1c19', textAlign: 'center' },
  noFincaDesc: { fontSize: 13, color: '#5b5f5c', textAlign: 'center', lineHeight: 18 },
  btnCrearFincaGrande: {
    flexDirection: 'row',
    backgroundColor: '#154212',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  btnCrearFincaGrandeText: { color: '#ffffff', fontWeight: 'bold', fontSize: 12 },

  // Miembros
  helperTextSection: { fontSize: 12, color: '#72796e', marginBottom: 12 },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f6',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e8e8e3',
    gap: 10,
  },
  memberAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#c2c9bb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberAvatarText: { color: '#154212', fontWeight: 'bold', fontSize: 16 },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 14, fontWeight: 'bold', color: '#1a1c19' },
  memberMeta: { fontSize: 11, color: '#5b5f5c', marginTop: 2 },
  badgeYou: {
    backgroundColor: '#154212',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  badgeYouText: { color: '#ffffff', fontSize: 9, fontWeight: 'bold' },
  badgeRolSmall: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
  },
  badgeRolSmallText: { fontSize: 9, fontWeight: 'bold' },
  btnDeleteMember: { padding: 4 },

  // Botón Cerrar Sesión
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

  // Modales
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#154212' },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#42493e',
    textTransform: 'uppercase',
    marginBottom: 6,
    marginTop: 10,
    letterSpacing: 0.5,
  },
  modalInput: {
    backgroundColor: '#f4f4ee',
    borderWidth: 1,
    borderColor: '#c2c9bb',
    borderRadius: 8,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 14,
    color: '#1a1c19',
  },
  roleSelectorRow: { flexDirection: 'row', gap: 8, marginTop: 4, marginBottom: 8 },
  roleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c2c9bb',
    backgroundColor: '#ffffff',
    alignItems: 'center',
  },
  roleBtnActive: {
    backgroundColor: '#154212',
    borderColor: '#154212',
  },
  roleBtnText: { fontSize: 12, fontWeight: '600', color: '#5b5f5c' },
  roleBtnTextActive: { color: '#ffffff', fontWeight: 'bold' },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    marginBottom: 8,
  },
  btnModalCancel: {
    flex: 1,
    height: 46,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#154212',
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnModalCancelText: { color: '#154212', fontSize: 14, fontWeight: 'bold' },
  btnModalSave: {
    flex: 1,
    height: 46,
    borderRadius: 8,
    backgroundColor: '#154212',
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnModalSaveText: { color: '#ffffff', fontSize: 14, fontWeight: 'bold' },
});
