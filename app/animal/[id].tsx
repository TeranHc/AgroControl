import { MaterialIcons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../lib/supabase";

// Definimos el tipo de dato
type Animal = {
  id: string;
  codigo_animal: string;
  nombre: string;
  especie: string;
  raza: string;
  genero: string;
  fecha_nacimiento: string | null;
  proposito: string;
  estado: string;
  fotografia_url: string | null;
  padre_id: string | null;
  madre_id: string | null;
  notas: string | null;
};

export default function AnimalDetailScreen() {
  // Expo Router tools
  const { id } = useLocalSearchParams(); // Atrapa el ID de la URL
  const router = useRouter();

  // Estados principales
  const [animal, setAnimal] = useState<Animal | null>(null);
  const [loadingAnimal, setLoadingAnimal] = useState(true);
  
  // Estados secundarios
  const [ultimoPeso, setUltimoPeso] = useState<number | null>(null);
  const [loadingPeso, setLoadingPeso] = useState(false);
  const [padreNombre, setPadreNombre] = useState<string | null>(null);
  const [madreNombre, setMadreNombre] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"info" | "weights" | "health" | "repro">("info");
  const [aspectRatio, setAspectRatio] = useState(16 / 9);

  // 1. Cargar el animal principal desde Supabase
  useEffect(() => {
    const fetchAnimal = async () => {
      try {
        const { data, error } = await supabase
          .from("animales")
          .select("*")
          .eq("id", id)
          .single();

        if (error) throw error;
        setAnimal(data);
      } catch (err) {
        console.error("Error al cargar animal:", err);
        Alert.alert("Error", "No se pudo cargar la información del animal.");
        router.back();
      } finally {
        setLoadingAnimal(false);
      }
    };

    if (id) fetchAnimal();
  }, [id]);

  // Ajuste de imagen
  useEffect(() => {
    if (animal?.fotografia_url) {
      Image.getSize(
        animal.fotografia_url,
        (width, height) => {
          if (width && height) setAspectRatio(width / height);
        },
        (error) => console.error("Error obteniendo tamaño de imagen:", error)
      );
    }
  }, [animal?.fotografia_url]);

  // Cargar último peso
  useEffect(() => {
    const fetchUltimoPeso = async () => {
      if (!animal) return;
      setLoadingPeso(true);
      try {
        const { data, error } = await supabase
          .from("pesajes")
          .select("peso_kg")
          .eq("animal_id", animal.id)
          .order("fecha_pesaje", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;
        if (data) setUltimoPeso(data.peso_kg);
      } catch (err) {
        console.error("Error al obtener último peso:", err);
      } finally {
        setLoadingPeso(false);
      }
    };
    fetchUltimoPeso();
  }, [animal]);

  // Cargar genealogía
  useEffect(() => {
    const fetchPadres = async () => {
      if (!animal || (!animal.padre_id && !animal.madre_id)) return;
      try {
        const ids = [animal.padre_id, animal.madre_id].filter(Boolean) as string[];
        const { data, error } = await supabase
          .from("animales")
          .select("id, codigo_animal, nombre")
          .in("id", ids);

        if (error) throw error;
        if (data) {
          const padre = data.find((a) => a.id === animal.padre_id);
          const madre = data.find((a) => a.id === animal.madre_id);
          if (padre) setPadreNombre(`${padre.codigo_animal} ${padre.nombre ? `(${padre.nombre})` : ""}`);
          if (madre) setMadreNombre(`${madre.codigo_animal} ${madre.nombre ? `(${madre.nombre})` : ""}`);
        }
      } catch (err) {
        console.error("Error al cargar padres:", err);
      }
    };
    fetchPadres();
  }, [animal]);

  // Cálculo de edad
  const calcularEdad = (fechaNacimiento: string | null) => {
    if (!fechaNacimiento) return "No registrada";
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);
    let años = hoy.getFullYear() - nacimiento.getFullYear();
    let meses = hoy.getMonth() - nacimiento.getMonth();
    if (meses < 0 || (meses === 0 && hoy.getDate() < nacimiento.getDate())) {
      años--;
      meses += 12;
    }
    if (años > 0) return `${años} año${años > 1 ? "s" : ""} ${meses}m`;
    return `${meses} mes${meses !== 1 ? "es" : ""}`;
  };

  const getStatusStyle = (estado: string | undefined) => {
    switch (estado?.toLowerCase()) {
      case "activo": return { bg: "#2e7d32" };
      case "enfermo": case "sick": return { bg: "#c62828" };
      case "cuarentena": return { bg: "#ef6c00" };
      default: return { bg: "#757575" };
    }
  };

  if (loadingAnimal || !animal) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#154212" />
      </View>
    );
  }

  const statusStyle = getStatusStyle(animal.estado);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {/* TopBar (Navegación) */}
        <View style={styles.topBar}>
        <TouchableOpacity style={styles.btnBack} onPress={() => router.push("/(tabs)/animales")}>
            <MaterialIcons name="arrow-back" size={24} color="#424242" />
            <Text style={styles.btnBackText}>VOLVER A ANIMALES</Text>
        </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.card}>
            {/* Foto y Estado */}
            <View style={[styles.imageContainer, { aspectRatio }]}>
              {animal.fotografia_url ? (
                <Image source={{ uri: animal.fotografia_url }} style={styles.image} resizeMode="contain" />
              ) : (
                <View style={styles.placeholderImage}>
                  <MaterialIcons name="pets" size={64} color="#a1d494" />
                </View>
              )}
              <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>{(animal.estado || "ACTIVO").toUpperCase()}</Text>
              </View>
            </View>

            {/* Encabezado e Info Principal */}
            <View style={styles.headerInfo}>
              <Text style={styles.codeText}>CÓDIGO: {animal.codigo_animal}</Text>
              <Text style={styles.animalName}>{animal.nombre || "Sin nombre"}</Text>

              <View style={styles.actionButtonsRow}>
                <TouchableOpacity style={styles.circularBtn}>
                  <MaterialIcons name="qr-code-2" size={20} color="#424242" />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.circularBtn} 
                  onPress={() => Alert.alert("Próximamente", "Aquí abriremos el formulario para editar a este animal.")}
                >
                  <MaterialIcons name="edit" size={20} color="#424242" />
                </TouchableOpacity>
              </View>

              <View style={styles.grid}>
                <View style={styles.gridBox}>
                  <Text style={styles.gridLabel}>ESPECIE</Text>
                  <Text style={styles.gridValue}>{animal.especie}</Text>
                </View>
                <View style={styles.gridBox}>
                  <Text style={styles.gridLabel}>RAZA</Text>
                  <Text style={styles.gridValue}>{animal.raza}</Text>
                </View>
                <View style={styles.gridBox}>
                  <Text style={styles.gridLabel}>GÉNERO</Text>
                  <Text style={styles.gridValue}>{animal.genero || "N/D"}</Text>
                </View>
                <View style={styles.gridBox}>
                  <Text style={styles.gridLabel}>EDAD</Text>
                  <Text style={styles.gridValue}>{calcularEdad(animal.fecha_nacimiento)}</Text>
                </View>
                <View style={[styles.gridBox, styles.gridBoxHighlighted]}>
                  <Text style={styles.gridLabel}>ÚLTIMO PESO</Text>
                  {loadingPeso ? (
                    <ActivityIndicator size="small" color="#154212" />
                  ) : (
                    <Text style={styles.gridValue}>{ultimoPeso !== null ? `${ultimoPeso} kg` : "Sin datos"}</Text>
                  )}
                </View>
              </View>

              <View style={styles.divider} />

              <TouchableOpacity style={styles.btnRecordWeight} onPress={() => Alert.alert("Próximamente", "Abrir modal de registrar pesaje")}>
                <MaterialIcons name="add" size={20} color="#ffffff" />
                <Text style={styles.btnRecordWeightText}>REGISTRAR PESO</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Menú de Pestañas Interiores */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsContainer} contentContainerStyle={styles.tabsContent}>
            {/* ... tus tabs ... */}
            <TouchableOpacity style={[styles.tabItem, activeTab === "info" && styles.activeTabItem]} onPress={() => setActiveTab("info")}>
              <Text style={[styles.tabText, activeTab === "info" && styles.activeTabText]}>INFORMACIÓN</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tabItem, activeTab === "weights" && styles.activeTabItem]} onPress={() => setActiveTab("weights")}>
              <Text style={[styles.tabText, activeTab === "weights" && styles.activeTabText]}>PESAJES</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tabItem, activeTab === "health" && styles.activeTabItem]} onPress={() => setActiveTab("health")}>
              <Text style={[styles.tabText, activeTab === "health" && styles.activeTabText]}>SALUD</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tabItem, activeTab === "repro" && styles.activeTabItem]} onPress={() => setActiveTab("repro")}>
              <Text style={[styles.tabText, activeTab === "repro" && styles.activeTabText]}>REPRODUCCIÓN</Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Contenido de la pestaña activa */}
          {activeTab === "info" && (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Información General</Text>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>FECHA DE NACIMIENTO</Text>
                <Text style={styles.infoValue}>{animal.fecha_nacimiento || 'No registrada'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>PROPÓSITO</Text>
                <Text style={styles.infoValue}>{animal.proposito || "No especificado"}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>GENEALOGÍA</Text>
                <Text style={styles.infoValue}>Padre: {padreNombre || "No registrado"}{"\n"}Madre: {madreNombre || "No registrada"}</Text>
              </View>
              {animal.notas ? (
                <View style={styles.notesBox}>
                  <Text style={styles.infoLabel}>NOTAS</Text>
                  <Text style={styles.notesText}>{animal.notas}</Text>
                </View>
              ) : null}
            </View>
          )}

          {activeTab === "weights" && (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Historial de Pesajes</Text>
              <Text style={styles.emptyTabContent}>Próximamente lista de pesajes...</Text>
            </View>
          )}

          {activeTab === "health" && (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Registros de Salud</Text>
              <Text style={styles.emptyTabContent}>Próximamente tratamientos y vacunas...</Text>
            </View>
          )}

          {activeTab === "repro" && (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Eventos Reproductivos</Text>
              <Text style={styles.emptyTabContent}>Próximamente servicios y partos...</Text>
            </View>
          )}

        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f1f0ea" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f1f0ea" },
  container: { flex: 1, backgroundColor: "#f1f0ea" },
  topBar: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  btnBack: { flexDirection: "row", alignItems: "center", gap: 6 },
  btnBackText: { fontSize: 12, fontWeight: "bold", color: "#424242", letterSpacing: 0.5 },
  scrollContent: { padding: 16 },
  card: { backgroundColor: "#ffffff", borderRadius: 20, overflow: "hidden", elevation: 3, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 },
  imageContainer: { width: "100%", backgroundColor: "#e8f5e9", overflow: "hidden", justifyContent: "center", alignItems: "center" },
  image: { width: "100%", height: "100%" },
  placeholderImage: { flex: 1, justifyContent: "center", alignItems: "center" },
  statusBadge: { position: "absolute", top: 16, left: 16, flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, gap: 6 },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#ffffff" },
  statusText: { color: "#ffffff", fontSize: 11, fontWeight: "bold", letterSpacing: 0.5 },
  headerInfo: { padding: 20 },
  codeText: { fontSize: 13, color: "#757575", fontWeight: "500", marginBottom: 4 },
  animalName: { fontSize: 30, fontWeight: "800", color: "#111111", marginBottom: 12 },
  actionButtonsRow: { flexDirection: "row", gap: 12, marginBottom: 20 },
  circularBtn: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, borderColor: "#e0e0e0", justifyContent: "center", alignItems: "center", backgroundColor: "#ffffff" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 16 },
  gridBox: { width: "48%", backgroundColor: "#f4f3ef", borderRadius: 12, padding: 12, justifyContent: "center" },
  gridBoxHighlighted: { borderLeftWidth: 3, borderLeftColor: "#154212" },
  gridLabel: { fontSize: 10, fontWeight: "700", color: "#757575", marginBottom: 4, letterSpacing: 0.5 },
  gridValue: { fontSize: 14, fontWeight: "700", color: "#111111" },
  divider: { height: 1, backgroundColor: "#eeeeee", marginVertical: 16 },
  btnRecordWeight: { backgroundColor: "#154212", flexDirection: "row", justifyContent: "center", alignItems: "center", paddingVertical: 12, borderRadius: 25, gap: 6, alignSelf: "flex-end", paddingHorizontal: 20 },
  btnRecordWeightText: { color: "#ffffff", fontSize: 12, fontWeight: "bold", letterSpacing: 0.5 },
  tabsContainer: { marginTop: 20, marginBottom: 12 },
  tabsContent: { gap: 16, paddingHorizontal: 4 },
  tabItem: { paddingVertical: 8, borderBottomWidth: 2, borderBottomColor: "transparent" },
  activeTabItem: { borderBottomColor: "#154212" },
  tabText: { fontSize: 12, fontWeight: "700", color: "#0b0b0b", letterSpacing: 0.5 },
  activeTabText: { color: "#154212" },
  sectionCard: { backgroundColor: "#ffffff", borderRadius: 20, padding: 20, marginBottom: 20, elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4 },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: "#111111", marginBottom: 16 },
  infoRow: { marginBottom: 16 },
  infoLabel: { fontSize: 10, fontWeight: "700", color: "#757575", letterSpacing: 0.5, marginBottom: 4 },
  infoValue: { fontSize: 14, fontWeight: "600", color: "#222222", lineHeight: 20 },
  notesBox: { backgroundColor: "#f8f9fa", borderRadius: 12, padding: 14, marginTop: 8 },
  notesText: { fontSize: 13, color: "#333333", lineHeight: 18, marginTop: 4 },
  emptyTabContent: { fontSize: 13, color: "#757575", fontStyle: "italic" }
});