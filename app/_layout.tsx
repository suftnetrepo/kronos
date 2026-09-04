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
import { useThemeStore, usePremiumStore, useSettingsStore, usePurchaseReadinessStore } from "../src/stores";
import { getEntitlement } from "../src/services/premiumService";
import { rescheduleAllReminders, ensureAndroidNotificationChannel } from "../src/services/notificationService";
import { initializePurchaseManager } from "../src/config/premium.config";

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: "fade" }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="add-subject"
        options={{
   
          headerShown: false,
          animation: "slide_from_bottom",
        }}
      />
      <Stack.Screen
        name="edit-subject"
        options={{
        
          headerShown: false,
          animation: "slide_from_bottom",
        }}
      />
      <Stack.Screen
        name="add-homework"
        options={{
        
          headerShown: false,
          animation: "slide_from_bottom",
        }}
      />
      <Stack.Screen name="timetable" options={{ headerShown: false }} />
      <Stack.Screen name="quick-add" options={{ presentation: "transparentModal", headerShown: false, animation: "fade" }} />
      <Stack.Screen name="new-task" options={{ presentation: "modal", headerShown: false }} />
      <Stack.Screen name="task/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="subject/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="exam/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="calendar" options={{ headerShown: false }} />
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
  const { hydrate: hydrateSettings } = useSettingsStore();
  const { setLoading: setPurchaseLoading, setReady: setPurchaseReady, setError: setPurchaseError } = usePurchaseReadinessStore();

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
        // Initialize purchase manager (mock or RevenueCat depending on environment)
        // This is critical for premium features to work
        setPurchaseLoading(true);
        await initializePurchaseManager();
        setPurchaseReady();
        
        await loadTheme();
        const entitlement = await getEntitlement();
        setEntitlement(entitlement.isActive, entitlement.plan);
        await runMigrations();
        await hydrateSettings();
        // Android needs a channel to exist before it'll post an alerting
        // (sound/heads-up) notification — no-op on iOS.
        await ensureAndroidNotificationChannel();
        // Reschedule reminders on app startup
        await rescheduleAllReminders();
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        console.error("[Kronos Bootstrap]", e);
        
        // Handle purchase manager initialization failure
        if (String(e).includes("purchase") || String(e).includes("RevenueCat")) {
          setPurchaseError(message);
          console.warn("[Kronos Bootstrap] Purchase manager failed. Premium features will be unavailable until app restart.");
        }
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
