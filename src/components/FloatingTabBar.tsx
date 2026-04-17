import React from 'react'
import { View } from 'react-native'
import { Stack, StyledPressable } from 'fluent-styles'
import * as Haptics from 'expo-haptics'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useColors } from '../constants'
import { HomeIcon, BookIcon, GraduationCapIcon, SettingsIcon } from '../icons/navigation'

const TABS = [
  {
    key:   'index',
    label: 'Timetable',
    icon:  (color: string, focused: boolean) => (
      <HomeIcon size={20} color={color} strokeWidth={focused ? 2.5 : 1.8} />
    ),
  },
  {
    key:   'homework',
    label: 'Homework',
    icon:  (color: string, focused: boolean) => (
      <BookIcon size={20} color={color} strokeWidth={focused ? 2.5 : 1.8} />
    ),
  },
  {
    key:   'exams',
    label: 'Exams',
    icon:  (color: string, focused: boolean) => (
      <GraduationCapIcon size={20} color={color} strokeWidth={focused ? 2.5 : 1.8} />
    ),
  },
  {
    key:   'settings',
    label: 'Settings',
    icon:  (color: string, focused: boolean) => (
      <SettingsIcon size={20} color={color} strokeWidth={focused ? 2.5 : 1.8} />
    ),
  },
]

interface FloatingTabBarProps {
  state:       any
  descriptors: any
  navigation:  any
}

export function FloatingTabBar({ state, navigation }: FloatingTabBarProps) {
  const Colors = useColors()
  const insets = useSafeAreaInsets()

  return (
    <View
      style={{
        backgroundColor:  Colors.bg,
        paddingBottom:    insets.bottom,
        paddingTop:       8,
        paddingHorizontal: 20,
      }}
    >
      <Stack
        flexDirection="row"
        alignItems="center"
        backgroundColor={Colors.bgCard}
        borderRadius={999}
        style={{
          shadowColor:   Colors.primaryDark,
          shadowOffset:  { width: 0, height: 4 },
          shadowOpacity: 0.10,
          shadowRadius:  20,
          elevation:     10,
        }}
      >
        {state.routes.map((route: any, index: number) => {
          const focused = state.index === index
          const tab     = TABS[index]
          if (!tab) return null

          const onPress = () => {
            Haptics.selectionAsync()
            const event = navigation.emit({
              type:              'tabPress',
              target:            route.key,
              canPreventDefault: true,
            })
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name)
            }
          }

          if (focused) {
            return (
              <StyledPressable
                key={route.key}
                flex={1}
                flexDirection="row"
                alignItems="center"
                justifyContent="center"
                gap={6}
                paddingVertical={11}
                paddingHorizontal={10}
                borderRadius={999}
                backgroundColor={Colors.primary}
                onPress={onPress}
                style={{
                  shadowColor:   Colors.primaryDark,
                  shadowOffset:  { width: 0, height: 3 },
                  shadowOpacity: 0.3,
                  shadowRadius:  8,
                  elevation:     5,
                }}
              >
                {tab.icon(Colors.white, true)}
                {/* <StyledText fontSize={12} fontWeight="700" color={Colors.white} numberOfLines={1}>
                  {tab.label}
                </StyledText> */}
              </StyledPressable>
            )
          }

          return (
            <StyledPressable
              key={route.key}
              flex={1}
              alignItems="center"
              justifyContent="center"
              paddingVertical={11}
              borderRadius={999}
              onPress={onPress}
            >
              {tab.icon(Colors.textSecondary, false)}
            </StyledPressable>
          )
        })}
      </Stack>
    </View>
  )
}
