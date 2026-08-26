import React, { useEffect, useState } from "react";
import { ScrollView } from "react-native";
import { Stack, StyledPressable, StyledPage } from "fluent-styles";
import { Text, PremiumIcon } from "../../components";
import type { PremiumIconName } from "../../components/PremiumIcon";
import { useColors } from "../../constants";
import { useSettingsStore } from "../../stores";
import TodayScreen from "./TodayScreen";
import HomeTimetableView from "./HomeTimetableView";
import CalendarScreen from "../calendar/CalendarScreen";

const greetingFor = (hour: number) =>
  hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

const VIEWS: [ViewKey, PremiumIconName, string][] = [
  ["today", "home", "Today"],
  ["timetable", "clock", "Timetable"],
  ["calendar", "calendar", "Calendar"],
];
type ViewKey = "today" | "timetable" | "calendar";

/**
 * The Home planning hub: a compact header + a Today/Timetable/Calendar
 * selector, with exactly one of the three existing screens mounted below.
 * Each pane owns its own scroll and stays untouched functionally — this
 * component only owns the header and which pane is currently visible.
 */
export default function HomePlanningScreen() {
  const C = useColors();
  const defaultTab = useSettingsStore((s) => s.defaultTab);
  const [view, setView] = useState<ViewKey>("today");

  // Reflect the persisted Default Start Tab (Settings → Navigation) as the
  // visible pane. `defaultTab` only changes on cold-launch hydrate or when
  // the user picks a new default in Settings — never from switching panes
  // here — so this can't fight a manual tap on Today/Timetable/Calendar.
  useEffect(() => {
    setView(defaultTab);
  }, [defaultTab]);

  return (
    <StyledPage
      showStatusBar
      statusBarStyle={"dark-content"}
      backgroundColor={C.bg}
    >
      <StyledPage.Header.Full>
        <Stack paddingHorizontal={20}>
          <Text variant="title" fontSize={22} color={C.textPrimary}>
            {greetingFor(new Date().getHours())} 👋
          </Text>
          <Text variant="bodySmall" color={C.textSecondary} marginTop={2}>
            Stay focused. You've got this!
          </Text>
        </Stack>
      </StyledPage.Header.Full>
      <Stack paddingHorizontal={20} paddingBottom={8}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1 }}
        >
          <Stack
            flexDirection="row"
            backgroundColor={C.bgCard}
            padding={4}
            borderRadius={15}
            borderWidth={1}
            borderColor={C.border}
            gap={2}
            marginTop={16}
          >
            {VIEWS.map(([key, icon, label]) => {
              const active = view === key;
              return (
                <StyledPressable
                  key={key}
                  flexDirection="row"
                  alignItems="center"
                  justifyContent="center"
                  gap={6}
                  minHeight={44}
                  paddingHorizontal={16}
                  borderRadius={11}
                  backgroundColor={active ? C.primary : "transparent"}
                  onPress={() => setView(key)}
                  accessibilityRole="button"
                  accessibilityLabel={label}
                  accessibilityState={{ selected: active }}
                >
                  <PremiumIcon
                    name={icon}
                    size={15}
                    color={active ? C.white : C.textSecondary}
                  />
                  <Text
                    fontSize={13}
                    fontWeight="700"
                    color={active ? C.white : C.textSecondary}
                  >
                    {label}
                  </Text>
                </StyledPressable>
              );
            })}
          </Stack>
        </ScrollView>
      </Stack>

      {view === "today" ? (
        <TodayScreen embedded onViewTimetable={() => setView("timetable")} />
      ) : null}
      {view === "timetable" ? <HomeTimetableView /> : null}
      {view === "calendar" ? <CalendarScreen embedded /> : null}
    </StyledPage>
  );
}
