import React, { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { GlobalPortalProvider, PortalManager } from "fluent-styles";
import * as SplashScreen from "expo-splash-screen";
import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from "@expo-google-fonts/plus-jakarta-sans";
import { ErrorBoundary } from "../src/components/ErrorBoundary";
import { runMigrations } from "../src/db";
import { useThemeStore, usePremiumStore } from "../src/stores";
import { getEntitlement } from "../src/services/premiumService";

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: "fade" }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="add-subject"
        options={{
          presentation: "transparentModal",
          headerShown: false,
          animation: "slide_from_bottom",
        }}
      />
      <Stack.Screen
        name="edit-subject"
        options={{
          presentation: "transparentModal",
          headerShown: false,
          animation: "slide_from_bottom",
        }}
      />
      <Stack.Screen
        name="add-homework"
        options={{
          presentation: "transparentModal",
          headerShown: false,
          animation: "slide_from_bottom",
        }}
      />
      <Stack.Screen
        name="premium"
        options={{ presentation: "modal", headerShown: false }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [appReady, setAppReady] = useState(false);
  const { loadTheme } = useThemeStore();
  const { setEntitlement } = usePremiumStore();

  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  useEffect(() => {
    const bootstrap = async () => {
      try {
        await loadTheme();
        const entitlement = await getEntitlement();
        setEntitlement(entitlement.isActive, entitlement.plan);
        await runMigrations();
      } catch (e) {
        console.error("[Kronos Bootstrap]", e);
      } finally {
        setAppReady(true);
      }
    };
    bootstrap();
  }, []);

  const isReady = appReady && (fontsLoaded || !!fontError);

  useEffect(() => {
    if (isReady) SplashScreen.hideAsync();
  }, [isReady]);

  if (!isReady) return null;

  return (
    <ErrorBoundary>
      <GlobalPortalProvider>
        <PortalManager>
          <RootLayoutNav />
        </PortalManager>
      </GlobalPortalProvider>
    </ErrorBoundary>
  );
}
