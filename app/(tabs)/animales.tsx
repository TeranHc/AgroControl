import { MaterialIcons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router"; // <-- Importamos el enrutador
import Header from '../../components/Header';
import AnimalForm from '../../components/forms/AnimalForm';
import CustomAlert from '../../components/CustomAlert';
import { supabase } from "../../lib/supabase";
import { useActiveFinca } from '../../contexts/ActiveFincaContext';

export type Animal = {
  id: string;
  finca_id: string;
  codigo_animal: string;
  nombre: string | null;
  especie: string;
  raza: string | null;
  genero: string | null;
  fecha_nacimiento: string | null;
  proposito: string | null;
  estado: string;
  madre_id: string | null;
  padre_id: string | null;
  fotografia_url: string | null;
  notas: string | null;
  created_at?: string;
};

export default function AnimalesScreen() {
  const router = useRouter(); // <-- Instanciamos el enrutador
  const { activeFinca } = useActiveFinca();
  
  const [animales, setAnimales] = useState<Animal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Solo conservamos el estado para el formulario de CREAR
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingAnimal, setEditingAnimal] = useState<Animal | null>(null);

  // Custom Alert para eliminar
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'warning' as 'success'|'error'|'warning'|'info',
    onConfirm: () => {},
    onCancel: undefined as (() => void) | undefined,
  });

  const showAlert = (title: string, message: string, type: 'success'|'error'|'warning'|'info', onConfirm: () => void, onCancel?: () => void) => {
    setAlertConfig({ visible: true, title, message, type, onConfirm, onCancel });
  };

  const fetchAnimales = async () => {
    try {
      if (!activeFinca) return;

      const { data, error } = await supabase
        .from("animales")
        .select("*")
        .eq('finca_id', activeFinca.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (data) setAnimales(data);
    } catch (error) {
      console.error("Error obteniendo animales:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnimales();
  }, [activeFinca]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAnimales();
  };

  const confirmarEliminar = (animal: Animal) => {
    showAlert(
      'Eliminar Animal',
      `¿Estás seguro que deseas eliminar el animal "${animal.codigo_animal}"? Esta acción borrará también su historial de pesajes y salud.`,
      'warning',
      () => handleDelete(animal.id),
      () => setAlertConfig(prev => ({ ...prev, visible: false }))
    );
  };

  const handleDelete = async (id: string) => {
    setAlertConfig(prev => ({ ...prev, visible: false }));
    try {
      const { error } = await supabase.from('animales').delete().eq('id', id);
      if (error) throw error;
      showAlert('¡Éxito!', 'Animal eliminado correctamente.', 'success', () => {
        setAlertConfig(prev => ({ ...prev, visible: false }));
        fetchAnimales();
      });
    } catch (error: any) {
      console.error(error);
      showAlert('Error', 'No se pudo eliminar el animal.', 'error', () => setAlertConfig(prev => ({ ...prev, visible: false })));
    }
  };

  const animalesFiltrados = animales.filter(
    (animal) =>
      (animal.nombre?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
      (animal.codigo_animal?.toLowerCase() || "").includes(searchQuery.toLowerCase())
  );

  const getStatusStyle = (estado: string) => {
    switch (estado?.toLowerCase()) {
      case "activo":
        return { color: "#2E7D32", bg: "#e8f5e9", border: "#4CAF50" };
      case "enfermo":
      case "sick":
        return { color: "#C62828", bg: "#ffebee", border: "#F44336" };
      case "cuarentena":
      case "quarantine":
        return { color: "#EF6C00", bg: "#fff3e0", border: "#FF9800" };
      default:
        return { color: "#5b5f5c", bg: "#f4f4ee", border: "#c4c7c3" };
    }
  };

  const renderAnimalCard = ({ item }: { item: Animal }) => {
    const statusStyle = getStatusStyle(item.estado);

    return (
      <TouchableOpacity
        style={[styles.card, { borderLeftColor: statusStyle.border }]}
        activeOpacity={0.7}
        // 👇 AQUÍ ESTÁ LA MAGIA: Navegamos a la nueva pantalla pasando el ID
        onPress={() => router.push({ pathname: "/animal/[id]", params: { id: item.id } })}      >
        <View style={styles.imageContainer}>
          {item.fotografia_url ? (
            <Image source={{ uri: item.fotografia_url }} style={styles.image} />
          ) : (
            <MaterialIcons name="pets" size={32} color="#a1d494" />
          )}
        </View>

        <View style={styles.infoContainer}>
          <View style={styles.cardHeader}>
            <Text style={styles.codeBadge}>{item.codigo_animal}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
              <Text style={[styles.statusText, { color: statusStyle.color }]}>
                {item.estado.toUpperCase()}
              </Text>
            </View>
          </View>

          <Text style={styles.animalName}>{item.nombre || "Sin nombre"}</Text>
          <Text style={styles.animalBreed}>
            {item.especie} • {item.raza || "Raza no especificada"}
          </Text>

          <View style={styles.cardFooter}>
            <View style={styles.weightRow}>
              <MaterialIcons name="monitor-weight" size={14} color="#72796e" />
              <Text style={styles.weightText}>Ver historial</Text>
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={styles.actionBtn} 
                onPress={() => { setEditingAnimal(item); setIsFormVisible(true); }}
              >
                <MaterialIcons name="edit" size={20} color="#154212" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.actionBtn} 
                onPress={() => confirmarEliminar(item)}
              >
                <MaterialIcons name="delete" size={20} color="#ba1a1a" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <Header title="Animales" />
      <View style={[styles.header, { marginTop: 10 }]}>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.btnScan}>
            <MaterialIcons name="qr-code-scanner" size={18} color="#154212" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btnRegister}
            onPress={() => { setEditingAnimal(null); setIsFormVisible(true); }}
          >
            <MaterialIcons name="add" size={20} color="#ffffff" />
            <Text style={styles.btnRegisterText}>REGISTRAR</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={20} color="#72796e" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por código o nombre..."
          placeholderTextColor="#72796e"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#154212" />
        </View>
      ) : (
        <FlatList
          data={animalesFiltrados}
          keyExtractor={(item) => item.id}
          renderItem={renderAnimalCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#154212" />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialIcons name="pets" size={48} color="#c2c9bb" />
              <Text style={styles.emptyText}>No se encontraron animales.</Text>
            </View>
          }
        />
      )}

      <Modal
        visible={isFormVisible}
        animationType="slide"
        onRequestClose={() => setIsFormVisible(false)}
      >
        <AnimalForm
          onClose={() => setIsFormVisible(false)}
          onSuccess={() => {
            setIsFormVisible(false);
            fetchAnimales();
          }}
          initialData={editingAnimal}
        />
      </Modal>

      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onConfirm={alertConfig.onConfirm}
        onCancel={alertConfig.onCancel}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f4ee",
  },
  centerContainer: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center" 
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  btnScan: {
    backgroundColor: "#e8f0e5",
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  btnRegister: {
    backgroundColor: "#154212",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    height: 40,
    borderRadius: 8,
  },
  btnRegisterText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 14,
    marginLeft: 8,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 12,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e3e3de",
  },
  searchIcon: { 
    marginRight: 8 
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: "#1a1c19",
    outlineStyle: 'none',
  },
  cardList: {
    padding: 20,
    paddingTop: 10,
  },
  card: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  cardImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: "#f4f4ee",
  },
  imagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: "#e8f0e5",
    alignItems: "center",
    justifyContent: "center",
  },
  imageContainer: { 
    width: 80, 
    height: 80, 
    borderRadius: 12, 
    backgroundColor: "#f4f4ee", 
    justifyContent: "center", 
    alignItems: "center", 
    overflow: "hidden", 
    marginRight: 12 
  },
  image: { 
    width: "100%", 
    height: "100%" 
  },
  infoContainer: {
    flex: 1,
    marginLeft: 16,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  codeBadge: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#42493e",
    backgroundColor: "#f4f4ee",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "bold",
  },
  animalName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1a1c19",
    marginBottom: 2,
  },
  animalBreed: {
    fontSize: 14,
    color: "#72796e",
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  weightRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  weightText: {
    fontSize: 13,
    color: "#72796e",
    marginLeft: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    padding: 6,
    backgroundColor: '#f4f4ee',
    borderRadius: 6,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: "#72796e",
    fontWeight: "500",
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#a0a59a",
    marginTop: 4,
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#154212",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
});