import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useActiveFinca } from '../contexts/ActiveFincaContext';

type HeaderProps = {
  title: string;
};

export default function Header({ title }: HeaderProps) {
  const router = useRouter();
  const { activeFinca, fincas, cambiarFinca, loadingFincas } = useActiveFinca();
  const [modalVisible, setModalVisible] = useState(false);

  const handleSelectFinca = (id: string) => {
    cambiarFinca(id);
    setModalVisible(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View>
          <Text style={styles.title}>{title}</Text>
          
          {loadingFincas ? (
            <ActivityIndicator size="small" color="#154212" style={{ alignSelf: 'flex-start', marginTop: 4 }} />
          ) : (
            <TouchableOpacity 
              style={styles.fincaSelector}
              onPress={() => fincas.length > 1 && setModalVisible(true)}
              disabled={fincas.length <= 1}
            >
              <MaterialIcons name="agriculture" size={14} color="#5b5f5c" />
              <Text style={styles.fincaSelectorText}>
                {activeFinca ? activeFinca.nombre : 'Sin Finca'}
              </Text>
              {fincas.length > 1 && (
                <MaterialIcons name="arrow-drop-down" size={18} color="#5b5f5c" />
              )}
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity 
          style={styles.profileButton} 
          onPress={() => router.push('/perfil')}
        >
          <MaterialIcons name="person" size={24} color="#154212" />
        </TouchableOpacity>
      </View>

      {/* Modal para Seleccionar Finca */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setModalVisible(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cambiar de Finca</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="#5b5f5c" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={fincas}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={[
                    styles.fincaOption,
                    activeFinca?.id === item.id && styles.fincaOptionActive
                  ]}
                  onPress={() => handleSelectFinca(item.id)}
                >
                  <MaterialIcons 
                    name="agriculture" 
                    size={20} 
                    color={activeFinca?.id === item.id ? '#154212' : '#5b5f5c'} 
                  />
                  <Text style={[
                    styles.fincaOptionText,
                    activeFinca?.id === item.id && styles.fincaOptionTextActive
                  ]}>
                    {item.nombre}
                  </Text>
                  {activeFinca?.id === item.id && (
                    <MaterialIcons name="check" size={20} color="#154212" />
                  )}
                </TouchableOpacity>
              )}
              style={{ maxHeight: 300 }}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e3e3de',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#154212',
  },
  fincaSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 4,
    backgroundColor: '#f4f4ee',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  fincaSelectorText: {
    fontSize: 12,
    color: '#5b5f5c',
    fontWeight: '600',
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f4f4ee',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#154212',
  },
  fincaOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: '#f9f9f6',
    borderWidth: 1,
    borderColor: '#e3e3de',
  },
  fincaOptionActive: {
    backgroundColor: '#e8f5e9',
    borderColor: '#a1d494',
  },
  fincaOptionText: {
    flex: 1,
    fontSize: 15,
    color: '#1a1c19',
    marginLeft: 10,
  },
  fincaOptionTextActive: {
    fontWeight: 'bold',
    color: '#154212',
  },
});
