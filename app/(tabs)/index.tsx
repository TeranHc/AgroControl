import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase'; // Asegúrate de que la ruta sea correcta

export default function HomeScreen() {
  
  // Función para cerrar sesión en Supabase
  async function handleLogout() {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      Alert.alert('Error', 'No se pudo cerrar sesión: ' + error.message);
    }
    // ¡Ojo al dato!: No necesitamos escribir código para mandarte a la pantalla de Login.
    // Como configuramos el _layout.tsx principal como un "guardia", al ejecutar signOut(),
    // el guardia detecta que la sesión murió y te patea automáticamente al Login. ¡Magia pura!
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        
        {/* Usamos el mismo estilo de "card" del diseño de tu compañero */}
        <View style={styles.card}>
          
          <View style={styles.headerContainer}>
            <FontAwesome5 name="tractor" size={42} color="#1b4d1b" />
            <Text style={styles.title}>¡Bienvenido a la Finca!</Text>
            <Text style={styles.subtitle}>
              Resumen de operaciones y estado del ganado.
            </Text>
          </View>

          {/* Aquí ponemos "cualquier cosa" (Tarjetas de resumen de ejemplo) */}
          <View style={styles.statsContainer}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>142</Text>
              <Text style={styles.statLabel}>Cabezas</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>3</Text>
              <Text style={styles.statLabel}>Vacunas Hoy</Text>
            </View>
          </View>

          {/* Botón de Cerrar Sesión */}
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.85}
          >
            <Ionicons name="log-out-outline" size={20} color="#fff" style={styles.buttonIcon} />
            <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
          </TouchableOpacity>

        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f6f0", // El mismo color de fondo elegante
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
  },
  headerContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#0f3812",
    marginTop: 12,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 6,
    textAlign: "center",
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 30,
  },
  statBox: {
    flex: 1,
    backgroundColor: "#f8faf6",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1b4d1b",
  },
  statLabel: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 4,
  },
  logoutButton: {
    backgroundColor: "#dc2626", // Usamos un rojo elegante para indicar "salir"
    borderRadius: 8,
    height: 48,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  logoutButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
  },
  buttonIcon: {
    marginRight: 8,
  },
});