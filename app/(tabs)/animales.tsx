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
import AnimalDetail from "../../components/AnimalDetail";
import AnimalForm from "../../components/forms/AnimalForm";
import { supabase } from "../../lib/supabase";
// Definimos la estructura de nuestro animal según la base de datos
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
  const [animales, setAnimales] = useState<Animal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFormVisible, setIsFormVisible] = useState(false);

  const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(null);

  // Función para obtener los animales desde Supabase
  const fetchAnimales = async () => {
    try {
      const { data, error } = await supabase
        .from("animales")
        .select("*")
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
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAnimales();
  };

  // Función para filtrar animales localmente por nombre o código
  const animalesFiltrados = animales.filter(
    (animal) =>
      (animal.nombre?.toLowerCase() || "").includes(
        searchQuery.toLowerCase(),
      ) ||
      (animal.codigo_animal?.toLowerCase() || "").includes(
        searchQuery.toLowerCase(),
      ),
  );

  // Función auxiliar para obtener colores según el estado
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

  // El diseño de cada tarjeta individual
  const renderAnimalCard = ({ item }: { item: Animal }) => {
    const statusStyle = getStatusStyle(item.estado);

    return (
      <TouchableOpacity
        style={[styles.card, { borderLeftColor: statusStyle.border }]}
        activeOpacity={0.7}
        onPress={() => setSelectedAnimal(item)} // Abrir modal al presionar la tarjeta
      >
        {/* Imagen o Ícono placeholder */}
        <View style={styles.imageContainer}>
          {item.fotografia_url ? (
            <Image source={{ uri: item.fotografia_url }} style={styles.image} />
          ) : (
            <MaterialIcons name="pets" size={32} color="#a1d494" />
          )}
        </View>

        {/* Información del Animal */}
        <View style={styles.infoContainer}>
          <View style={styles.cardHeader}>
            <Text style={styles.codeBadge}>{item.codigo_animal}</Text>
            <View
              style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}
            >
              <Text style={[styles.statusText, { color: statusStyle.color }]}>
                {item.estado.toUpperCase()}
              </Text>
            </View>
          </View>

          <Text style={styles.animalName}>{item.nombre || "Sin nombre"}</Text>
          <Text style={styles.animalBreed}>
            {item.especie} • {item.raza || "Raza no especificada"}
          </Text>

          <View style={styles.weightRow}>
            <MaterialIcons name="monitor-weight" size={14} color="#72796e" />
            <Text style={styles.weightText}>Ver historial</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Animales</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.btnScan}>
            <MaterialIcons name="qr-code-scanner" size={18} color="#154212" />
          </TouchableOpacity>

          {/* Botón que abre el modal del formulario */}
          <TouchableOpacity
            style={styles.btnRegister}
            onPress={() => setIsFormVisible(true)}
          >
            <MaterialIcons name="add" size={20} color="#ffffff" />
            <Text style={styles.btnRegisterText}>REGISTRAR</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Barra de Búsqueda */}
      <View style={styles.searchContainer}>
        <MaterialIcons
          name="search"
          size={20}
          color="#72796e"
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por código o nombre..."
          placeholderTextColor="#72796e"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Lista de Animales */}
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
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#154212"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialIcons name="pets" size={48} color="#c2c9bb" />
              <Text style={styles.emptyText}>No se encontraron animales.</Text>
            </View>
          }
        />
      )}

      {/* Modal que contiene el Formulario de Registro */}
      <Modal
        visible={isFormVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsFormVisible(false)}
      >
        <AnimalForm
          onClose={() => setIsFormVisible(false)}
          onSuccess={() => {
            setIsFormVisible(false);
            fetchAnimales(); // Recarga la lista para mostrar el nuevo registro
          }}
        />
      </Modal>

      {/* Modal 2: Detalle del Animal (NUEVO) */}
      <Modal
        visible={selectedAnimal !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedAnimal(null)}
      >
        {selectedAnimal && (
          <AnimalDetail
            animal={selectedAnimal}
            onClose={() => setSelectedAnimal(null)}
          />
        )}
      </Modal>
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
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#154212",
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  btnScan: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#c2c9bb",
    justifyContent: "center",
    alignItems: "center",
  },
  btnRegister: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#154212",
    paddingHorizontal: 16,
    height: 44,
    borderRadius: 22,
    gap: 4,
  },
  btnRegisterText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "bold",
    letterSpacing: 0.5,
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
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#1a1c19",
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  card: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 6,
    shadowColor: "#2d5a27",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  imageContainer: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: "#f4f4ee",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    marginRight: 12,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  infoContainer: {
    flex: 1,
    justifyContent: "center",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  codeBadge: {
    fontSize: 11,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    color: "#5b5f5c",
    backgroundColor: "#f4f4ee",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    letterSpacing: 0.5,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  animalName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1a1c19",
    marginBottom: 2,
  },
  animalBreed: {
    fontSize: 14,
    color: "#5b5f5c",
    marginBottom: 8,
  },
  weightRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  weightText: {
    fontSize: 12,
    color: "#72796e",
  },
  emptyContainer: {
    alignItems: "center",
    marginTop: 60,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: "#5b5f5c",
  },
});
