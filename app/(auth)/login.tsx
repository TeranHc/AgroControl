import React, { useState } from 'react';
import { Alert, StyleSheet, View, TextInput, Button, Text, ActivityIndicator, Platform } from 'react-native';
import { supabase } from '../../lib/supabase';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function signInWithEmail() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      Alert.alert('Error al iniciar sesión', error.message);
    } else {
      Alert.alert('¡Conexión Exitosa!', 'Has iniciado sesión correctamente.');
    }
    setLoading(false);
  }

  async function signUpWithEmail() {
    setLoading(true);
    const {
      data: { session },
      error,
    } = await supabase.auth.signUp({
      email: email,
      password: password,
    });

    if (error) {
      Alert.alert('Error en el registro', error.message);
    } else if (!session) {
      Alert.alert('Revisa tu bandeja', 'Te hemos enviado un correo para verificar tu cuenta.');
    } else {
      Alert.alert('¡Registro Exitoso!', 'Bienvenido a AgroControl.');
    }
    setLoading(false);
  }

  // Contenido del formulario
  const FormContent = (
    <>
      <Text style={styles.title}>AgroControl</Text>
      
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          onChangeText={(text) => setEmail(text)}
          value={email}
          placeholder="correo@ejemplo.com"
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />
      </View>
      
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          onChangeText={(text) => setPassword(text)}
          value={password}
          secureTextEntry={true}
          placeholder="Contraseña"
          autoCapitalize="none"
          autoComplete="password"
        />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" style={styles.mt20} />
      ) : (
        <View style={styles.buttonContainer}>
          <Button title="Iniciar Sesión" onPress={signInWithEmail} />
          <View style={styles.spacer} />
          <Button title="Registrarse" onPress={signUpWithEmail} color="#28a745" />
        </View>
      )}
    </>
  );

  return (
    <View style={styles.container}>
      {Platform.OS === 'web' ? (
        // En web usamos <form> para que el navegador deje de quejarse
        <form
          onSubmit={(e) => {
            e.preventDefault(); // Evita que la página se recargue
            signInWithEmail();
          }}
        >
          {FormContent}
        </form>
      ) : (
        // En móvil (iOS/Android) usamos View normal
        <View>{FormContent}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 40,
    color: '#333',
  },
  inputContainer: {
    marginBottom: 15,
  },
  input: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 16,
  },
  buttonContainer: {
    marginTop: 20,
  },
  spacer: {
    height: 10,
  },
  mt20: {
    marginTop: 20,
  }
});