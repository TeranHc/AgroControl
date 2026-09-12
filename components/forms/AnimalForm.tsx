import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, 
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator, Modal, FlatList, Image
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../../lib/supabase';
import { useActiveFinca } from '../../contexts/ActiveFincaContext';
import { SelectInput } from '../SelectInput';
import CustomAlert, { AlertType } from '../CustomAlert';

interface AnimalFormProps {
  onClose: () => void;
  onSuccess: () => void;
  initialData?: any; // Para modo edición
}

// Lista detallada de especies con su prefijo para autogenerar códigos
export const ESPECIES = [
  { label: 'Vaca', value: 'Vaca', prefix: 'VA' },
  { label: 'Toro', value: 'Toro', prefix: 'TO' },
  { label: 'Caballo / Yegua', value: 'Caballo', prefix: 'CA' },
  { label: 'Cerdo', value: 'Cerdo', prefix: 'CE' },
  { label: 'Oveja', value: 'Oveja', prefix: 'OV' },
  { label: 'Cabra', value: 'Cabra', prefix: 'CB' },
  { label: 'Pollo / Gallina', value: 'Pollo', prefix: 'PO' },
  { label: 'Otro', value: 'Otro', prefix: 'AN' },
];


export default function AnimalForm({ onClose, onSuccess, initialData }: AnimalFormProps) {
  const { activeFinca } = useActiveFinca();
  const [loading, setLoading] = useState(false);

  const isEditing = !!initialData;

  // Animales de la finca para Genealogía y verificación
  const [animalesFinca, setAnimalesFinca] = useState<any[]>([]);

  // Alerta Customizada
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'warning' as AlertType,
    onConfirm: () => {},
  });

  const showAlert = (title: string, message: string, type: AlertType, onConfirm: () => void = () => setAlertConfig(prev => ({ ...prev, visible: false }))) => {
    setAlertConfig({ visible: true, title, message, type, onConfirm });
  };

  // Estados del formulario alineados con la base de datos
  const [fincaId, setFincaId] = useState(initialData?.finca_id || '');
  const [codigo, setCodigo] = useState(initialData?.codigo_animal || '');
  const [nombre, setNombre] = useState(initialData?.nombre || '');
  const [especie, setEspecie] = useState(initialData?.especie || '');
  const [raza, setRaza] = useState(initialData?.raza || '');
  const [genero, setGenero] = useState(initialData?.genero || '');
  const [proposito, setProposito] = useState(initialData?.proposito || '');
  const [estado, setEstado] = useState(initialData?.estado || 'Activo');
  const [madreId, setMadreId] = useState(initialData?.madre_id || '');
  const [padreId, setPadreId] = useState(initialData?.padre_id || '');
  const [notas, setNotas] = useState(initialData?.notas || '');

  // Validación y autollenado de código
  const [codigoError, setCodigoError] = useState('');
  const [generandoCodigo, setGenerandoCodigo] = useState(false);

  // Foto
  const [imageUri, setImageUri] = useState<string | null>(initialData?.fotografia_url || null);

  // Fecha de nacimiento y Calendario
  const [fechaNacimiento, setFechaNacimiento] = useState<Date | null>(
    initialData?.fecha_nacimiento ? new Date(initialData.fecha_nacimiento) : null
  );
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Ya no necesitamos fincasList ni fetchFincas porque usamos el contexto
  useEffect(() => {
    if (activeFinca) {
      setFincaId(activeFinca.id);
    }
  }, [activeFinca]);

  // 2. Cargar los animales de la finca activa (para Genealogía)
  useEffect(() => {
    const fetchAnimalesFinca = async () => {
      if (!fincaId) return;
      try {
        const { data, error } = await supabase
          .from('animales')
          .select('id, codigo_animal, nombre, genero, especie')
          .eq('finca_id', fincaId)
          .order('codigo_animal', { ascending: true });

        if (error) throw error;
        setAnimalesFinca(data || []);
      } catch (err) {
        console.error('Error cargando animales de la finca:', err);
      }
    };
    fetchAnimalesFinca();
  }, [fincaId]);

  // 3. Autogenerar el siguiente código según la especie seleccionada
  const autoGenerarCodigo = async (fincaIdTarget: string, prefijo: string) => {
    if (!fincaIdTarget || !prefijo) return;
    setGenerandoCodigo(true);
    try {
      const { data, error } = await supabase
        .from('animales')
        .select('codigo_animal')
        .eq('finca_id', fincaIdTarget)
        .ilike('codigo_animal', `${prefijo}-%`);

      if (error) throw error;

      let maxNum = 0;
      if (data && data.length > 0) {
        data.forEach((item) => {
          const match = item.codigo_animal.match(new RegExp(`^${prefijo}-(\\d+)$`, 'i'));
          if (match && match[1]) {
            const num = parseInt(match[1], 10);
            if (!isNaN(num) && num > maxNum) {
              maxNum = num;
            }
          }
        });
      }

      const siguienteNumero = maxNum + 1;
      const nuevoCodigo = `${prefijo}-${String(siguienteNumero).padStart(3, '0')}`;
      setCodigo(nuevoCodigo);
      setCodigoError('');
    } catch (err) {
      console.error('Error auto-generando código:', err);
    } finally {
      setGenerandoCodigo(false);
    }
  };

  // Manejador al elegir una especie
  const handleSelectEspecie = (nuevaEspecie: string) => {
    setEspecie(nuevaEspecie);

    // Sugerencia de género según la especie
    if (nuevaEspecie === 'Vaca' && !genero) setGenero('Hembra');
    if (nuevaEspecie === 'Toro' && !genero) setGenero('Macho');

    // Buscar prefijo
    const espObj = ESPECIES.find(e => e.value === nuevaEspecie);
    const prefijo = espObj ? espObj.prefix : nuevaEspecie.substring(0, 2).toUpperCase();

    // Resetear genealogía si cambia de especie para evitar incoherencias
    setMadreId('');
    setPadreId('');

    if (fincaId) {
      autoGenerarCodigo(fincaId, prefijo);
    }
  };

  // 4. Validar unicidad del código en tiempo real
  const validarCodigoUnico = async (codigoTexto: string) => {
    const limpio = codigoTexto.trim();
    if (!limpio || !fincaId) {
      setCodigoError('');
      return true;
    }

    try {
      let query = supabase
        .from('animales')
        .select('id')
        .eq('finca_id', fincaId)
        .ilike('codigo_animal', limpio);

      if (isEditing && initialData?.id) {
        query = query.neq('id', initialData.id);
      }

      const { data, error } = await query.maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setCodigoError(`⚠️ El código "${limpio}" ya está registrado en esta finca.`);
        return false;
      } else {
        setCodigoError('');
        return true;
      }
    } catch (err) {
      console.error('Error validando unicidad del código:', err);
      return true;
    }
  };

  // 5. Opciones para Genealogía (Madres y Padres filtrados por género y especie compatible)
  const esEspecieBovina = especie === 'Vaca' || especie === 'Toro';

  const opcionesMadres = [
    { label: 'Ninguna / Desconocida', value: '' },
    ...animalesFinca
      .filter((a) => {
        const esHembra = a.genero?.toLowerCase() === 'hembra';
        if (!esHembra) return false;
        if (!especie) return true;
        if (esEspecieBovina) {
          return a.especie?.toLowerCase() === 'vaca' || a.especie?.toLowerCase() === 'toro' || a.especie?.toLowerCase() === 'bovino';
        }
        return a.especie?.toLowerCase() === especie.toLowerCase();
      })
      .map((a) => ({
        label: `${a.codigo_animal} - ${a.nombre || 'Sin nombre'} (${a.especie})`,
        value: a.id
      }))
  ];

  const opcionesPadres = [
    { label: 'Ninguno / Desconocido', value: '' },
    ...animalesFinca
      .filter((a) => {
        const esMacho = a.genero?.toLowerCase() === 'macho';
        if (!esMacho) return false;
        if (!especie) return true;
        if (esEspecieBovina) {
          return a.especie?.toLowerCase() === 'toro' || a.especie?.toLowerCase() === 'vaca' || a.especie?.toLowerCase() === 'bovino';
        }
        return a.especie?.toLowerCase() === especie.toLowerCase();
      })
      .map((a) => ({
        label: `${a.codigo_animal} - ${a.nombre || 'Sin nombre'} (${a.especie})`,
        value: a.id
      }))
  ];

  // Galería de fotos
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImageUri(result.assets[0].uri);
    }
  };

  // Manejo de Calendario
  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setFechaNacimiento(selectedDate);
    }
  };

  // Formato local de fecha YYYY-MM-DD sin desfase horario
  const formatLocalDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Subir foto a Supabase Storage
  const uploadPhoto = async (uri: string, codigoAnimal: string) => {
    try {
      let base64: string;
      if (Platform.OS === 'web') {
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
      console.error('Error subiendo fotografía:', error);
      return null;
    }
  };

  // Guardar en Supabase
  const handleSave = async () => {
    if (!fincaId || !codigo.trim() || !especie || !raza.trim() || !genero || !proposito) {
      showAlert('Campos Obligatorios', 'Por favor complete todos los campos marcados con *', 'warning');
      return;
    }

    setLoading(true);

    try {
      // Validar unicidad de código
      const esUnico = await validarCodigoUnico(codigo);
      if (!esUnico) {
        showAlert(
          'Código ya existe', 
          `El código "${codigo.trim()}" ya está registrado en esta finca. Por favor modifíquelo por uno único.`,
          'error'
        );
        setLoading(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No hay usuario autenticado');

      // 1. Subir fotografía si existe y es nueva
      let fotoUrl = null;
      if (imageUri) {
        if (imageUri.startsWith('http')) {
          fotoUrl = imageUri; // Ya es una URL de Supabase
        } else {
          fotoUrl = await uploadPhoto(imageUri, codigo.trim());
        }
      }

      // 2. Preparar fecha
      const fechaFormateada = fechaNacimiento ? formatLocalDate(fechaNacimiento) : null;

      // 3. Insertar o Actualizar animal en Supabase
      const payload = {
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
        madre_id: madreId || null,
        padre_id: padreId || null,
        notas: notas.trim() || null
      };

      if (fotoUrl) {
        // @ts-ignore
        payload.fotografia_url = fotoUrl;
      }

      let error;
      if (isEditing && initialData?.id) {
        const { error: updateError } = await supabase
          .from('animales')
          .update(payload)
          .eq('id', initialData.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('animales')
          .insert(payload);
        error = insertError;
      }

      if (error) throw error;

      showAlert(
        '¡Éxito!', 
        isEditing ? 'Animal actualizado correctamente.' : 'Animal registrado correctamente.', 
        'success',
        () => {
          setAlertConfig(prev => ({ ...prev, visible: false }));
          onSuccess();
          onClose();
        }
      );
    } catch (error: any) {
      console.error(error);
      showAlert('Error al registrar', error.message || 'Ocurrió un problema al guardar el animal', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.iconButton}>
          <MaterialIcons name="arrow-back" size={24} color="#42493e" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditing ? 'Editar Animal' : 'Registrar Animal'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
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

          {/* Código del animal con indicador de autollenado */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={styles.label}>Código del Animal *</Text>
            {generandoCodigo && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <ActivityIndicator size="small" color="#154212" />
                <Text style={{ fontSize: 11, color: '#154212' }}>Calculando código...</Text>
              </View>
            )}
          </View>
          
          <TextInput 
            style={[styles.input, codigoError ? styles.inputError : null]} 
            placeholder="Ej: VA-001" 
            value={codigo} 
            onChangeText={(text) => {
              setCodigo(text);
              validarCodigoUnico(text);
            }} 
            onBlur={() => validarCodigoUnico(codigo)}
          />
          {codigoError ? (
            <View style={styles.errorContainer}>
              <MaterialIcons name="error-outline" size={16} color="#ba1a1a" />
              <Text style={styles.errorText}>{codigoError}</Text>
            </View>
          ) : (
            <Text style={styles.helperText}>
              Código editable único dentro de tu finca. Se autocompleta al elegir la especie.
            </Text>
          )}

          <Text style={styles.label}>Nombre (Opcional)</Text>
          <TextInput 
            style={styles.input} 
            placeholder="Ej: Lucero, Campeón..." 
            value={nombre} 
            onChangeText={setNombre} 
          />
        </View>

        {/* Características */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionTitleRow}>
            <MaterialIcons name="pets" size={20} color="#154212" />
            <Text style={styles.sectionTitle}>Características</Text>
          </View>

          {/* Especie y Raza */}
          <View style={styles.row}>
            <SelectInput 
              label="Especie *" 
              value={especie} 
              onSelect={handleSelectEspecie} 
              placeholder="Seleccione..."
              options={ESPECIES} 
            />
            <View style={{ width: 14 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Raza *</Text>
              <TextInput 
                style={styles.input} 
                placeholder="Ej: Holstein, Angus..." 
                value={raza} 
                onChangeText={setRaza} 
              />
            </View>
          </View>

          {/* Género y Fecha de Nacimiento (Calendario) */}
          <View style={styles.row}>
            <SelectInput 
              label="Género *" 
              value={genero} 
              onSelect={setGenero} 
              placeholder="Seleccione..."
              options={[
                { label: 'Macho', value: 'Macho' },
                { label: 'Hembra', value: 'Hembra' }
              ]} 
            />
            <View style={{ width: 14 }} />
            
            {/* Campo con Calendario */}
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>F. Nacimiento</Text>
              {Platform.OS === 'web' ? (
                <input
                  type="date"
                  max={new Date().toISOString().split('T')[0]}
                  value={fechaNacimiento ? formatLocalDate(fechaNacimiento) : ''}
                  onChange={(e: any) => {
                    if (e.target.value) {
                      setFechaNacimiento(new Date(e.target.value + 'T12:00:00'));
                    } else {
                      setFechaNacimiento(null);
                    }
                  }}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #c2c9bb',
                    borderRadius: '8px',
                    padding: '0 12px',
                    height: '46px',
                    fontSize: '14px',
                    color: '#1a1c19',
                    width: '100%',
                    boxSizing: 'border-box',
                    outline: 'none',
                    fontFamily: 'inherit',
                  }}
                />
              ) : (
                <>
                  <TouchableOpacity 
                    style={styles.selectInput} 
                    onPress={() => setShowDatePicker(true)}
                    activeOpacity={0.7}
                  >
                    <Text style={{ color: fechaNacimiento ? '#1a1c19' : '#9ca3af', fontSize: 14 }}>
                      {fechaNacimiento ? fechaNacimiento.toLocaleDateString() : 'DD/MM/AAAA'}
                    </Text>
                    <MaterialIcons name="calendar-month" size={22} color="#154212" />
                  </TouchableOpacity>

                  {/* Calendario para iOS en Modal */}
                  {Platform.OS === 'ios' && (
                    <Modal
                      visible={showDatePicker}
                      transparent
                      animationType="fade"
                      onRequestClose={() => setShowDatePicker(false)}
                    >
                      <TouchableOpacity 
                        style={styles.modalOverlay} 
                        activeOpacity={1} 
                        onPress={() => setShowDatePicker(false)}
                      >
                        <View style={styles.calendarModalContent}>
                          <View style={styles.calendarModalHeader}>
                            <Text style={styles.modalTitle}>Fecha de Nacimiento</Text>
                            <TouchableOpacity 
                              style={styles.btnDoneCalendar} 
                              onPress={() => setShowDatePicker(false)}
                            >
                              <Text style={styles.btnDoneCalendarText}>Listo</Text>
                            </TouchableOpacity>
                          </View>
                          <DateTimePicker
                            value={fechaNacimiento || new Date()}
                            mode="date"
                            display="inline"
                            maximumDate={new Date()}
                            onChange={handleDateChange}
                          />
                        </View>
                      </TouchableOpacity>
                    </Modal>
                  )}

                  {/* Calendario para Android */}
                  {Platform.OS === 'android' && showDatePicker && (
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

          {/* Propósito y Estado */}
          <View style={styles.row}>
            <SelectInput 
              label="Propósito *" 
              value={proposito} 
              onSelect={setProposito} 
              placeholder="Seleccione..."
              options={[
                { label: 'Carne', value: 'Carne' },
                { label: 'Leche', value: 'Leche' },
                { label: 'Doble Propósito', value: 'Doble Propósito' },
                { label: 'Cría', value: 'Cría' },
                { label: 'Trabajo / Monta', value: 'Trabajo' }
              ]} 
            />
            <View style={{ width: 14 }} />
            <SelectInput 
              label="Estado *" 
              value={estado} 
              onSelect={setEstado} 
              placeholder="Seleccione..."
              options={[
                { label: 'Activo', value: 'Activo' },
                { label: 'Enfermo / Tratamiento', value: 'Enfermo' },
                { label: 'En Cuarentena', value: 'Cuarentena' },
                { label: 'Vendido', value: 'Vendido' },
                { label: 'Fallecido', value: 'Fallecido' }
              ]} 
            />
          </View>
        </View>

        {/* Genealogía con Selectores de Código y Nombre */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionTitleRow}>
            <MaterialIcons name="account-tree" size={20} color="#154212" />
            <Text style={styles.sectionTitle}>Genealogía</Text>
          </View>
          <Text style={styles.helperText}>
            Seleccione la madre y el padre a partir de los animales registrados en su finca ({especie || 'Todas las especies'}).
          </Text>

          <View style={{ marginTop: 8 }}>
            <SelectInput
              label="Madre (Opcional)"
              value={madreId}
              options={opcionesMadres}
              onSelect={setMadreId}
              placeholder={opcionesMadres.length > 1 ? "Seleccionar hembra..." : "No hay hembras registradas"}
            />
          </View>

          <View style={{ marginTop: 12 }}>
            <SelectInput
              label="Padre (Opcional)"
              value={padreId}
              options={opcionesPadres}
              onSelect={setPadreId}
              placeholder={opcionesPadres.length > 1 ? "Seleccionar macho..." : "No hay machos registrados"}
            />
          </View>
        </View>

        {/* Notas y Observaciones */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionTitleRow}>
            <MaterialIcons name="note" size={20} color="#154212" />
            <Text style={styles.sectionTitle}>Notas y Observaciones</Text>
          </View>
          <Text style={styles.label}>Información Adicional</Text>
          <TextInput 
            style={[styles.input, styles.textArea]} 
            placeholder="Señas particulares, tatuajes, marcas, temperamento..." 
            multiline 
            numberOfLines={4} 
            value={notas} 
            onChangeText={setNotas} 
          />
        </View>
      </ScrollView>

      {/* Botones de Acción Footer */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.btnCancel} onPress={onClose} disabled={loading}>
          <Text style={styles.btnCancelText}>Cancelar</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.btnSave} onPress={handleSave} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.btnSaveText}>{isEditing ? 'Guardar Cambios' : 'Registrar Animal'}</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Alerta Personalizada */}
      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onConfirm={alertConfig.onConfirm}
      />
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
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#154212' },
  photoUploadBox: {
    alignItems: 'center', justifyContent: 'center', padding: 20, marginBottom: 16,
    borderWidth: 2, borderColor: '#e3e3de', borderStyle: 'dashed', borderRadius: 12, backgroundColor: '#f4f4ee', overflow: 'hidden'
  },
  photoPreview: { width: '100%', height: 200, borderRadius: 8 },
  photoCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#e3e3de', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  photoText: { fontSize: 12, fontWeight: 'bold', color: '#154212' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  label: { fontSize: 11, fontWeight: '700', color: '#42493e', textTransform: 'uppercase', marginBottom: 6, marginTop: 10, letterSpacing: 0.5 },
  helperText: { fontSize: 12, color: '#72796e', marginTop: 4, marginBottom: 6 },
  input: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#c2c9bb', borderRadius: 8, paddingHorizontal: 12, height: 46, fontSize: 14, color: '#1a1c19' },
  inputError: { borderColor: '#ba1a1a', backgroundColor: '#fff8f7' },
  errorContainer: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  errorText: { color: '#ba1a1a', fontSize: 12, fontWeight: '500' },
  selectInput: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#c2c9bb', borderRadius: 8, paddingHorizontal: 12, height: 46 },
  textArea: { height: 90, paddingTop: 12, textAlignVertical: 'top' },
  footer: { flexDirection: 'row', padding: 16, backgroundColor: '#ffffff', borderTopWidth: 1, borderTopColor: '#e3e3de', gap: 12 },
  btnCancel: { flex: 1, height: 48, borderRadius: 8, borderWidth: 1, borderColor: '#154212', justifyContent: 'center', alignItems: 'center' },
  btnCancelText: { color: '#154212', fontSize: 14, fontWeight: 'bold' },
  btnSave: { flex: 1, flexDirection: 'row', height: 48, backgroundColor: '#154212', borderRadius: 8, justifyContent: 'center', alignItems: 'center', gap: 8 },
  btnSaveText: { color: '#ffffff', fontSize: 14, fontWeight: 'bold' },
  
  // Modales
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '75%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 17, fontWeight: 'bold', color: '#154212' },
  modalSearchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f4f4ee', borderRadius: 8, paddingHorizontal: 10, height: 40, marginBottom: 12 },
  modalSearchInput: { flex: 1, fontSize: 14, color: '#1a1c19' },
  modalOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f0f0ea' },
  modalOptionSelected: { backgroundColor: '#e8f5e9', paddingHorizontal: 8, borderRadius: 6 },
  modalOptionText: { fontSize: 15, color: '#1a1c19' },
  modalOptionTextSelected: { fontWeight: 'bold', color: '#154212' },
  emptyOptionsText: { textAlign: 'center', color: '#72796e', paddingVertical: 20, fontStyle: 'italic' },
  calendarModalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  calendarModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  btnDoneCalendar: { backgroundColor: '#154212', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  btnDoneCalendarText: { color: '#ffffff', fontWeight: 'bold', fontSize: 13 }
});