import React, { useEffect } from 'react'
import { useRouter } from 'expo-router'
import { Tabs } from 'expo-router'
import { FloatingTabBar } from '../../src/components/FloatingTabBar'
import { useSettings } from '../../src/hooks/useSettings'
import { useSettingsStore } from '../../src/stores'
import { TAB_ROUTES, type TabName } from '../../src/constants'

export default function TabsLayout() {
  const router = useRouter()
  const { defaultTab } = useSettings()
  const { bootReady } = useSettingsStore()

  // After settings are hydrated and Tabs mounts, redirect to the selected default tab
  useEffect(() => {
    if (!bootReady || !defaultTab || defaultTab === 'index') return

    // Defer to next frame to ensure Tabs navigator is fully initialized
    const timer = requestAnimationFrame(() => {
      const route = TAB_ROUTES[defaultTab as TabName]
      router.replace(route)
    })

    return () => cancelAnimationFrame(timer)
  }, [bootReady, defaultTab, router])

  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index"    options={{ title: 'Timetable' }} />
      <Tabs.Screen name="homework" options={{ title: 'Homework'  }} />
      <Tabs.Screen name="exams"    options={{ title: 'Exams'     }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings'  }} />
    </Tabs>
  )
}
