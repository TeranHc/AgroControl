import {
  FontAwesome5,
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false); // controla la visibilidad de la contraseña
  const [rememberDevice, setRememberDevice] = useState(false); // controla si el usuario quiere recordar el dispositivo

  const handleLogin = () => {
    // función que se ejecuta al presionar el botón de login
    console.log("Logging in with:", { email, password, rememberDevice });
  };

  return (
    // SafeAreaView asegura que el contenido no se superponga con la barra de estado o la barra de navegación
    <SafeAreaView style={styles.container}>
      {/*KeyboardAvoidingView ajusta la vista cuando el teclado aparece, especialmente en iOS */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        {/*  */}
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.card}>
            {/* Header / Logo */}
            <View style={styles.logoContainer}>
              <FontAwesome5 name="tractor" size={42} color="#1b4d1b" />
              <Text style={styles.title}>AgroControl</Text>
              <Text style={styles.subtitle}>
                Sign in to manage your farm operations.
              </Text>
            </View>

            {/* Contenedor de Formulario */}
            <View style={styles.form}>
              <Text style={styles.label}>Ingrese Email</Text>
              <View style={styles.inputContainer}>
                <MaterialCommunityIcons
                  name="email-outline"
                  size={20}
                  color="#6b7280"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="operator@greenvalley.com"
                  placeholderTextColor="#9ca3af"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>

              {/* input contraseña */}
              <View style={styles.passwordHeader}>
                <Text style={styles.label}>Contraseña</Text>
                <TouchableOpacity
                  onPress={() => console.log("Forgot password")} // mensaje
                >
                  <Text style={styles.forgotText}>
                    Olvidaste tu contraseña?
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.inputContainer}>
                <MaterialCommunityIcons
                  name="lock-outline"
                  size={20}
                  color="#6b7280"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor="#9ca3af"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color="#6b7280"
                  />
                </TouchableOpacity>
              </View>

              {/* recordar este dispositivo */}
              <TouchableOpacity
                style={styles.checkboxContainer}
                activeOpacity={0.8}
                onPress={() => setRememberDevice(!rememberDevice)}
              >
                <View
                  style={[
                    styles.checkbox,
                    rememberDevice && styles.checkboxChecked,
                  ]}
                >
                  {rememberDevice && (
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  )}
                </View>
                <Text style={styles.checkboxLabel}>Remember this device</Text>
              </TouchableOpacity>

              {/* Submit Button */}
              <TouchableOpacity
                style={styles.button}
                onPress={handleLogin}
                activeOpacity={0.85} // muestra un efecto de opacidad al presionar el botón
              >
                <Text style={styles.buttonText}>Login</Text>
                <Ionicons
                  name="arrow-forward"
                  size={18}
                  color="#fff"
                  style={styles.buttonIcon}
                />
              </TouchableOpacity>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Need access?{" "}
                <Text
                  style={styles.footerLink}
                  onPress={() => console.log("Contact Admin")}
                >
                  Contact System Administrator
                </Text>
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f6f0",
  },
  keyboardView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
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
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#0f3812",
    marginTop: 12,
  },
  subtitle: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 6,
    textAlign: "center",
  },
  form: {
    width: "100%",
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: "#334155",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  passwordHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  forgotText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0f3812",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8faf6",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 46,
    marginBottom: 16,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: "#1f2937",
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    marginTop: 2,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#f8faf6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  checkboxChecked: {
    backgroundColor: "#0f3812",
    borderColor: "#0f3812",
  },
  checkboxLabel: {
    fontSize: 13,
    color: "#4b5563",
  },
  button: {
    backgroundColor: "#0f3812",
    borderRadius: 8,
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
  },
  buttonIcon: {
    marginLeft: 6,
  },
  footer: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    alignItems: "center",
  },
  footerText: {
    fontSize: 12,
    color: "#64748b",
  },
  footerLink: {
    fontWeight: "bold",
    color: "#0f3812",
  },
});
