import React from "react";
import { Tabs } from "expo-router";
import { FloatingTabBar } from "../../src/components/FloatingTabBar";
export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(p) => <FloatingTabBar {...p} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="tasks" options={{ title: "Tasks" }} />
      <Tabs.Screen name="exams" options={{ title: "Exams" }} />
      <Tabs.Screen name="settings" options={{ title: "Settings" }} />
      <Tabs.Screen name="homework" options={{ href: null }} />
    </Tabs>
  );
}
