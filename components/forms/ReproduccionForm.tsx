import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '../../lib/supabase';
import { useActiveFinca } from '../../contexts/ActiveFincaContext';
import { SelectInput } from '../SelectInput';
import CustomAlert, { AlertType } from '../CustomAlert';

interface ReproduccionFormProps {
  onClose: () => void;
  onSuccess: () => void;
  initialAnimalId?: string;
  initialData?: any;
}

export default function ReproduccionForm({ onClose, onSuccess, initialAnimalId, initialData }: ReproduccionFormProps) {
  const isEditing = !!initialData;
  const { activeFinca } = useActiveFinca();
  const [loading, setLoading] = useState(false);
  const [hembras, setHembras] = useState<{ label: string; value: string }[]>([]);
  const [machos, setMachos] = useState<{ label: string; value: string }[]>([]);

  // Estados del formulario
  const [animalId, setAnimalId] = useState(initialData?.animal_id || initialAnimalId || ''); // La hembra
  const [machoId, setMachoId] = useState(initialData?.macho_id || '');
  const [tipoEvento, setTipoEvento] = useState(initialData?.tipo_evento || '');
  
  const [fechaEvento, setFechaEvento] = useState<Date>(initialData?.fecha_evento ? new Date(initialData.fecha_evento + 'T12:00:00') : new Date());
  const [showDatePickerEvento, setShowDatePickerEvento] = useState(false);
  
  const [estadoGestacion, setEstadoGestacion] = useState(initialData?.estado_gestacion || '');
  
  const [fechaProbableParto, setFechaProbableParto] = useState<Date | null>(initialData?.fecha_probable_parto ? new Date(initialData.fecha_probable_parto + 'T12:00:00') : null);
  const [showDatePickerParto, setShowDatePickerParto] = useState(false);
  
  const [criasNacidas, setCriasNacidas] = useState(initialData?.crias_nacidas?.toString() || '');
  const [notas, setNotas] = useState(initialData?.notas || '');

  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'info' as AlertType,
    onConfirm: () => {},
  });

  const showAlert = (title: string, message: string, type: AlertType, onConfirm: () => void = () => setAlertConfig(prev => ({ ...prev, visible: false }))) => {
    setAlertConfig({ visible: true, title, message, type, onConfirm });
  };

  useEffect(() => {
    const fetchAnimales = async () => {
      if (!activeFinca) return;
      try {
        const { data, error } = await supabase
          .from('animales')
          .select('id, codigo_animal, nombre, especie, genero')
          .eq('finca_id', activeFinca.id)
          .eq('estado', 'Activo')
          .order('codigo_animal', { ascending: true });

        if (error) throw error;
        if (data) {
          const hembrasFiltered = data.filter(a => a.genero === 'Hembra').map(a => ({
            label: `${a.codigo_animal} - ${a.nombre || 'Sin nombre'} (${a.especie})`,
            value: a.id
          }));
          const machosFiltered = data.filter(a => a.genero === 'Macho').map(a => ({
            label: `${a.codigo_animal} - ${a.nombre || 'Sin nombre'} (${a.especie})`,
            value: a.id
          }));
          
          setHembras(hembrasFiltered);
          setMachos([{ label: 'Desconocido / Inseminación Externa', value: '' }, ...machosFiltered]);
        }
      } catch (err) {
        console.error('Error cargando animales:', err);
      }
    };
    fetchAnimales();
  }, [activeFinca]);

  const formatLocalDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleSave = async () => {
    if (!animalId || !tipoEvento.trim() || !fechaEvento) {
      showAlert('Campos Obligatorios', 'Por favor seleccione la hembra, el tipo de evento y la fecha.', 'warning');
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No hay usuario autenticado');
      if (!activeFinca) throw new Error('No hay finca seleccionada');

      const payload = {
        finca_id: activeFinca.id,
        animal_id: animalId,
        registrado_por: user.id,
        tipo_evento: tipoEvento,
        macho_id: machoId || null,
        fecha_evento: formatLocalDate(fechaEvento),
        estado_gestacion: estadoGestacion || null,
        fecha_probable_parto: fechaProbableParto ? formatLocalDate(fechaProbableParto) : null,
        crias_nacidas: criasNacidas ? parseInt(criasNacidas) : null,
        notas: notas.trim() || null
      };

      let error;
      if (isEditing && initialData?.id) {
        const { error: updateError } = await supabase
          .from('reproduccion')
          .update(payload)
          .eq('id', initialData.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('reproduccion')
          .insert(payload);
        error = insertError;
      }

      if (error) throw error;

      showAlert(
        '¡Éxito!', 
        isEditing ? 'El evento reproductivo se ha actualizado correctamente.' : 'El evento reproductivo se ha registrado correctamente.', 
        'success',
        () => {
          setAlertConfig(prev => ({ ...prev, visible: false }));
          onSuccess();
          onClose();
        }
      );
    } catch (error: any) {
      console.error('Error guardando registro de reproduccion:', error);
      showAlert('Error', 'No se pudo guardar el registro: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.iconButton}>
          <MaterialIcons name="close" size={24} color="#42493e" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Registro de Reproducción</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.sectionCard}>
          <SelectInput
            label="Hembra *"
            value={animalId}
            options={hembras}
            onSelect={setAnimalId}
            placeholder={hembras.length > 0 ? "Seleccionar hembra..." : "Cargando hembras..."}
            disabled={!!initialAnimalId}
          />
        </View>

        <View style={styles.sectionCard}>
          <SelectInput
            label="Tipo de Evento *"
            value={tipoEvento}
            options={[
              { label: 'Servicio / Monta / Inseminación', value: 'Servicio' },
              { label: 'Diagnóstico de Gestación', value: 'Diagnóstico' },
              { label: 'Parto', value: 'Parto' },
              { label: 'Aborto', value: 'Aborto' },
              { label: 'Secado', value: 'Secado' }
            ]}
            onSelect={setTipoEvento}
            placeholder="Seleccione evento..."
          />
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Fecha del Evento *</Text>
              {Platform.OS === 'web' ? (
                <input
                  type="date"
                  max={new Date().toISOString().split('T')[0]}
                  value={formatLocalDate(fechaEvento)}
                  onChange={(e: any) => {
                    if (e.target.value) {
                      setFechaEvento(new Date(e.target.value + 'T12:00:00'));
                    }
                  }}
                  style={{
                    backgroundColor: '#ffffff', border: '1px solid #c2c9bb',
                    borderRadius: '8px', padding: '0 12px', height: '46px',
                    fontSize: '14px', color: '#1a1c19', width: '100%',
                    boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit',
                  }}
                />
              ) : Platform.OS === 'ios' ? (
                <DateTimePicker
                  value={fechaEvento}
                  mode="date"
                  display="default"
                  maximumDate={new Date()}
                  onChange={(e, date) => { setShowDatePickerEvento(false); if (date) setFechaEvento(date); }}
                  style={{ alignSelf: 'flex-start', marginTop: 8 }}
                />
              ) : (
                <>
                  <TouchableOpacity style={styles.input} onPress={() => setShowDatePickerEvento(true)} activeOpacity={0.7}>
                    <Text style={{ color: '#1a1c19', marginTop: 12 }}>{formatLocalDate(fechaEvento)}</Text>
                  </TouchableOpacity>
                  {showDatePickerEvento && (
                    <DateTimePicker
                      value={fechaEvento}
                      mode="date"
                      display="default"
                      maximumDate={new Date()}
                      onChange={(e, date) => { setShowDatePickerEvento(false); if (date) setFechaEvento(date); }}
                    />
                  )}
                </>
              )}
            </View>
            <View style={{ width: 14 }} />
            <View style={{ flex: 1 }}>
              <SelectInput
                label="Estado de Gestación"
                value={estadoGestacion}
                options={[
                  { label: 'Pendiente', value: 'Pendiente' },
                  { label: 'Positivo (Preñada)', value: 'Positivo' },
                  { label: 'Negativo (Vacía)', value: 'Negativo' },
                  { label: 'Completado (Parto)', value: 'Completado' }
                ]}
                onSelect={setEstadoGestacion}
                placeholder="Opcional..."
              />
            </View>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <SelectInput
            label="Macho (Servicio / Padre)"
            value={machoId}
            options={machos}
            onSelect={setMachoId}
            placeholder="Seleccionar macho si aplica..."
          />
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Fecha Probable de Parto</Text>
              {Platform.OS === 'web' ? (
                <input
                  type="date"
                  value={fechaProbableParto ? formatLocalDate(fechaProbableParto) : ''}
                  onChange={(e: any) => {
                    if (e.target.value) {
                      setFechaProbableParto(new Date(e.target.value + 'T12:00:00'));
                    } else {
                      setFechaProbableParto(null);
                    }
                  }}
                  style={{
                    backgroundColor: '#ffffff', border: '1px solid #c2c9bb',
                    borderRadius: '8px', padding: '0 12px', height: '46px',
                    fontSize: '14px', color: '#1a1c19', width: '100%',
                    boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit',
                  }}
                />
              ) : Platform.OS === 'ios' ? (
                <DateTimePicker
                  value={fechaProbableParto || new Date()}
                  mode="date"
                  display="default"
                  onChange={(e, date) => { setShowDatePickerParto(false); if (date) setFechaProbableParto(date); }}
                  style={{ alignSelf: 'flex-start', marginTop: 8 }}
                />
              ) : (
                <>
                  <TouchableOpacity style={styles.input} onPress={() => setShowDatePickerParto(true)} activeOpacity={0.7}>
                    <Text style={{ color: fechaProbableParto ? '#1a1c19' : '#9ca3af', marginTop: 12 }}>
                      {fechaProbableParto ? formatLocalDate(fechaProbableParto) : 'Calcular o ingresar...'}
                    </Text>
                  </TouchableOpacity>
                  {showDatePickerParto && (
                    <DateTimePicker
                      value={fechaProbableParto || new Date()}
                      mode="date"
                      display="default"
                      onChange={(e, date) => { setShowDatePickerParto(false); if (date) setFechaProbableParto(date); }}
                    />
                  )}
                </>
              )}
            </View>
            <View style={{ width: 14 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Crías Nacidas (En Parto)</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej. 1"
                keyboardType="numeric"
                value={criasNacidas}
                onChangeText={setCriasNacidas}
              />
            </View>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.label}>Notas y Observaciones</Text>
          <TextInput 
            style={[styles.input, styles.textArea]} 
            placeholder="Detalles sobre complicaciones, número de pajuela, tipo de parto..." 
            multiline 
            numberOfLines={3} 
            value={notas} 
            onChangeText={setNotas} 
          />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.btnCancel} onPress={onClose} disabled={loading}>
          <Text style={styles.btnCancelText}>Cancelar</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.btnSave} onPress={handleSave} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.btnSaveText}>{isEditing ? 'Guardar Cambios' : 'Registrar Evento'}</Text>
          )}
        </TouchableOpacity>
      </View>

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
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  label: { fontSize: 11, fontWeight: '700', color: '#42493e', textTransform: 'uppercase', marginBottom: 6, marginTop: 10, letterSpacing: 0.5 },
  input: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#c2c9bb', borderRadius: 8, paddingHorizontal: 12, height: 46, fontSize: 14, color: '#1a1c19' },
  textArea: { height: 90, paddingTop: 12, textAlignVertical: 'top' },
  footer: { flexDirection: 'row', padding: 16, backgroundColor: '#ffffff', borderTopWidth: 1, borderTopColor: '#e3e3de', gap: 12 },
  btnCancel: { flex: 1, height: 48, borderRadius: 8, borderWidth: 1, borderColor: '#154212', justifyContent: 'center', alignItems: 'center' },
  btnCancelText: { color: '#154212', fontSize: 14, fontWeight: 'bold' },
  btnSave: { flex: 1, flexDirection: 'row', height: 48, backgroundColor: '#154212', borderRadius: 8, justifyContent: 'center', alignItems: 'center', gap: 8 },
  btnSaveText: { color: '#ffffff', fontSize: 14, fontWeight: 'bold' }
});
