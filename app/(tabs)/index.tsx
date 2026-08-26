import React, { useEffect } from 'react'
import { Redirect } from 'expo-router'
import HomePlanningScreen from '../../src/screens/home/HomePlanningScreen'
import { useSettingsStore } from '../../src/stores'

// Today ('index') is where the tab navigator always mounts first, but the
// user's persisted Default Start Tab preference (Settings → Navigation)
// should actually decide what they see at launch. `startupRedirectPending`
// is true for exactly one pass after a cold-launch hydrate when the stored
// preference isn't Today; we redirect once, then clear it so Today remains
// normally reachable if the user taps its tab later in the session.
const START_TARGETS: Record<string, any> = {
  exams: '/(tabs)/exams',
  homework: { pathname: '/(tabs)/tasks', params: { type: 'homework' } },
}

export default function TodayTab() {
  const { bootReady, defaultTab, startupRedirectPending, clearStartupRedirect } = useSettingsStore()
  const redirectTarget =
    bootReady && startupRedirectPending && defaultTab !== 'index' ? START_TARGETS[defaultTab] ?? null : null

  useEffect(() => {
    if (redirectTarget) clearStartupRedirect()
  }, [redirectTarget, clearStartupRedirect])

  if (redirectTarget) return <Redirect href={redirectTarget} />
  return <HomePlanningScreen />
}
