//_layout.tsx
import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as Linking from 'expo-linking';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { ActiveFincaProvider } from '../contexts/ActiveFincaContext';

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

    // Procesar Deep Links (OAuth en celular)
    const handleDeepLink = async (event: { url: string }) => {
      if (event.url && event.url.includes('access_token')) {
        try {
          // Expo envia exp://...#access_token=... -> lo parseamos
          const urlStr = event.url.replace('#', '?');
          // En react-native a veces new URL falla con exp://, usamos regex o expo-linking
          const matchAccess = urlStr.match(/access_token=([^&]+)/);
          const matchRefresh = urlStr.match(/refresh_token=([^&]+)/);
          if (matchAccess && matchAccess[1] && matchRefresh && matchRefresh[1]) {
            await supabase.auth.setSession({
              access_token: matchAccess[1],
              refresh_token: matchRefresh[1],
            });
          }
        } catch (e) {
          console.error('Error parseando deep link', e);
        }
      }
    };

    const urlSub = Linking.addEventListener('url', handleDeepLink);
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink({ url });
    });

    // 2. Escuchar cambios (cuando el usuario inicia sesión o cierra sesión)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      subscription.unsubscribe();
      urlSub.remove();
    };
  }, []);

  useEffect(() => {
    if (!isInitialized) return;

    const inAuthGroup = segments[0] === '(auth)';
    const isCompletarPerfil = segments.join('/') === '(auth)/completar-perfil';

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (session) {
      // Si el usuario acaba de iniciar sesión con Google, puede que le falte el teléfono y nacionalidad
      const user = session.user;
      const faltaInfo = !user.user_metadata?.phone || !user.user_metadata?.nacionalidad;

      if (faltaInfo) {
        if (!isCompletarPerfil) {
          router.replace('/(auth)/completar-perfil');
        }
      } else if (inAuthGroup) {
        router.replace('/(tabs)');
      }
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
    <ActiveFincaProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </ActiveFincaProvider>
  );
}