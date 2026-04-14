import React from 'react'
import { Tabs } from 'expo-router'
import { FloatingTabBar } from '../../src/components/FloatingTabBar'

export default function TabsLayout() {
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
