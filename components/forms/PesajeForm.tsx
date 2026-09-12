import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { supabase } from '../../lib/supabase';
import { useActiveFinca } from '../../contexts/ActiveFincaContext';
import { SelectInput } from '../SelectInput';
import CustomAlert, { AlertType } from '../CustomAlert';

interface PesajeFormProps {
  onClose: () => void;
  onSuccess: () => void;
  initialAnimalId?: string;
  initialData?: any;
}

export default function PesajeForm({ onClose, onSuccess, initialAnimalId, initialData }: PesajeFormProps) {
  const isEditing = !!initialData;
  const { activeFinca } = useActiveFinca();
  const [loading, setLoading] = useState(false);
  const [animales, setAnimales] = useState<{ label: string; value: string }[]>([]);

  // Estados del formulario
  const [animalId, setAnimalId] = useState(initialData?.animal_id || initialAnimalId || '');
  const [peso, setPeso] = useState(initialData?.peso_kg?.toString() || '');
  const [condicionCorporal, setCondicionCorporal] = useState(initialData?.condicion_corporal?.toString() || '');
  const [fechaPesaje, setFechaPesaje] = useState<Date>(initialData?.fecha_pesaje ? new Date(initialData.fecha_pesaje + 'T12:00:00') : new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
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

  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setFechaPesaje(selectedDate);
    }
  };

  const handleSave = async () => {
    if (!animalId || !peso.trim()) {
      showAlert('Campos Obligatorios', 'Por favor seleccione un animal y registre el peso.', 'warning');
      return;
    }

    const pesoNum = parseFloat(peso.replace(',', '.'));
    if (isNaN(pesoNum) || pesoNum <= 0) {
      showAlert('Peso Inválido', 'Por favor ingrese un peso válido en kg.', 'error');
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
        peso_kg: pesoNum,
        fecha_pesaje: formatLocalDate(fechaPesaje),
        condicion_corporal: condicionCorporal ? parseInt(condicionCorporal) : null,
        notas: notas.trim() || null
      };

      let error;
      if (isEditing && initialData?.id) {
        const { error: updateError } = await supabase
          .from('pesajes')
          .update(payload)
          .eq('id', initialData.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('pesajes')
          .insert(payload);
        error = insertError;
      }

      if (error) throw error;

      showAlert(
        '¡Éxito!', 
        isEditing ? 'El pesaje se ha actualizado correctamente.' : 'El pesaje se ha registrado correctamente.', 
        'success',
        () => {
          setAlertConfig(prev => ({ ...prev, visible: false }));
          onSuccess();
          onClose();
        }
      );
    } catch (error: any) {
      console.error('Error guardando pesaje:', error);
      showAlert('Error', 'No se pudo guardar el pesaje: ' + error.message, 'error');
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
        <Text style={styles.headerTitle}>Registrar Pesaje</Text>
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
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Peso (KG) *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej. 450.5"
                keyboardType="numeric"
                value={peso}
                onChangeText={setPeso}
              />
            </View>
            <View style={{ width: 14 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Fecha del Pesaje *</Text>
              {Platform.OS === 'web' ? (
                <input
                  type="date"
                  max={new Date().toISOString().split('T')[0]}
                  value={formatLocalDate(fechaPesaje)}
                  onChange={(e: any) => {
                    if (e.target.value) {
                      setFechaPesaje(new Date(e.target.value + 'T12:00:00'));
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
                  value={fechaPesaje}
                  mode="date"
                  display="default"
                  maximumDate={new Date()}
                  onChange={handleDateChange}
                  style={{ alignSelf: 'flex-start', marginTop: 8 }}
                />
              ) : (
                <>
                  <TouchableOpacity 
                    style={styles.input} 
                    onPress={() => setShowDatePicker(true)}
                    activeOpacity={0.7}
                  >
                    <Text style={{ color: '#1a1c19', marginTop: 12 }}>
                      {formatLocalDate(fechaPesaje)}
                    </Text>
                  </TouchableOpacity>
                  {showDatePicker && (
                    <DateTimePicker
                      value={fechaPesaje}
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
        </View>

        <View style={styles.sectionCard}>
          <SelectInput
            label="Condición Corporal (1-5)"
            value={condicionCorporal}
            options={[
              { label: '1 - Muy Flaco (Emaciado)', value: '1' },
              { label: '2 - Flaco', value: '2' },
              { label: '3 - Normal (Ideal)', value: '3' },
              { label: '4 - Gordo', value: '4' },
              { label: '5 - Muy Gordo (Obeso)', value: '5' }
            ]}
            onSelect={setCondicionCorporal}
            placeholder="Opcional..."
          />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.label}>Notas y Observaciones</Text>
          <TextInput 
            style={[styles.input, styles.textArea]} 
            placeholder="Información adicional sobre el estado del animal durante el pesaje..." 
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
            <Text style={styles.btnSaveText}>{isEditing ? 'Guardar Cambios' : 'Registrar Pesaje'}</Text>
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
