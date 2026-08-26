import React from 'react'
import HomePlanningScreen from '../../src/screens/home/HomePlanningScreen'

// Today/Timetable/Calendar are all panes inside the Home hub itself now, so
// the user's persisted Default Start Tab preference (Settings → Navigation)
// is applied by HomePlanningScreen picking its initial pane — no cross-tab
// redirect needed here.
export default function TodayTab() {
  return <HomePlanningScreen />
}
