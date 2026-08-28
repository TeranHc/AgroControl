import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, 
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator, Modal, FlatList, Image
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../../lib/supabase';

interface AnimalFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

// --- COMPONENTE CUSTOM PARA LAS LISTAS DESPLEGABLES ---
const SelectInput = ({ label, value, options, onSelect, placeholder }: any) => {
  const [modalVisible, setModalVisible] = useState(false);
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={styles.selectInput} onPress={() => setModalVisible(true)}>
        <Text style={{ color: value ? '#1a1c19' : '#9ca3af', fontSize: 14 }}>
          {options.find((o: any) => o.value === value)?.label || placeholder}
        </Text>
        <MaterialIcons name="arrow-drop-down" size={24} color="#72796e" />
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setModalVisible(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Seleccione {label.replace('*', '')}</Text>
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.modalOption}
                  onPress={() => { onSelect(item.value); setModalVisible(false); }}
                >
                  <Text style={styles.modalOptionText}>{item.label}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};
// -------------------------------------------------------

export default function AnimalForm({ onClose, onSuccess }: AnimalFormProps) {
  const [loading, setLoading] = useState(false);
  const [fincasList, setFincasList] = useState<{label: string, value: string}[]>([]);

  // Estados alineados con la BD
  const [fincaId, setFincaId] = useState('');
  const [codigo, setCodigo] = useState('');
  const [nombre, setNombre] = useState('');
  const [especie, setEspecie] = useState('');
  const [raza, setRaza] = useState('');
  const [genero, setGenero] = useState('');
  const [proposito, setProposito] = useState('');
  const [estado, setEstado] = useState('Activo');
  const [madreId, setMadreId] = useState('');
  const [padreId, setPadreId] = useState('');
  const [notas, setNotas] = useState('');

  // Estado para la Foto
  const [imageUri, setImageUri] = useState<string | null>(null);

  // Estado del Calendario
  const [fechaNacimiento, setFechaNacimiento] = useState<Date | null>(null);
  const [fechaStringWeb, setFechaStringWeb] = useState(''); // Fallback para Web
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    const fetchFincas = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('miembros_finca')
        .select(`finca_id, fincas ( nombre )`)
        .eq('user_id', user.id);

      if (data) {
        const opcionesFincas = data.map((item: any) => ({
          value: item.finca_id,
          label: Array.isArray(item.fincas) ? item.fincas[0]?.nombre : item.fincas?.nombre || 'Finca sin nombre'
        }));
        
        setFincasList(opcionesFincas);
        if (opcionesFincas.length > 0) {
          setFincaId(opcionesFincas[0].value);
        }
      }
    };
    fetchFincas();
  }, []);

  // Función para abrir la galería
  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5, // Optimizar para que suba rápido
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setFechaNacimiento(selectedDate);
    }
  };

  // Función para subir foto a Supabase
  const uploadPhoto = async (uri: string, codigoAnimal: string) => {
    try {
      let base64;
      if (Platform.OS === 'web') {
        // En web hay que extraer el base64 de la URI de forma diferente
        const response = await fetch(uri);
        const blob = await response.blob();
        const reader = new FileReader();
        await new Promise((resolve, reject) => {
          reader.onload = resolve;
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        const resultBase64 = reader.result as string;
        base64 = resultBase64.split(',')[1];
      } else {
        // En celular usamos expo-file-system
        base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
      }

      const fileName = `${codigoAnimal}_${new Date().getTime()}.jpg`;
      const filePath = `animales/${fileName}`;

      const { error } = await supabase.storage
        .from('fotografias_animales')
        .upload(filePath, decode(base64), { contentType: 'image/jpeg' });

      if (error) throw error;

      const { data: publicUrlData } = supabase.storage
        .from('fotografias_animales')
        .getPublicUrl(filePath);

      return publicUrlData.publicUrl;
    } catch (error) {
      console.error("Error subiendo la imagen: ", error);
      return null;
    }
  };

  const handleSave = async () => {
    if (!fincaId || !codigo || !especie || !raza || !genero || !proposito) {
      Alert.alert('Campos Obligatorios', 'Por favor complete todos los campos marcados con *');
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No hay usuario autenticado');

      // 1. Subir la imagen si el usuario seleccionó una
      let fotoUrl = null;
      if (imageUri) {
        fotoUrl = await uploadPhoto(imageUri, codigo.trim());
      }

      // 2. Preparar fecha de nacimiento (Dependiendo si es web o móvil)
      let fechaFormateada = null;
      if (Platform.OS === 'web' && fechaStringWeb) {
        fechaFormateada = fechaStringWeb;
      } else if (fechaNacimiento) {
        fechaFormateada = fechaNacimiento.toISOString().split('T')[0];
      }

      // 3. Insertar el Animal
      const { error: insertError } = await supabase
        .from('animales')
        .insert({
          finca_id: fincaId,
          registrado_por: user.id,
          codigo_animal: codigo.trim(),
          nombre: nombre.trim() || null,
          especie: especie,
          raza: raza.trim(),
          genero: genero,
          fecha_nacimiento: fechaFormateada,
          proposito: proposito,
          estado: estado,
          fotografia_url: fotoUrl, // Guardamos la URL pública aquí
          notas: notas.trim() || null,
          ...(madreId.trim() ? { madre_id: madreId.trim() } : {}),
          ...(padreId.trim() ? { padre_id: padreId.trim() } : {}),
        });

      if (insertError) throw insertError;

      Alert.alert('¡Éxito!', 'El animal ha sido registrado correctamente.');
      onSuccess();
      onClose();

    } catch (error: any) {
      console.error(error);
      Alert.alert('Error', error.message || 'Ocurrió un error al guardar el animal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.iconButton}>
          <MaterialIcons name="arrow-back" size={24} color="#42493e" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Registrar Animal</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.sectionCard}>
          <SelectInput 
            label="¿A qué finca pertenece? *" 
            value={fincaId} 
            options={fincasList} 
            onSelect={setFincaId} 
            placeholder="Cargando fincas..." 
          />
        </View>

        {/* Identificación */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionTitleRow}>
            <MaterialIcons name="badge" size={20} color="#154212" />
            <Text style={styles.sectionTitle}>Identificación</Text>
          </View>
          
          <TouchableOpacity style={styles.photoUploadBox} onPress={pickImage}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.photoPreview} />
            ) : (
              <>
                <View style={styles.photoCircle}>
                  <MaterialIcons name="add-a-photo" size={32} color="#72796e" />
                </View>
                <Text style={styles.photoText}>Subir Fotografía</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.label}>Código del Animal *</Text>
          <TextInput style={styles.input} placeholder="Ej: VA-001" value={codigo} onChangeText={setCodigo} />

          <Text style={styles.label}>Nombre (Opcional)</Text>
          <TextInput style={styles.input} placeholder="Ej: Lucero" value={nombre} onChangeText={setNombre} />
        </View>

        {/* Características */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionTitleRow}>
            <MaterialIcons name="pets" size={20} color="#154212" />
            <Text style={styles.sectionTitle}>Características</Text>
          </View>

          <View style={styles.row}>
            <SelectInput label="Especie *" value={especie} onSelect={setEspecie} placeholder="Seleccione..."
              options={[
                { label: 'Bovino', value: 'Bovino' },
                { label: 'Equino', value: 'Equino' },
                { label: 'Porcino', value: 'Porcino' },
                { label: 'Ovino', value: 'Ovino' },
                { label: 'Caprino', value: 'Caprino' }
              ]} 
            />
            <View style={{ width: 16 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Raza *</Text>
              <TextInput style={styles.input} placeholder="Angus, Holstein..." value={raza} onChangeText={setRaza} />
            </View>
          </View>

          <View style={styles.row}>
            <SelectInput label="Género *" value={genero} onSelect={setGenero} placeholder="Seleccione..."
              options={[
                { label: 'Macho', value: 'Macho' },
                { label: 'Hembra', value: 'Hembra' }
              ]} 
            />
            <View style={{ width: 16 }} />
            
            {/* LÓGICA DEFENSIVA PARA EL CALENDARIO */}
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>F. Nacimiento</Text>
              {Platform.OS === 'web' ? (
                // En web ponemos un campo de texto simple para no romper la app
                <TextInput 
                  style={styles.input} 
                  placeholder="YYYY-MM-DD" 
                  value={fechaStringWeb} 
                  onChangeText={setFechaStringWeb} 
                />
              ) : (
                // En celular usamos el modal nativo
                <>
                  <TouchableOpacity style={styles.selectInput} onPress={() => setShowDatePicker(true)}>
                    <Text style={{ color: fechaNacimiento ? '#1a1c19' : '#9ca3af', fontSize: 14 }}>
                      {fechaNacimiento ? fechaNacimiento.toLocaleDateString() : 'DD/MM/YYYY'}
                    </Text>
                    <MaterialIcons name="calendar-today" size={20} color="#72796e" />
                  </TouchableOpacity>
                  
                  {showDatePicker && (
                    <DateTimePicker
                      value={fechaNacimiento || new Date()}
                      mode="date"
                      display="default"
                      maximumDate={new Date()}
                      onChange={handleDateChange}
                    />
                  )}
                </>
              )}
            </View>
          </View>

          <View style={styles.row}>
            <SelectInput label="Propósito *" value={proposito} onSelect={setProposito} placeholder="Seleccione..."
              options={[
                { label: 'Carne', value: 'Carne' },
                { label: 'Leche', value: 'Leche' },
                { label: 'Doble Propósito', value: 'Doble Propósito' },
                { label: 'Cría', value: 'Cría' },
                { label: 'Trabajo', value: 'Trabajo' }
              ]} 
            />
            <View style={{ width: 16 }} />
            <SelectInput label="Estado *" value={estado} onSelect={setEstado} placeholder="Seleccione..."
              options={[
                { label: 'Activo', value: 'Activo' },
                { label: 'En Cuarentena', value: 'Cuarentena' },
                { label: 'Vendido', value: 'Vendido' },
                { label: 'Fallecido', value: 'Fallecido' }
              ]} 
            />
          </View>
        </View>

        {/* Genealogía */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionTitleRow}>
            <MaterialIcons name="account-tree" size={20} color="#154212" />
            <Text style={styles.sectionTitle}>Genealogía</Text>
          </View>
          <Text style={styles.label}>Madre (ID Opcional)</Text>
          <TextInput style={styles.input} placeholder="UUID de la madre..." value={madreId} onChangeText={setMadreId} />
          <Text style={styles.label}>Padre (ID Opcional)</Text>
          <TextInput style={styles.input} placeholder="UUID del padre..." value={padreId} onChangeText={setPadreId} />
        </View>

        {/* Información Adicional */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionTitleRow}>
            <MaterialIcons name="note" size={20} color="#154212" />
            <Text style={styles.sectionTitle}>Información Adicional</Text>
          </View>
          <Text style={styles.label}>Notas / Observaciones</Text>
          <TextInput style={[styles.input, styles.textArea]} placeholder="Información extra..." multiline numberOfLines={4} value={notas} onChangeText={setNotas} />
        </View>
      </ScrollView>

      {/* Footer de Acciones */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.btnCancel} onPress={onClose} disabled={loading}>
          <Text style={styles.btnCancelText}>Cancelar</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.btnSave} onPress={handleSave} disabled={loading}>
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <MaterialIcons name="save" size={18} color="#fff" />
              <Text style={styles.btnSaveText}>Guardar Animal</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f4ee' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 50 : 20, paddingBottom: 16,
    backgroundColor: '#f4f4ee', borderBottomWidth: 1, borderBottomColor: '#e3e3de',
  },
  iconButton: { padding: 8, borderRadius: 20, backgroundColor: '#ffffff' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#154212' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  sectionCard: {
    backgroundColor: '#ffffff', borderRadius: 16, padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: '#e3e3de', shadowColor: '#2d5a27',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 1,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#154212' },
  photoUploadBox: {
    alignItems: 'center', justifyContent: 'center', padding: 20, marginBottom: 16,
    borderWidth: 2, borderColor: '#e3e3de', borderStyle: 'dashed', borderRadius: 12, backgroundColor: '#f4f4ee', overflow: 'hidden'
  },
  photoPreview: { width: '100%', height: 200, borderRadius: 8 },
  photoCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#e3e3de', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  photoText: { fontSize: 12, fontWeight: 'bold', color: '#154212' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  col: { flex: 1 },
  label: { fontSize: 11, fontWeight: '700', color: '#42493e', textTransform: 'uppercase', marginBottom: 6, marginTop: 10, letterSpacing: 0.5 },
  input: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#c2c9bb', borderRadius: 8, paddingHorizontal: 12, height: 46, fontSize: 14, color: '#1a1c19' },
  selectInput: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#c2c9bb', borderRadius: 8, paddingHorizontal: 12, height: 46 },
  textArea: { height: 100, paddingTop: 12, textAlignVertical: 'top' },
  footer: { flexDirection: 'row', padding: 16, backgroundColor: '#ffffff', borderTopWidth: 1, borderTopColor: '#e3e3de', gap: 12 },
  btnCancel: { flex: 1, height: 48, borderRadius: 8, borderWidth: 1, borderColor: '#154212', justifyContent: 'center', alignItems: 'center' },
  btnCancelText: { color: '#154212', fontSize: 14, fontWeight: 'bold' },
  btnSave: { flex: 1, flexDirection: 'row', height: 48, backgroundColor: '#154212', borderRadius: 8, justifyContent: 'center', alignItems: 'center', gap: 8 },
  btnSaveText: { color: '#ffffff', fontSize: 14, fontWeight: 'bold' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '60%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#154212', marginBottom: 16, textAlign: 'center' },
  modalOption: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#e3e3de' },
  modalOptionText: { fontSize: 16, color: '#1a1c19', textAlign: 'center' }
});