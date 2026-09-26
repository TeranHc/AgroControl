import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { supabase } from '../../lib/supabase';
import { useActiveFinca } from '../../contexts/ActiveFincaContext';
import { SelectInput } from '../SelectInput';
import CustomAlert, { AlertType } from '../CustomAlert';

interface SaludFormProps {
  onClose: () => void;
  onSuccess: () => void;
  initialAnimalId?: string;
  initialData?: any;
}

export default function SaludForm({ onClose, onSuccess, initialAnimalId, initialData }: SaludFormProps) {
  const isEditing = !!initialData;
  const { activeFinca } = useActiveFinca();
  const [loading, setLoading] = useState(false);
  const [animales, setAnimales] = useState<{ label: string; value: string }[]>([]);

  // Estados del formulario
  const [animalId, setAnimalId] = useState(initialData?.animal_id || initialAnimalId || '');
  const [tipoEvento, setTipoEvento] = useState(initialData?.tipo_evento || '');
  const [nombreMedicamento, setNombreMedicamento] = useState(initialData?.nombre_medicamento || '');
  const [dosis, setDosis] = useState(initialData?.dosis || '');
  
  const [fechaAplicacion, setFechaAplicacion] = useState<Date>(initialData?.fecha_aplicacion ? new Date(initialData.fecha_aplicacion + 'T12:00:00') : new Date());
  const [showDatePickerApp, setShowDatePickerApp] = useState(false);
  
  const [proximaDosis, setProximaDosis] = useState<Date | null>(initialData?.proxima_dosis ? new Date(initialData.proxima_dosis + 'T12:00:00') : null);
  const [showDatePickerProx, setShowDatePickerProx] = useState(false);
  
  const [veterinario, setVeterinario] = useState(initialData?.veterinario_encargado || initialData?.veterinario || '');
  const [costo, setCosto] = useState(initialData?.costo?.toString() || '');
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
          .select('id, codigo_animal, nombre, especie')
          .eq('finca_id', activeFinca.id)
          .eq('estado', 'Activo')
          .order('codigo_animal', { ascending: true });

        if (error) throw error;
        if (data) {
          setAnimales(data.map(a => ({
            label: `${a.codigo_animal} - ${a.nombre || 'Sin nombre'} (${a.especie})`,
            value: a.id
          })));
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
    if (!animalId || !tipoEvento.trim() || !fechaAplicacion) {
      showAlert('Campos Obligatorios', 'Por favor complete todos los campos marcados con *', 'warning');
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
        nombre_medicamento: nombreMedicamento.trim() || null,
        dosis: dosis.trim() || null,
        fecha_aplicacion: formatLocalDate(fechaAplicacion),
        proxima_dosis: proximaDosis ? formatLocalDate(proximaDosis) : null,
        veterinario_encargado: veterinario.trim() || null,
        costo: costo ? parseFloat(costo.replace(',', '.')) : null,
        notas: notas.trim() || null
      };

      let error;
      if (isEditing && initialData?.id) {
        const { error: updateError } = await supabase
          .from('registros_salud')
          .update(payload)
          .eq('id', initialData.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('registros_salud')
          .insert(payload);
        error = insertError;
      }

      if (error) throw error;

      showAlert(
        '¡Éxito!', 
        isEditing ? 'El registro de salud se ha actualizado correctamente.' : 'El registro de salud se ha guardado correctamente.', 
        'success',
        () => {
          setAlertConfig(prev => ({ ...prev, visible: false }));
          onSuccess();
          onClose();
        }
      );
    } catch (error: any) {
      console.error('Error guardando registro de salud:', error);
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
        <Text style={styles.headerTitle}>Registro de Salud</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.sectionCard}>
          <SelectInput
            label="Animal *"
            value={animalId}
            options={animales}
            onSelect={setAnimalId}
            placeholder={animales.length > 0 ? "Seleccionar animal..." : "Cargando..."}
            disabled={!!initialAnimalId}
          />
        </View>

        <View style={styles.sectionCard}>
          <SelectInput
            label="Tipo de Evento *"
            value={tipoEvento}
            options={[
              { label: 'Vacunación', value: 'Vacunación' },
              { label: 'Desparasitación', value: 'Desparasitación' },
              { label: 'Tratamiento Médico', value: 'Tratamiento Médico' },
              { label: 'Cirugía / Intervención', value: 'Cirugía' },
              { label: 'Chequeo General', value: 'Chequeo General' },
              { label: 'Otro', value: 'Otro' }
            ]}
            onSelect={setTipoEvento}
            placeholder="Seleccione el tipo de evento..."
          />
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Medicamento / Producto</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej. Ivermectina"
                value={nombreMedicamento}
                onChangeText={setNombreMedicamento}
              />
            </View>
            <View style={{ width: 14 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Dosis</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej. 10 ml"
                value={dosis}
                onChangeText={setDosis}
              />
            </View>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Fecha Aplicación *</Text>
              {Platform.OS === 'web' ? (
                <input
                  type="date"
                  max={new Date().toISOString().split('T')[0]}
                  value={formatLocalDate(fechaAplicacion)}
                  onChange={(e: any) => {
                    if (e.target.value) {
                      setFechaAplicacion(new Date(e.target.value + 'T12:00:00'));
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
                  value={fechaAplicacion}
                  mode="date"
                  display="default"
                  maximumDate={new Date()}
                  onValueChange={(e, date) => { setShowDatePickerApp(Platform.OS === 'ios'); if (date) setFechaAplicacion(date); }}
                  onDismiss={() => setShowDatePickerApp(false)}
                  style={{ alignSelf: 'flex-start', marginTop: 8 }}
                />
              ) : (
                <>
                  <TouchableOpacity style={styles.input} onPress={() => setShowDatePickerApp(true)} activeOpacity={0.7}>
                    <Text style={{ color: '#1a1c19', marginTop: 12 }}>{formatLocalDate(fechaAplicacion)}</Text>
                  </TouchableOpacity>
                  {showDatePickerApp && (
                    <DateTimePicker
                      value={fechaAplicacion}
                      mode="date"
                      display="default"
                      maximumDate={new Date()}
                      onValueChange={(e, date) => { setShowDatePickerApp(Platform.OS === 'ios'); if (date) setFechaAplicacion(date); }}
                      onDismiss={() => setShowDatePickerApp(false)}
                    />
                  )}
                </>
              )}
            </View>
            <View style={{ width: 14 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Próxima Dosis</Text>
              {Platform.OS === 'web' ? (
                <input
                  type="date"
                  value={proximaDosis ? formatLocalDate(proximaDosis) : ''}
                  onChange={(e: any) => {
                    if (e.target.value) {
                      setProximaDosis(new Date(e.target.value + 'T12:00:00'));
                    } else {
                      setProximaDosis(null);
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
                  value={proximaDosis || new Date()}
                  mode="date"
                  display="default"
                  onValueChange={(e, date) => { setShowDatePickerProx(Platform.OS === 'ios'); if (date) setProximaDosis(date); }}
                  onDismiss={() => setShowDatePickerProx(false)}
                  style={{ alignSelf: 'flex-start', marginTop: 8 }}
                />
              ) : (
                <>
                  <TouchableOpacity style={styles.input} onPress={() => setShowDatePickerProx(true)} activeOpacity={0.7}>
                    <Text style={{ color: proximaDosis ? '#1a1c19' : '#9ca3af', marginTop: 12 }}>
                      {proximaDosis ? formatLocalDate(proximaDosis) : 'Opcional...'}
                    </Text>
                  </TouchableOpacity>
                  {showDatePickerProx && (
                    <DateTimePicker
                      value={proximaDosis || new Date()}
                      mode="date"
                      display="default"
                      onValueChange={(e, date) => { setShowDatePickerProx(Platform.OS === 'ios'); if (date) setProximaDosis(date); }}
                      onDismiss={() => setShowDatePickerProx(false)}
                    />
                  )}
                </>
              )}
            </View>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Veterinario</Text>
              <TextInput
                style={styles.input}
                placeholder="Nombre (Opcional)"
                value={veterinario}
                onChangeText={setVeterinario}
              />
            </View>
            <View style={{ width: 14 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Costo ($)</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                keyboardType="numeric"
                value={costo}
                onChangeText={setCosto}
              />
            </View>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.label}>Notas Adicionales</Text>
          <TextInput 
            style={[styles.input, styles.textArea]} 
            placeholder="Observaciones de la aplicación..." 
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
