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
} from "react-native";
import { Animal } from "../app/(tabs)/animales"; // Ajusta la ruta a tus tipos si usas types/animal
import { supabase } from "../lib/supabase";

interface AnimalDetailProps {
  animal: Animal;
  onClose: () => void;
  onRecordWeight?: () => void;
  onEdit?: () => void;
}

export default function AnimalDetail({
  animal,
  onClose,
  onRecordWeight,
  onEdit,
}: AnimalDetailProps) {
  const [ultimoPeso, setUltimoPeso] = useState<number | null>(null);
  const [loadingPeso, setLoadingPeso] = useState(false);
  const [padreNombre, setPadreNombre] = useState<string | null>(null);
  const [madreNombre, setMadreNombre] = useState<string | null>(null);

  const [aspectRatio, setAspectRatio] = useState(16 / 9);

  // Ayuda con el tamaño de la imagen para mantener la relación
  // de aspecto correcta
  useEffect(() => {
    if (animal.fotografia_url) {
      Image.getSize(
        animal.fotografia_url,
        (width, height) => {
          if (width && height) {
            setAspectRatio(width / height);
          }
        },
        (error) => console.error("Error obteniendo tamaño de imagen:", error),
      );
    }
  }, [animal.fotografia_url]);

  useEffect(() => {
    const fetchUltimoPeso = async () => {
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
  }, [animal.id]);

  // 2. Cargar nombres/códigos del Padre y la Madre (Genealogía)
  useEffect(() => {
    const fetchPadres = async () => {
      if (!animal.padre_id && !animal.madre_id) return;
      try {
        const ids = [animal.padre_id, animal.madre_id].filter(
          Boolean,
        ) as string[];
        const { data, error } = await supabase
          .from("animales")
          .select("id, codigo_animal, nombre")
          .in("id", ids);

        if (error) throw error;
        if (data) {
          const padre = data.find((a) => a.id === animal.padre_id);
          const madre = data.find((a) => a.id === animal.madre_id);
          if (padre)
            setPadreNombre(
              `${padre.codigo_animal} ${padre.nombre ? `(${padre.nombre})` : ""}`,
            );
          if (madre)
            setMadreNombre(
              `${madre.codigo_animal} ${madre.nombre ? `(${madre.nombre})` : ""}`,
            );
        }
      } catch (err) {
        console.error("Error al cargar padres:", err);
      }
    };

    fetchPadres();
  }, [animal]);

  // 3. Cálculo dinámico de edad
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

    if (años > 0) {
      return `${años} año${años > 1 ? "s" : ""} ${meses}m`;
    }
    return `${meses} mes${meses !== 1 ? "es" : ""}`;
  };

  // Colores dinámicos del badge según tu enum/estado
  const getStatusStyle = (estado: string) => {
    switch (estado?.toLowerCase()) {
      case "activo":
        return { bg: "#2e7d32" };
      case "enfermo":
      case "sick":
        return { bg: "#c62828" };
      case "cuarentena":
        return { bg: "#ef6c00" };
      default:
        return { bg: "#757575" };
    }
  };

  const statusStyle = getStatusStyle(animal.estado);

  return (
    <View style={styles.container}>
      {/* Botón superior de navegación */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.btnBack} onPress={onClose}>
          <MaterialIcons name="arrow-back" size={20} color="#424242" />
          <Text style={styles.btnBackText}>VOLVER A ANIMALES</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Tarjeta Principal */}
        <View style={styles.card}>
          {/* Fotografía o Placeholder con Estado */}
          <View style={[styles.imageContainer, { aspectRatio }]}>
            {animal.fotografia_url ? (
              <Image
                source={{ uri: animal.fotografia_url }}
                style={styles.image}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.placeholderImage}>
                <MaterialIcons name="pets" size={64} color="#a1d494" />
              </View>
            )}

            <View
              style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}
            >
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>
                {(animal.estado || "ACTIVO").toUpperCase()}
              </Text>
            </View>
          </View>

          {/* Ficha Informativa del Animal */}
          <View style={styles.headerInfo}>
            <Text style={styles.codeText}>CÓDIGO: {animal.codigo_animal}</Text>
            <Text style={styles.animalName}>
              {animal.nombre || "Sin nombre"}
            </Text>

            {/* Acciones Rápidas */}
            <View style={styles.actionButtonsRow}>
              <TouchableOpacity style={styles.circularBtn}>
                <MaterialIcons name="qr-code-2" size={20} color="#424242" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.circularBtn} onPress={onEdit}>
                <MaterialIcons name="edit" size={20} color="#424242" />
              </TouchableOpacity>
            </View>

            {/* Métricas Principales en Grid (2x2) */}
            <View style={styles.grid}>
              {/* ESPECIE Y RAZA */}
              <View style={styles.gridBox}>
                <Text style={styles.gridLabel}>ESPECIE</Text>
                <Text style={styles.gridValue}>{animal.especie}</Text>
              </View>

              <View style={styles.gridBox}>
                <Text style={styles.gridLabel}>RAZA</Text>
                <Text style={styles.gridValue}>{animal.raza}</Text>
              </View>

              {/* Género del animal */}
              <View style={styles.gridBox}>
                <Text style={styles.gridLabel}>GÉNERO</Text>
                <Text style={styles.gridValue}>{animal.genero || "N/D"}</Text>
              </View>

              {/* Edad del animal */}
              <View style={styles.gridBox}>
                <Text style={styles.gridLabel}>EDAD</Text>
                <Text style={styles.gridValue}>
                  {calcularEdad(animal.fecha_nacimiento)}
                </Text>
              </View>

              {/* ÚLTIMO PESO */}
              <View style={[styles.gridBox, styles.gridBoxHighlighted]}>
                <Text style={styles.gridLabel}>ÚLTIMO PESO</Text>
                {loadingPeso ? (
                  <ActivityIndicator size="small" color="#154212" />
                ) : (
                  <Text style={styles.gridValue}>
                    {ultimoPeso !== null ? `${ultimoPeso} kg` : "Sin datos"}
                  </Text>
                )}
              </View>
            </View>

            {/* Genealogía / Padres */}
            {/* <View style={styles.genealogySection}>
              <Text style={styles.gridLabel}>GENEALOGÍA</Text>
              <View style={styles.genealogyRow}>
                <Text style={styles.genealogyText}>
                  Padre:{" "}
                  <Text style={styles.genealogyValue}>
                    {padreNombre || "No registrado"}
                  </Text>
                </Text>
                <Text style={styles.genealogyText}>
                  Madre:{" "}
                  <Text style={styles.genealogyValue}>
                    {madreNombre || "No registrada"}
                  </Text>
                </Text>
              </View>
            </View> */}

            {/* Notas / Observaciones */}
            {/* {animal.notas ? (
              <View style={styles.notesSection}>
                <Text style={styles.gridLabel}>NOTAS</Text>
                <Text style={styles.notesValue}>{animal.notas}</Text>
              </View>
            ) : null} */}

            <View style={styles.divider} />

            {/* Botón de Acción Principal */}
            <TouchableOpacity
              style={styles.btnRecordWeight}
              onPress={onRecordWeight}
            >
              <MaterialIcons name="add" size={20} color="#ffffff" />
              <Text style={styles.btnRecordWeightText}>REGISTRAR PESO</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f1f0ea" },
  topBar: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  btnBack: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  btnBackText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#424242",
    letterSpacing: 0.5,
  },
  scrollContent: {
    padding: 16,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  imageContainer: {
    width: "100%", // Ocupa todo el ancho disponible de la tarjeta
    height: 350,
    position: "relative",
    backgroundColor: "#e8f5e9",
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: "100%",
    height: "90%",
    resizeMode: "contain",
  },
  placeholderImage: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  statusBadge: {
    position: "absolute",
    top: 16,
    left: 16,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#ffffff",
  },
  statusText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  headerInfo: {
    padding: 20,
  },
  codeText: {
    fontSize: 13,
    color: "#757575",
    fontWeight: "500",
    marginBottom: 4,
  },
  animalName: {
    fontSize: 30,
    fontWeight: "800",
    color: "#111111",
    marginBottom: 12,
  },
  actionButtonsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  circularBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffffff",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16,
  },
  gridBox: {
    width: "48%",
    backgroundColor: "#f4f3ef",
    borderRadius: 12,
    padding: 12,
    justifyContent: "center",
  },
  gridBoxHighlighted: {
    borderLeftWidth: 3,
    borderLeftColor: "#154212",
  },
  gridLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#757575",
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  gridValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111111",
  },
  genealogySection: {
    backgroundColor: "#f4f3ef",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  genealogyRow: {
    marginTop: 4,
    gap: 2,
  },
  genealogyText: {
    fontSize: 13,
    color: "#666",
  },
  genealogyValue: {
    fontWeight: "600",
    color: "#222",
  },
  notesSection: {
    backgroundColor: "#f4f3ef",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  notesValue: {
    fontSize: 13,
    color: "#333",
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: "#eeeeee",
    marginVertical: 16,
  },
  btnRecordWeight: {
    backgroundColor: "#154212",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 25,
    gap: 6,
    alignSelf: "flex-end",
    paddingHorizontal: 20,
  },
  btnRecordWeightText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
});
