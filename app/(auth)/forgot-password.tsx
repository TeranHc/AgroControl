import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Email, 2: OTP, 3: New Password
  
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const coinciden = newPassword !== '' && confirmPassword !== '' && newPassword === confirmPassword;
  const errorConfirmar = confirmPassword !== '' && newPassword !== confirmPassword;

  const handleSendEmail = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Por favor ingresa tu correo electrónico.');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
      if (error) throw error;
      
      Alert.alert('Correo enviado', 'Hemos enviado un código de 6 dígitos a tu correo.');
      setStep(2);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim()) {
      Alert.alert('Error', 'Por favor ingresa el código.');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: otp.trim(),
        type: 'recovery'
      });
      if (error) throw error;
      
      setStep(3);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Código inválido o expirado.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || !coinciden) return;
    if (newPassword.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) throw error;

      const doGoToLogin = () => {
        supabase.auth.signOut();
        router.replace('/(auth)/login');
      };

      if (Platform.OS === 'web') {
        window.alert('Tu contraseña ha sido restablecida. Inicia sesión con tu nueva contraseña.');
        doGoToLogin();
      } else {
        Alert.alert('¡Éxito!', 'Tu contraseña ha sido restablecida. Inicia sesión con tu nueva contraseña.', [
          { text: 'Ir al Login', onPress: doGoToLogin }
        ]);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo actualizar la contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <View style={styles.content}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#154212" />
          </TouchableOpacity>
          
          {step === 1 && (
            <View style={styles.formContainer}>
              <MaterialCommunityIcons name="lock-reset" size={60} color="#154212" style={{ alignSelf: 'center', marginBottom: 20 }} />
              <Text style={styles.title}>Recuperar Contraseña</Text>
              <Text style={styles.subtitle}>Ingresa tu correo electrónico y te enviaremos un código para restablecerla.</Text>
              
              <Text style={styles.label}>Correo Electrónico</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="ejemplo@correo.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <TouchableOpacity style={styles.btnPrimary} onPress={handleSendEmail} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnPrimaryText}>Enviar Código</Text>}
              </TouchableOpacity>
            </View>
          )}

          {step === 2 && (
            <View style={styles.formContainer}>
              <MaterialCommunityIcons name="email-check" size={60} color="#154212" style={{ alignSelf: 'center', marginBottom: 20 }} />
              <Text style={styles.title}>Verificar Código</Text>
              <Text style={styles.subtitle}>Ingresa el código temporal de 6 dígitos que enviamos a {email}</Text>
              
              <Text style={styles.label}>Código de Recuperación</Text>
              <TextInput
                style={[styles.input, { textAlign: 'center', fontSize: 24, letterSpacing: 5 }]}
                value={otp}
                onChangeText={setOtp}
                placeholder="123456"
                keyboardType="number-pad"
              />

              <TouchableOpacity style={styles.btnPrimary} onPress={handleVerifyOtp} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnPrimaryText}>Verificar Código</Text>}
              </TouchableOpacity>
            </View>
          )}

          {step === 3 && (
            <View style={styles.formContainer}>
              <MaterialCommunityIcons name="shield-check" size={60} color="#154212" style={{ alignSelf: 'center', marginBottom: 20 }} />
              <Text style={styles.title}>Nueva Contraseña</Text>
              <Text style={styles.subtitle}>Crea una nueva contraseña segura para tu cuenta.</Text>
              
              <Text style={styles.label}>Nueva Contraseña</Text>
              <TextInput
                style={styles.input}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                placeholder="Al menos 6 caracteres"
              />

              <Text style={styles.label}>Confirmar Contraseña</Text>
              <TextInput
                style={[styles.input, errorConfirmar ? styles.inputError : (coinciden ? styles.inputSuccess : null)]}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                placeholder="Vuelve a escribir la contraseña"
              />
              {errorConfirmar && <Text style={styles.errorText}>Las contraseñas no coinciden</Text>}
              {coinciden && <Text style={styles.successText}>¡Las contraseñas coinciden!</Text>}

              <TouchableOpacity 
                style={[styles.btnPrimary, (!coinciden) && { opacity: 0.6 }]} 
                onPress={handleResetPassword} 
                disabled={loading || !coinciden}
              >
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnPrimaryText}>Guardar Nueva Contraseña</Text>}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f0' },
  content: { flex: 1, padding: 24, justifyContent: 'center' },
  backBtn: { position: 'absolute', top: 20, left: 24, padding: 8, zIndex: 10 },
  formContainer: { backgroundColor: '#ffffff', padding: 24, borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 15, elevation: 3 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#111111', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 24 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input: { backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 12, paddingHorizontal: 16, height: 50, fontSize: 16, color: '#111111', marginBottom: 16 },
  inputError: { borderColor: '#ba1a1a', backgroundColor: '#ffdad6' },
  inputSuccess: { borderColor: '#154212', backgroundColor: '#e8f5e9' },
  errorText: { color: '#ba1a1a', fontSize: 12, marginTop: -12, marginBottom: 16, fontWeight: '500' },
  successText: { color: '#154212', fontSize: 12, marginTop: -12, marginBottom: 16, fontWeight: '500' },
  btnPrimary: { backgroundColor: '#154212', height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  btnPrimaryText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' }
});
