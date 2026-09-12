import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Modal, FlatList } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export const SelectInput = ({ 
  label, 
  value, 
  options, 
  onSelect, 
  placeholder,
  disabled = false
}: {
  label: string;
  value: string;
  options: { label: string; value: string }[];
  onSelect: (val: string) => void;
  placeholder: string;
  disabled?: boolean;
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  const opcionesFiltradas = options.filter(o => 
    o.label.toLowerCase().includes(busqueda.toLowerCase())
  );

  const selectedLabel = options.find((o) => o.value === value)?.label;

  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity 
        style={[styles.selectInput, disabled && { opacity: 0.6, backgroundColor: '#ecece8' }]} 
        onPress={() => !disabled && setModalVisible(true)}
        disabled={disabled}
      >
        <Text numberOfLines={1} style={{ color: value ? '#1a1c19' : '#9ca3af', fontSize: 14, flex: 1 }}>
          {selectedLabel || placeholder}
        </Text>
        <MaterialIcons name="arrow-drop-down" size={24} color="#72796e" />
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setModalVisible(false)}>
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Seleccione {label.replace('*', '').trim()}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialIcons name="close" size={22} color="#5b5f5c" />
              </TouchableOpacity>
            </View>

            {options.length > 5 && (
              <View style={styles.modalSearchContainer}>
                <MaterialIcons name="search" size={18} color="#72796e" style={{ marginRight: 6 }} />
                <TextInput
                  style={styles.modalSearchInput}
                  placeholder="Buscar..."
                  placeholderTextColor="#9ca3af"
                  value={busqueda}
                  onChangeText={setBusqueda}
                />
              </View>
            )}

            <FlatList
              data={opcionesFiltradas}
              keyExtractor={(item, index) => `${item.value}_${index}`}
              ListEmptyComponent={
                <Text style={styles.emptyOptionsText}>No se encontraron opciones</Text>
              }
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={[
                    styles.modalOption,
                    item.value === value && styles.modalOptionSelected
                  ]}
                  onPress={() => { 
                    onSelect(item.value); 
                    setModalVisible(false);
                    setBusqueda('');
                  }}
                >
                  <Text style={[
                    styles.modalOptionText,
                    item.value === value && styles.modalOptionTextSelected
                  ]}>
                    {item.label}
                  </Text>
                  {item.value === value && (
                    <MaterialIcons name="check" size={18} color="#154212" />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  label: { fontSize: 11, fontWeight: '700', color: '#42493e', textTransform: 'uppercase', marginBottom: 6, marginTop: 10, letterSpacing: 0.5 },
  selectInput: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#c2c9bb', borderRadius: 8, paddingHorizontal: 12, height: 46 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#ffffff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '80%', elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 10 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a1c19' },
  modalSearchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f4f4ee', borderRadius: 8, paddingHorizontal: 12, marginBottom: 16, height: 40 },
  modalSearchInput: { flex: 1, fontSize: 15, color: '#1a1c19' },
  modalOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f4f4ee' },
  modalOptionSelected: { backgroundColor: '#f2f8eb', borderRadius: 8, paddingHorizontal: 12, borderBottomWidth: 0 },
  modalOptionText: { fontSize: 16, color: '#42493e' },
  modalOptionTextSelected: { color: '#154212', fontWeight: 'bold' },
  emptyOptionsText: { textAlign: 'center', color: '#72796e', marginTop: 20, fontStyle: 'italic' }
});
