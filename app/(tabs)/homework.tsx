import { Redirect } from 'expo-router'

// The legacy Homework tab (its own table/service/screen) is superseded by the
// unified Tasks model — migration 007 already copied every existing homework
// row into `tasks` (type='homework'). This route is kept registered (hidden
// from the tab bar via `href: null` in the tabs layout) so any existing
// deep link or stored preference still lands somewhere useful instead of a
// dead screen, but it no longer renders the legacy HomeworkScreen — new
// homework must be created through the Task flow (type=homework) so it
// stays visible everywhere else in the app.
export default function HomeworkTabRedirect() {
  return <Redirect href={{ pathname: '/(tabs)/tasks', params: { type: 'homework' } } as any} />
}
