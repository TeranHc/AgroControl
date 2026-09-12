import { MaterialIcons } from "@expo/vector-icons";
import { Link, Tabs } from "expo-router";
import React from "react";
import { Pressable } from "react-native";

import { useClientOnlyValue } from "@/components/useClientOnlyValue";
import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";

// Usamos MaterialIcons que tiene mejores opciones para el sector ganadero/médico
function TabBarIcon(props: {
  name: React.ComponentProps<typeof MaterialIcons>["name"];
  color: string;
}) {
  return <MaterialIcons size={28} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        // Aplicamos los colores de tu diseño
        tabBarActiveTintColor: '#154212', // Verde oscuro principal
        tabBarInactiveTintColor: '#5b5f5c', // Gris secundario
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#e3e3de',
          paddingBottom: 5,
          height: 60,
        },
      }}
    >
      {/* 1. 🏠 Inicio */}
      <Tabs.Screen
        name="index"
        options={{
          title: "Inicio",
          tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
        }}
      />
      
      {/* 2. 🐄 Animales */}
      <Tabs.Screen
        name="animales"
        options={{
          title: "Animales",
          tabBarIcon: ({ color }) => <TabBarIcon name="pets" color={color} />,
        }}
      />
      
      {/* 3. ⚖️ Pesajes */}
      <Tabs.Screen
        name="pesajes"
        options={{
          title: "Pesajes",
          tabBarIcon: ({ color }) => <TabBarIcon name="monitor-weight" color={color} />,
        }}
      />
      
      {/* 4. 💉 Salud */}
      <Tabs.Screen
        name="salud"
        options={{
          title: "Salud",
          tabBarIcon: ({ color }) => <TabBarIcon name="medical-services" color={color} />,
        }}
      />
      
      {/* 5. 🐄 Reproducción */}
      <Tabs.Screen
        name="reproduccion"
        options={{
          title: "Reproducción",
          tabBarIcon: ({ color }) => <TabBarIcon name="favorite" color={color} />,
        }}
      />
    </Tabs>
  );
}