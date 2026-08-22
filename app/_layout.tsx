//_layout.tsx
import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const segments = useSegments(); // Nos dice en qué carpeta estamos ej: ['(auth)']
  const router = useRouter();     // Nos permite navegar

  useEffect(() => {
    // 1. Revisar si hay una sesión guardada al abrir la app
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsInitialized(true);
    });

    // 2. Escuchar cambios (cuando el usuario inicia sesión o cierra sesión)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!isInitialized) return;

    // Comprobamos si estamos intentando entrar a la carpeta (auth)
    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      // No hay usuario y está intentando entrar a la app -> ¡Al Login!
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      // Hay usuario y está en la pantalla de Login -> ¡A las pestañas!
      router.replace('/(tabs)');
    }
  }, [session, isInitialized, segments]);

  // Pantalla de carga mientras verificamos la sesión
  if (!isInitialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#28a745" />
      </View>
    );
  }

  // Si todo está bien, cargamos los grupos de navegación
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}