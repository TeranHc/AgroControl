import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5, Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

WebBrowser.maybeCompleteAuthSession();

export default function RegisterScreen() {
  const router = useRouter();
  
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [nacionalidad, setNacionalidad] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Estados para validación OTP (Código por correo)
  const [awaitingOtp, setAwaitingOtp] = useState(false);
  const [otpCode, setOtpCode] = useState('');

  async function handleRegister() {
    if (!nombre.trim() || !telefono.trim() || !nacionalidad.trim() || !email.trim() || !password) {
      Alert.alert('Campos incompletos', 'Por favor llena todos los campos.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    
    // Guardamos el nombre, teléfono y nacionalidad en los metadatos del usuario
    const { data: { session }, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: password,
      options: {
        data: {
          full_name: nombre.trim(),
          phone: telefono.trim(),
          nacionalidad: nacionalidad.trim(),
        }
      }
    });

    if (error) {
      Alert.alert('Error en el registro', error.message);
    } else if (!session) {
      // Supabase envió un código o enlace. Activamos la vista de ingreso de código.
      setAwaitingOtp(true);
    }
    
    setLoading(false);
  }

  async function handleVerifyOtp() {
    if (!otpCode.trim()) {
      Alert.alert('Error', 'Ingresa el código que recibiste en tu correo.');
      return;
    }

    setLoading(true);
    const { data: { session }, error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: otpCode.trim(),
      type: 'signup'
    });

    if (error) {
      Alert.alert('Error al verificar código', error.message);
      setLoading(false);
    } 
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          
          <TouchableOpacity style={styles.backButton} onPress={() => {
            if (awaitingOtp) {
              setAwaitingOtp(false); // Volver al formulario
            } else {
              router.canGoBack() ? router.back() : router.replace('/(auth)/login');
            }
          }}>
            <Ionicons name="arrow-back" size={24} color="#154212" />
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <FontAwesome5 name="tractor" size={42} color="#154212" />
            <Text style={styles.title}>{awaitingOtp ? 'Verificar Correo' : 'Crear Cuenta'}</Text>
            <Text style={styles.subtitle}>
              {awaitingOtp 
                ? 'Ingresa el código que te enviamos' 
                : 'Regístrate para empezar a gestionar tu finca'}
            </Text>
          </View>

          {/* Formulario */}
          <View style={styles.form}>
            {awaitingOtp ? (
              // VISTA DE INGRESO DE OTP
              <>
                <Text style={styles.label}>Código de Validación</Text>
                <View style={styles.inputContainer}>
                  <MaterialCommunityIcons name="shield-key-outline" size={20} color="#6b7280" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Ingresa tu código"
                    placeholderTextColor="#9ca3af"
                    keyboardType="number-pad"
                    value={otpCode}
                    onChangeText={setOtpCode}
                  />
                </View>

                {loading ? (
                  <ActivityIndicator size="large" color="#1b4d1b" style={{ marginTop: 20 }} />
                ) : (
                  <TouchableOpacity style={styles.button} onPress={handleVerifyOtp} activeOpacity={0.85}>
                    <Text style={styles.buttonText}>Verificar y Entrar</Text>
                    <Ionicons name="checkmark-circle-outline" size={20} color="#fff" style={styles.buttonIcon} />
                  </TouchableOpacity>
                )}
              </>
            ) : (
              // VISTA DE REGISTRO
              <>
                {/* Nombre Completo */}
                <Text style={styles.label}>Nombre Completo *</Text>
                <View style={styles.inputContainer}>
                  <MaterialCommunityIcons name="account-outline" size={20} color="#6b7280" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Ej: Manuel Terán"
                    placeholderTextColor="#9ca3af"
                    autoCapitalize="words"
                    value={nombre}
                    onChangeText={setNombre}
                  />
                </View>

                {/* Teléfono */}
                <Text style={styles.label}>Teléfono *</Text>
                <View style={styles.inputContainer}>
                  <MaterialCommunityIcons name="phone-outline" size={20} color="#6b7280" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Ej: +593 99 999 9999"
                    placeholderTextColor="#9ca3af"
                    keyboardType="phone-pad"
                    value={telefono}
                    onChangeText={setTelefono}
                  />
                </View>

                {/* Nacionalidad */}
                <Text style={styles.label}>Nacionalidad *</Text>
                <View style={styles.inputContainer}>
                  <MaterialIcons name="public" size={20} color="#6b7280" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Ej: Ecuatoriana"
                    placeholderTextColor="#9ca3af"
                    autoCapitalize="words"
                    value={nacionalidad}
                    onChangeText={setNacionalidad}
                  />
                </View>

                {/* Email */}
                <Text style={styles.label}>Correo Electrónico *</Text>
                <View style={styles.inputContainer}>
                  <MaterialCommunityIcons name="email-outline" size={20} color="#6b7280" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="ganadero@mifinca.com"
                    placeholderTextColor="#9ca3af"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                  />
                </View>

                {/* Contraseña */}
                <Text style={styles.label}>Contraseña *</Text>
                <View style={styles.inputContainer}>
                  <MaterialCommunityIcons name="lock-outline" size={20} color="#6b7280" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="••••••••"
                    placeholderTextColor="#9ca3af"
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#6b7280" />
                  </TouchableOpacity>
                </View>

                {/* Confirmar Contraseña */}
                <Text style={styles.label}>Confirmar Contraseña *</Text>
                <View style={[
                  styles.inputContainer,
                  confirmPassword !== '' && password !== confirmPassword ? { borderColor: '#ba1a1a', borderWidth: 1 } : null,
                  password !== '' && confirmPassword !== '' && password === confirmPassword ? { borderColor: '#154212', borderWidth: 1 } : null
                ]}>
                  <MaterialCommunityIcons name="lock-check-outline" size={20} color="#6b7280" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="••••••••"
                    placeholderTextColor="#9ca3af"
                    secureTextEntry={!showPassword}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    autoCapitalize="none"
                  />
                </View>
                {confirmPassword !== '' && password !== confirmPassword && (
                  <Text style={{ color: '#ba1a1a', fontSize: 12, marginTop: -12, marginBottom: 12, marginLeft: 4 }}>
                    Las contraseñas no coinciden
                  </Text>
                )}
                {password !== '' && confirmPassword !== '' && password === confirmPassword && (
                  <Text style={{ color: '#154212', fontSize: 12, marginTop: -12, marginBottom: 12, marginLeft: 4 }}>
                    ¡Las contraseñas coinciden!
                  </Text>
                )}

                {/* Botón de Submit */}
                {loading ? (
                  <ActivityIndicator size="large" color="#1b4d1b" style={{ marginTop: 20 }} />
                ) : (
                  <>
                    <TouchableOpacity style={styles.button} onPress={handleRegister} activeOpacity={0.85}>
                      <Text style={styles.buttonText}>Registrarme</Text>
                      <Ionicons name="arrow-forward" size={18} color="#fff" style={styles.buttonIcon} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.button, styles.googleButton]}
                      onPress={async () => {
                        setLoading(true);
                        const redirectUrl = Platform.OS === 'web' 
                          ? window.location.origin 
                          : Linking.createURL('/(auth)/register');

                        if (Platform.OS === 'web') {
                          const { error } = await supabase.auth.signInWithOAuth({
                            provider: 'google',
                            options: {
                              redirectTo: redirectUrl,
                              queryParams: { prompt: 'select_account' },
                            },
                          });
                          if (error) Alert.alert('Error', error.message);
                        } else {
                          // Flujo Nativo
                          const { data, error } = await supabase.auth.signInWithOAuth({
                            provider: 'google',
                            options: {
                              redirectTo: redirectUrl,
                              skipBrowserRedirect: true,
                              queryParams: { prompt: 'select_account' },
                            },
                          });

                          if (error) {
                            Alert.alert('Error', error.message);
                          } else if (data?.url) {
                            try {
                              const res = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
                              if (res.type === 'success' && res.url) {
                                const urlStr = res.url.replace('#', '?');
                                const matchAccess = urlStr.match(/access_token=([^&]+)/);
                                const matchRefresh = urlStr.match(/refresh_token=([^&]+)/);
                                if (matchAccess && matchAccess[1] && matchRefresh && matchRefresh[1]) {
                                  await supabase.auth.setSession({
                                    access_token: matchAccess[1],
                                    refresh_token: matchRefresh[1],
                                  });
                                }
                              }
                            } catch (err: any) {
                              console.error(err);
                            }
                          }
                        }
                        
                        setLoading(false);
                      }}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="logo-google" size={18} color="#4285F4" style={{ marginRight: 8 }} />
                      <Text style={[styles.buttonText, { color: '#334155' }]}>Registrarme con Google</Text>
                    </TouchableOpacity>
                  </>
                )}
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f0ea',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  backButton: {
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#154212',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    marginBottom: 20,
    paddingHorizontal: 14,
    height: 54,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    color: '#111827',
  },
  button: {
    backgroundColor: '#154212',
    height: 54,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonIcon: {
    marginLeft: 8,
  },
  googleButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    marginTop: 12,
  },
});
