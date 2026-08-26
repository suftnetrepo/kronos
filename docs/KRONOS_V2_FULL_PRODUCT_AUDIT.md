# Kronos V2 — Full Product, Navigation, UX & Architecture Audit

**Scope:** audit only, no code changes. Every claim below is grounded in the current
repository (routes in `app/`, screens in `src/screens/`, services in `src/services/`,
hooks in `src/hooks/`, stores in `src/stores/`, schema/migrations in `src/db/`).

Two prior team notes already exist and are treated as primary sources, cross-checked
against the current code: [`docs/KRONOS_V2_IMPLEMENTATION_AUDIT.md`](KRONOS_V2_IMPLEMENTATION_AUDIT.md)
and [`docs/KRONOS_V2_INTEGRATION_STAGE.md`](KRONOS_V2_INTEGRATION_STAGE.md). Where this
audit disagrees with them (things they marked "deferred" that are now built, or things
they assumed were fine that aren't), it is called out explicitly.

---

## 1. Executive summary

Kronos is currently **two products layered on top of each other**:

- **Original production Kronos** — a subject/timetable-first app (`HomeScreen.tsx`,
  the legacy `homework` table, `HomeworkScreen`, a `defaultTab` "choose your home
  screen" setting, PIN/biometric fields in the settings schema) built with
  `fluent-styles`' native `StyledPage.Header` and `StyledCard` components.
- **Kronos V2** — a unified Task model (General/Homework/Study/Assignment), a Today
  dashboard, a rebuilt Timetable, an Academic Calendar, and a bespoke `ScreenHeader`
  component, all wired together through one clean invalidation bus
  (`useAppStore.dataVersion`).

The V2 layer is the stronger design in almost every respect that matters
functionally: it has one data model instead of two, it has no stale-data problem,
and its Today/Tasks/Timetable/Subject/Exam screens are internally consistent and
theme-driven. **The problems are not in the V2 data model — they're in the seams**:
dead code from the original app is still shipping and still reachable in one place
(Settings → "Default start tab" → Homework), a real user-facing setting
(`defaultTab`) is persisted but never actually consulted at launch, a real
user-facing feature (`lockEnabled`/`biometricEnabled`, PIN/biometric lock) exists
fully in the data layer with **zero UI**, "Clear all data" doesn't clear the V2
`tasks` table, and the app currently ships **at least four different header
treatments** with no shared source of truth.

None of this requires new features. It requires finishing what the V2 migration
already started, retiring what it already made redundant, and converging the visual
language onto the strongest existing patterns (mostly the ones in
`ScreenHeader`, `TodayScreen`, `TasksScreen`, `SubjectDetailScreen`,
`ExamDetailScreen`) rather than the older `fluent-styles`-native ones.

---

## 2. Current product map

```text
Kronos
├── Core planning data (SQLite via Drizzle, src/db/schema.ts)
│   ├── subjects        — timetable/classes (color, days, time, teacher, room, reminder)
│   ├── tasks            — V2 unified: type ∈ {task, homework, study, assignment}
│   ├── exams             — date, room, notes, reminder
│   ├── homework (legacy) — orphaned, superseded by tasks(type='homework')
│   └── settings (singleton) — firstDayOfWeek, lock/biometric, reminders, defaultTab
│
├── Bottom-tab shell (app/(tabs)/_layout.tsx via FloatingTabBar)
│   ├── Today   (index)
│   ├── Tasks
│   ├── [+] Quick Add (floating, not a real tab)
│   ├── Exams
│   └── More
│       ├── Timetable
│       ├── Academic Calendar
│       ├── Settings
│       └── Premium
│
├── Hidden/legacy tab routes (registered, not in the tab bar)
│   ├── homework  → HomeworkScreen (orphaned data path)
│   └── settings  → same SettingsScreen as More → Settings
│
└── Push/modal routes
    ├── /new-task (modal)            — unified Task create/edit
    ├── /task/[id], /subject/[id], /exam/[id] (push) — detail screens
    ├── /add-subject, /edit-subject (transparentModal) — subject sheets
    ├── /add-homework (transparentModal) — legacy, effectively unreachable
    ├── /timetable, /calendar (push)
    └── /premium (modal)
```

---

## 3. Full navigation map

```text
App Launch
   │
   ├── Bootstrap (app/_layout.tsx): fonts, purchase manager, theme, entitlement,
   │   migrations, settings hydration, reminder reschedule — no security gate,
   │   no defaultTab redirect (see §7, §22)
   │
   └── (tabs) — FloatingTabBar shows: Today · Tasks · [+] · Exams · More
         │
         ├── Today  (app/(tabs)/index.tsx → TodayScreen)
         │     → Subject Detail, Task Detail, Exam Detail, Timetable, Tasks tab
         │
         ├── Tasks  (app/(tabs)/tasks.tsx → TasksScreen)
         │     → Task Detail, New Task (via the [+] Quick Add pattern, see §13)
         │
         ├── [+] Quick Add (app/quick-add.tsx, transparentModal)
         │     ├── Task      → /new-task?type=task
         │     ├── Homework  → /new-task?type=homework   (V2 task, NOT legacy homework)
         │     ├── Exam      → /(tabs)/exams?add=1        (opens AddExamSheet)
         │     └── Class     → /add-subject               (AddSubjectSheet)
         │
         ├── Exams  (app/(tabs)/exams.tsx → ExamsScreen)
         │     → Exam Detail, AddExamSheet, EditExamSheet
         │     ⚠ only tab that renders a back chevron (StyledPage.Header) — see §18
         │
         └── More  (app/(tabs)/more.tsx)
               ├── Timetable            → /timetable  (Day/Week)
               ├── Academic Calendar    → /calendar   ⚠ ONLY entry point in the app, see §5/§8
               ├── Settings             → /settings   (same screen as hidden tab)
               └── Kronos Premium       → /premium

Hidden tab-bar routes (reachable only by direct navigation, no tab icon):
   ├── /homework → HomeworkScreen + AddHomeworkSheet (orphaned, see §9)
   └── /settings → SettingsScreen (redundant path — same screen as More → Settings)

Detail/push screens (all use ScreenHeader, see §18):
   ├── /subject/[id]  → SubjectDetailScreen  → New Task(prefilled), Exam Detail, Task Detail
   ├── /exam/[id]     → ExamDetailScreen     → New Task(type=study, prefilled), Task Detail
   └── /task/[id]     → TaskDetailScreen     → New Task(edit), Subject Detail, Exam Detail

Modal screens:
   ├── /new-task        — Cancel/Save header, hand-rolled (see §18)
   ├── /add-subject, /edit-subject — Cancel/Save sheet header (AddSubjectSheet)
   ├── /add-homework    — Cancel/Save sheet header (orphaned, see §9)
   └── /premium         — custom close-button header (PremiumScreen)
```

**Back-navigation correctness:** all push/modal routes call `router.back()`
correctly and land on the screen that opened them. The one structural anomaly is
`ExamsScreen` (a *tab root*) rendering `StyledPage.Header`'s back chevron —
pressing it calls `router.back()` from a tab root, which is not something any of
the other three primary tabs (Today, Tasks, More) do, and is behaviourally
undefined/inconsistent from a bottom-tab UX standpoint.

---

## 4. Feature inventory

Status of every area named in the brief, verified against the code:

| Area | Table/service | Screen(s) | Status |
|---|---|---|---|
| Today / Home | (aggregator only — `useSubjects`/`useTasks`/`useExams`) | `TodayScreen` | ✅ Built, live-data, theme-driven (§12) |
| Timetable | `subjects` | `TimetableV2Screen` (Day/Week) | ✅ Built, recently polished |
| Subjects / Classes | `subjects` / `subjectService` | `SubjectDetailScreen`, `AddSubjectSheet`, `EditSubjectSheet` | ✅ Built (§10) |
| Tasks (general) | `tasks` / `taskService` | `TasksScreen`, `TaskDetailScreen`, `/new-task` | ✅ Built (§9) |
| Homework | `tasks(type='homework')` **and** legacy `homework` table | V2: same as Tasks. Legacy: `HomeworkScreen`, `AddHomeworkSheet` | ⚠️ Two parallel implementations, only one reachable (§9) |
| Study Tasks | `tasks(type='study')` | Created from `ExamDetailScreen` | ✅ Built (§11) |
| Assignments | `tasks(type='assignment')` | Same screens as General/Homework, filtered by `type` | ✅ Built |
| Exams | `exams` / `examService` | `ExamsScreen`, `ExamDetailScreen`, `AddExamSheet`, `EditExamSheet` | ✅ Built (§11) |
| Calendar | (aggregator only) | `CalendarScreen` | ✅ Built, functionally complete, poorly placed (§5/§8) |
| Notifications | `notificationService` | n/a (cross-cutting) | ✅ Built, covers subjects/tasks/exams uniformly |
| Settings | `settings` / `settingsService` | `SettingsScreen` | ⚠️ Built, but incomplete/misleading in places (§14) |
| Themes | `themes.ts` / `useThemeStore` | consumed via `useColors()` everywhere | ✅ Built, strong (§15) |
| Backup / Restore | `downloadedExportPath` (schema only) + timetable-only share/import | `ShareTimetableContent`, `ImportTimetableContent` | ⚠️ Timetable-only; Tasks/Exams have no backup path at all |
| Premium | `premiumService`, RevenueCat/Mock managers | `PremiumScreen`, `PremiumGate`, `MockPaymentSheet` | ⚠️ Built and functional, but theme-broken (§15) |
| Security | `lockEnabled`/`biometricEnabled` (schema/store/hook only) | **none** | ❌ Not built — data layer only, zero UI (§6/§22) |

---

## 5. Hidden / discoverability issues

**Calendar** (`src/screens/calendar/CalendarScreen.tsx`) is a fully-built,
fully-functional month view that aggregates subjects + tasks + exams with correct
deep-links (confirmed in code — see §8). Its **only entry point in the entire
app** is one row inside **More**, sitting visually flat between "Timetable",
"Settings" and "Kronos Premium" (`app/(tabs)/more.tsx`) — four equally-weighted
rows with no hierarchy, icons, or indication that Calendar is a first-class
planning surface rather than a utility link. It is not linked from Today, not
linked from Timetable, and not linked from Settings. This matches the concern
raised in the brief almost exactly, except it's one level shallower than
feared (More, not Settings) — still too deep for what the brief correctly
identifies as "a major academic planning feature."

Other discoverability gaps found during the audit:

- **PIN/biometric lock** — fully modelled in the data layer but there is no
  Settings row, no lock screen, and `expo-local-authentication` (already a
  dependency) is imported nowhere in `src/`. The feature is invisible because it
  doesn't exist as UI yet — not a navigation problem, a "never finished" problem
  (see §6, §22).
- **Backup/Restore/Export** — `downloadedExportPath` exists on the settings row
  and is written nowhere and read nowhere. Only *timetable* share/import exists
  (Settings → Timetable section); there's no path to back up or restore Tasks or
  Exams at all.
- **Legacy Homework** — technically has a route, technically has a UI, but is
  disconnected from every other data path in the app (see §9). This isn't a
  "hard to discover" feature so much as a feature that actively misleads a user
  who does find it.
- **Original `HomeScreen`** — completely undiscoverable, effectively dead code
  (562 lines, nothing imports it).
- **`/homework` and `/settings` as hidden tab routes** — both registered with
  `href: null` in `app/(tabs)/_layout.tsx`, reachable only by direct navigation;
  `/settings` is a pure duplicate of the pushed Settings screen.

---

## 6. Original production behaviour vs V2

Reconstructed from the migration history (`src/db/migrations.ts`, each migration
labelled by the team's own "Phase" comments) plus the two prior audit notes:

| Phase | What it added | Status today |
|---|---|---|
| 1 — initial schema | `subjects`, `homework`, `exams`, `settings` (firstDayOfWeek only) | `subjects`/`exams` fully alive; `homework` orphaned |
| 2 — app-level settings | `lockEnabled`, `biometricEnabled`, `remindersEnabled`, `downloadedExportPath` | `remindersEnabled` alive; the other three are dead columns with no UI (§4, §22) |
| 3 — reminder ID tracking | `subjects.reminderIds` | Alive, used by `notificationService` |
| 4 — default tab | `settings.defaultTab` | Persisted and shown in Settings, but never read at launch (§7) |
| 5 — exam reminders | `exams.reminder`/`reminderId` | Alive, fully wired |
| 6 — "Kronos V2 task domain" | `tasks` table | Alive — this is the current core of the app |
| 7 — legacy homework surfaced into Tasks | one-time `INSERT OR IGNORE` copy from `homework` → `tasks` | Ran once; the source table and its screen are still live and divergent (§9) |

Cross-checking the team's own prior note
([`KRONOS_V2_IMPLEMENTATION_AUDIT.md`](KRONOS_V2_IMPLEMENTATION_AUDIT.md)),
several items it explicitly listed as "deliberately deferred" have since shipped
— **Task reminder scheduling** and the **Academic month calendar** are both now
fully built and working, ahead of that note. Others it flagged remain exactly as
deferred: **destructive migration of legacy Homework into Tasks**,
**PIN/biometric lock screens**, and **backup format V2 (task) integration** are
all still open, matching this audit's independent findings in §9, §22 and §4.
The original app's biggest genuine UX idea that V2 dropped in practice (though
not in the schema) is the **user-chosen home screen** (§7) — everything else
from the original app that still matters is already subsumed by V2's Today +
Timetable + unified Tasks.

---

## 7. Home/start-screen analysis

The original app had a genuine "pick your home screen" feature, and its plumbing
is still intact:

- `settings.defaultTab: 'index' | 'homework' | 'exams'` (`src/db/schema.ts`,
  migration 004 "Phase 4").
- `useSettingsStore`/`useSettings` expose it with a persisting setter.
- **Settings → Navigation → "Default start tab"** (`SettingsScreen.tsx:500-609`)
  lets the user pick between three options labelled **Timetable / Homework /
  Exams**, with a checkmark showing the active choice, and immediately does
  `router.replace(TAB_ROUTES[choice])`.

**What V2 changed, and where it broke:**

1. `TAB_ROUTES.index` used to point at the original `HomeScreen` (subject
   timetable). V2 repointed `app/(tabs)/index.tsx` to `TodayScreen` — so the
   Settings option still labelled **"Timetable"** now actually opens **Today**.
   The label is stale relative to what the route does.
2. **Nothing at app boot reads `defaultTab`.** `app/_layout.tsx` hydrates
   settings (`hydrateSettings()`) but the root `Stack`/`Tabs` navigators have a
   fixed initial route (`index`/Today) — there is no redirect logic anywhere
   that consults the stored preference. Pressing a "Default start tab" option
   in Settings **does** navigate you there immediately (it's really acting as a
   shortcut/link, not a preference), but on the **next cold launch the app
   always opens on Today regardless of what was chosen and persisted**. This is
   a broken promise: the UI shows a persisted, checked selection that has no
   effect on the behaviour it claims to control.
3. Two of the three options don't point where a user would expect: "Homework"
   routes to the orphaned `/homework` tab (see §9); "Timetable" routes to
   Today, not `/timetable`.

**Recommendation:** don't assume Today must be the only home screen — the
underlying mechanism (a persisted default route, read at launch) is sound and
worth restoring, but it needs: (a) an actual read of `defaultTab` at boot to
pick the initial tab, (b) options that map to *real, current* destinations
(Today, Tasks, Timetable, Exams — Calendar could reasonably be folded in once
it has a first-class nav position, see §8), and (c) correct labels. This is a
small, well-contained fix, not a redesign — the store/service/schema layer
needs no changes at all.

---

## 8. Calendar placement analysis

`CalendarScreen.tsx` is a **pure view**, not a duplicate database: it calls
`useSubjects()`, `useTasks()`, `useExams()` directly and derives the month grid,
the "has activity" dot, and the day agenda from those three hooks — no calendar-
specific table, no calendar-specific service. Every agenda row deep-links
correctly: classes → `/subject/[id]`, tasks → `/task/[id]`, exams →
`/exam/[id]`, all confirmed in code.

Its only architectural gap: it is not on the `dataVersion` bus in the sense of
being able to react to changes made *while it's open* the way Today can, but
since it re-derives from the same live hooks on every render this is a non-issue
in practice.

**Most natural place in the IA:** Calendar is conceptually a sibling of
Timetable (both are "when" views over the same entities — Timetable is
week/day, Calendar is month), not a sibling of Settings/Premium inside More.
The recommendation (detailed in §26) is to fold it into Timetable as a third
Day/Week/Month mode rather than promoting it to its own tab.

---

## 9. Tasks/Homework analysis

Two parallel systems currently exist:

| | **Legacy Homework** | **V2 Tasks (type='homework' etc.)** |
|---|---|---|
| Table | `homework` | `tasks` |
| Service | `homeworkService.ts` | `taskService.ts` |
| Hook | `useHomework.ts` | `useTasks.ts` |
| Screen | `HomeworkScreen.tsx` + `AddHomeworkSheet.tsx` | `TasksScreen.tsx`, `TaskDetailScreen.tsx`, `/new-task` |
| Wired into `dataVersion` bus? | Yes (technically) | Yes |
| Reachable from the app's main flows? | **No** | Yes — Today, Tasks tab, Quick Add, Subject Detail, Exam Detail, Calendar |
| Written to by Quick Add "Homework"? | No | **Yes** — Quick Add → Homework opens `/new-task?type=homework`, i.e. a V2 Task |

Migration 007 (`src/db/migrations.ts`) already performs a **one-time copy** of
every existing `homework` row into `tasks` (`type='homework'`, id prefixed
`legacy-homework-`) specifically, per its own comment, "to surface existing
Homework records in the unified V2 Tasks workflow." This is the team's own code
confirming the intended direction: **Tasks is the single model; Homework-the-table
is legacy input only.**

The problem is the migration is a **copy, not a cutover**: the old `homework`
table, service, hook, screen and sheet are all still fully wired and still
present in the shipped bundle, and the one in-app path that still points at
them (Settings → Default start tab → Homework, §7) leads to a screen where:

- Any *existing* homework was already copied to Tasks (so it may show
  duplicated between the two screens).
- Any **new** homework created via that legacy screen writes only to the
  `homework` table — it will **not** appear in Today, Tasks, Subject Detail, Exam
  Detail, or Calendar, and will not get a Task-style reminder. It effectively
  vanishes from the rest of the app. This is the single most concrete
  "duplication/conflict" the audit was asked to find.

**Recommended mental model** (confirms the model V2 has already mostly built,
doesn't invent a new one):

```text
Tasks
  ├── General     (type='task')
  ├── Homework    (type='homework')
  ├── Study       (type='study')     — created from Exam Detail
  └── Assignment  (type='assignment')
```

One entity, one table, one service, one screen family (`TasksScreen` /
`TaskDetailScreen` / `/new-task`), differentiated only by `type` — exactly what
exists today for everything except the still-dangling legacy Homework path.

---

## 10. Subject/Class analysis

```text
Create Subject (AddSubjectSheet, opened from Quick Add→Class, or the Timetable FAB)
      ↓
Choose schedule (name, teacher, room, colour, repeat days, start/end time, reminder)
      ↓
Timetable (Day/Week — src/screens/timetable/TimetableV2Screen.tsx)
      ↓
Today (current/next class card, today's schedule list)
      ↓
Subject Detail (src/screens/subject/SubjectDetailScreen.tsx)
      ↓
Tasks (subject-filtered) / Exam (subject-linked)
```

Verified fields end-to-end: colour (`SUBJECT_COLORS` palette, used consistently
as background fill in Timetable/Today/Subject Detail/Exams/Calendar — see §15),
teacher, room, weekdays (`days` comma-string), start/end time, reminder
(`AddSubjectSheet` schedules via `scheduleSubjectReminders`), edit
(`EditSubjectSheet`), delete (cascades to legacy `homework` via
`ON DELETE CASCADE`, **not** to `tasks`, which uses `ON DELETE SET NULL` —
correct for V2's "keep the task, just unlink the subject" behaviour, but worth
noting the FK behaviour differs between the legacy and V2 tables — see §21),
task association (`tasks.subjectId`), exam association (`exams.subjectId`).

**Vocabulary:** the app is consistent — "Subject" is always the noun for the
timetable entity (`AddSubjectSheet`, `SubjectDetailScreen`, `subjectService`).
"Class" only appears as a *casual* label in two user-facing spots: Quick Add's
"Class" option and More's "Timetable — Day and week schedule" description — both
still route to Subject creation/viewing under the hood. There's no user-facing
"Timetable slot" concept distinct from Subject. This is fine — one consistent
backend concept ("Subject") with one acceptable casual synonym ("Class") in
copy — no real ambiguity found, contrary to what the brief worried about.

---

## 11. Exam analysis

```text
Create Exam (AddExamSheet: title, subject picker, date, room, notes, reminder)
     ↓
Subject (optional link, badge colour taken from linked subject)
     ↓
Exam Detail (src/screens/exams/ExamDetailScreen.tsx)
     ↓
Study Tasks (task type='study', created from Exam Detail with examId set)
     ↓
Study Progress (completed / total study tasks, shown as a progress bar)
     ↓
Today ("Coming up") / Calendar (exam entries)
```

All fields verified in code: date, room, notes (used as free-text "topics",
split by newline in `ExamDetailScreen`), subject, reminder
(`EXAM_REMINDER_OPTIONS`: 1h/1d/3d/1w before), study tasks, progress bar, past
vs upcoming state (`getCalendarDateState`), edit (`EditExamSheet`), delete (with
confirmation, cancels the reminder first). Creating an exam is reachable from
Quick Add and the Exams tab FAB — two entry points, both leading to the same
`AddExamSheet`, which is good (no duplicate implementations). Exams are easy
enough to create and access already — no changes recommended to this flow.

---

## 12. Today analysis

`TodayScreen.tsx` (`src/screens/home/TodayScreen.tsx`) is the strongest screen
in the app and a good architectural template:

- Pulls live from `useSubjects(today)`, `useTasks()`, `useExams()` — the same
  hooks every other screen uses. No parallel/duplicate state.
- Current/next class is derived at render time from subject start/end times
  against `new Date()` — correct, no caching drift.
- "Things to do" = `useTasks().active` filtered to due-today-or-dateless — this
  is exactly the unified Task model in action (task/homework/study/assignment are
  indistinguishable here, which is correct for an aggregator).
- "Coming up" = first item of `useExams().upcoming`.

**Data-consistency confirmation:** every mutation hook (`useTasks`, `useExams`,
`useSubjects`) calls `useAppStore().invalidateData()` after create/update/
complete/remove, which bumps a single `dataVersion` counter. Every read hook
depends on `[dataVersion]` in its `useAsync` dependency array
(`src/hooks/useAsync.ts` pattern, confirmed in `useTasks.ts`, `useExams.ts`,
`useSubjects.ts`). So: Edit Subject → Today updates, Complete Task → Today
updates, Delete Exam → Today's "Coming up" updates — all true, verified in code,
not just by inspection of the screens. **This is the single strongest piece of
architecture in the codebase and should be the template for anything new.**

**Gap:** `TodayScreen` does not participate in the legacy `homework` table at
all (correctly — it shouldn't), which is one more confirmation that legacy
Homework is functionally invisible from the app's actual "front door."

No time-zone handling is done beyond `new Date()`/local Date math throughout
(`isSameLocalDay`, `nextLocalDay` in `src/utils/dateState.ts`) — consistent but
worth flagging that everything is implicitly device-local-time; there is no
explicit multi-timezone handling anywhere in the app (unlikely to matter for a
single-device student planner, noted for completeness).

---

## 13. Quick Add analysis

`app/quick-add.tsx` offers **Task / Homework / Exam / Class** — this is a good,
minimal grouping and every option opens a real, correct existing workflow (see
navigation map in §3; no dead ends). No changes needed to the grouping itself.

Contextual (non-Quick-Add) creation entry points confirmed in code:

```text
Subject Detail → "+ Add task"      (New Task, subjectId prefilled)
Exam Detail    → "+ Add study task" (New Task, type=study, subjectId+examId prefilled)
Timetable      → [+] FAB           (added this session, opens /add-subject)
Tasks tab      → no dedicated add action — relies entirely on Quick Add
```

Quick Add does complement rather than replace contextual actions everywhere
except the **Tasks tab itself**, which has no FAB/add affordance of its own —
today the only way to add a plain task from the Tasks screen is to leave it and
open Quick Add (or Today, which also has no add affordance). This is a minor
friction point worth fixing, not a broken flow.

---

## 14. Settings analysis

Full inventory of `SettingsScreen.tsx`, as currently grouped in the UI:

| Section (as shown) | Rows |
|---|---|
| Premium banner | Upgrade CTA / active-plan badge |
| Appearance | 5 theme tiles (Indigo, Ocean, Forest, Midnight, Rose) |
| Reminders | Enable reminders (toggle), Resync reminders |
| Navigation | **Default start tab**: Timetable / Homework / Exams (see §7) |
| Timetable | Share timetable, Import timetable, Undo last import (conditional) |
| About | Kronos v1.0.0, "Student timetable / free" |
| Danger Zone | Clear all data, Reset premium (dev-only, `__DEV__`) |

**Not present anywhere in the UI, despite existing in the data layer:**
Security (PIN/biometric — see §6), Backup/Restore/Export beyond timetable
sharing, Class/Task/Exam reminder *granularity* (there's one global
"remindersEnabled" switch; per-category reminder toggles from the brief's example
don't exist, nor were they found in the original app), Restore purchases (this
actually lives on `/premium`, not Settings — reasonable, but means "Premium" as a
*settings category* is really just the upsell banner + a link out).

**Misplacement, confirmed against §5:** Calendar is not reachable from Settings
at all (good — it shouldn't be treated as a Settings destination), but it *is*
effectively a peer of "Timetable" and "About" inside **More**, which has the
same flattening problem the brief warned about, one level removed.

**Architecture violation found here specifically:** `SettingsScreen.tsx` imports
`db` and raw schema tables (`subjects, homework, exams, settings`) directly and
performs `db.delete(...)`/`db.insert(...)` in `handleClearAll` and
`db, subjects` in `handleUndoImport` — bypassing the service layer that every
other screen uses (`taskService`, `examService`, `subjectService`,
`homeworkService`). This is very likely *why* the bug below exists — a dedicated
`resetAllData()` service function would have been one place to keep in sync with
schema changes; a screen reaching into Drizzle directly is not.

**Confirmed bug — "Clear all data" is incomplete:** `handleClearAll` deletes
`exams`, `homework`, `subjects`, `settings` and re-inserts a fresh settings row —
it **never deletes `tasks`**. After "Clear all data," every General/Homework/
Study/Assignment task a user created remains in the database and will still
appear in Today/Tasks/Calendar. Given the confirmation dialog's own copy
("This will permanently delete all subjects, homework, exams and settings"),
this is a real data-integrity gap, not a matter of taste — flagged as high
severity in §21/§29.

---

## 15. Theme architecture analysis

The theme system itself (`src/constants/themes.ts`, `useColors.ts`) is a genuine
strength: five complete `AppColors` palettes (Indigo/Ocean/Forest/Midnight/Rose)
covering primary/background/card/text/border/semantic (success/warning/error/
info) and dedicated subject-chip tokens, persisted via `useThemeStore` to
`expo-secure-store`, gated by premium (`PREMIUM_THEMES`), and consumed
everywhere through one hook: `useColors()`. Midnight is a genuine dark theme
(dark backgrounds, light text) — the app already supports dark mode as *a theme
choice*, not as a `prefers-color-scheme` toggle.

**Violations found — hard-coded colours that bypass the theme, by file:**

| File | Hard-coded value(s) | Effect |
|---|---|---|
| `src/screens/premium/PremiumGate.tsx` | `#6366F1` (×6, plus `15`/`30` alpha variants) | The paywall/upsell gate is **always indigo**, regardless of the user's selected theme (Ocean/Forest/Midnight/Rose users see a mismatched purple accent). |
| `src/screens/premium/MockPaymentSheet.tsx` | `#6366F1`, `#4F46E5`, `#F2F2F7`, `#FF9500` | Same problem — the mock payment sheet is entirely theme-independent, including its background (`#F2F2F7` ignores `Colors.bg`, and would look wrong under Midnight's dark theme in particular). |
| `src/screens/exams/ExamsScreen.tsx` | `#6B7280` | Minor — fallback colour for exams with no linked subject; a neutral grey is defensible here but it's still a literal rather than a token. |
| `src/screens/timetable/ShareTimetableContent.tsx` | `#111827` | Text colour on a QR/share card — should be checked against theme text tokens. |

Shadow colours (`#000`, `shadowColor` in `HomeScreen.tsx`,
`TimetableV2Screen.tsx`) are **not** flagged as violations — neutral black
shadows are standard practice regardless of theme and every V2 screen already
does the same.

**No new/parallel theme system was found anywhere** — every V2 screen audited
(Today, Tasks, Task Detail, New Task, Timetable, Subject Detail, Exam Detail,
Calendar) consumes `useColors()` correctly. The violations above are isolated to
the **Premium** surfaces, which is good news: fixing theme compliance is a
contained, two-file problem, not a systemic one.

---

## 16. Production UI reference components

# Production UI Reference Components

| Component | Location | Where currently used | Why it is good | Where V2 should reuse it |
|---|---|---|---|---|
| **`useColors()` / `AppColors` token set** | `src/constants/themes.ts`, `useColors.ts` | Everywhere | Single source of truth for every colour in the app; five complete palettes incl. a real dark theme | Already universal in V2 screens except Premium (§15) — fix those two files |
| **`dataVersion` invalidation bus** | `src/stores/index.ts` (`useAppStore`), consumed by every `use*` hook | Tasks, Exams, Subjects, (Homework) | Zero stale-data risk with almost no code — one counter, one dependency array entry per hook | Template for any future entity/hook |
| **`ScreenHeader`** | `src/components/ScreenHeader.tsx` | Timetable, Subject/Exam/Task Detail, Calendar | Purpose-built back-button + optional centered title/subtitle + optional trailing action; already the most-reused header in the app | Should become the **only** pattern for pushed detail screens (see §18) — extend it to cover the Cancel/Save modal case too, rather than each modal hand-rolling its own |
| **`StyledPage.Header`** (fluent-styles) | `SettingsScreen`, `ExamsScreen` | Settings, Exams | Library-native, handles back arrow + left-aligned title + optional right slot in one call | Legitimate alternative to `ScreenHeader` for now, but two components doing the same job is exactly the "several different header treatments" problem in §18 — pick one |
| **Cancel / Title / Save modal-sheet header** (repeated 3×, hand-rolled each time) | `src/screens/subject/AddSubjectSheet.tsx`, `src/screens/exams/AddExamSheet.tsx`, `app/new-task.tsx` | Add/Edit Subject, Add/Edit Exam, New/Edit Task | The right *pattern* (disabled Save until valid, centered title, muted Cancel) | Should be extracted into one shared `<ModalFormHeader>` — currently three near-identical, independently-maintained implementations with slightly different spacing already |
| **`FloatingTabBar`** | `src/components/FloatingTabBar.tsx` | Root tab shell | Clean floating pill bar, integrates the [+] Quick Add affordance elegantly at index 2, respects safe-area insets | Reference for any future floating control (already followed by the Timetable FAB) |
| **`Switch` (fluent-styles)** | Used in `SettingsScreen`, `AddSubjectSheet`, `AddExamSheet`, `app/new-task.tsx` | Reminders, class/exam reminder toggles | One consistent toggle control, theme-aware via `activeColor`/default | Already consistently reused — good |
| **`SwipeDeleteAction`** | `src/components/SwipeDeleteAction.tsx` | `HomeScreen` (subjects), `ExamsScreen` (exams) | Native-feeling swipe-to-delete with a single shared implementation | Worth extending to Tasks list rows, which currently only support delete via Task Detail |
| **Section-header + `StyledCard` list group** (label row + rounded card with `StyledDivider`-separated rows) | `SettingsScreen.tsx` (`SectionHeader`), `ExamsScreen.tsx` | Settings, Exams | Clear grouping, good information density, consistent radius/border/shadow | Good candidate for any future grouped-settings-style screen |
| **Empty states** (`StyledEmptyState` vs hand-rolled) | `HomeScreen`/`ExamsScreen` use `StyledEmptyState`; `TasksScreen`/Timetable Day mode hand-roll their own empty-state card | Mixed | Both look fine individually | Pick one — `StyledEmptyState` is the library-native option and is already proven in two screens |

---

## 17. Screen quality grading

```text
A — Already production quality
B — Good foundation, requires polish
C — Functionally correct but visually inconsistent
D — Requires substantial redesign
```

| Screen | Grade | Why |
|---|---|---|
| **Today** | A | Fully theme-driven, consistent spacing/typography, correct live data, no hard-coded colour found. Reference-quality. |
| **Tasks** | A− | Same quality bar as Today; only ding is no add affordance of its own (§13). |
| **New Task** | B+ | Recently polished this session to match the app's spacing/typography system (compact type grid, pill controls, consolidated reminder card); functionally complete and theme-driven throughout. |
| **Task Detail** | A− | Clean, theme-driven, correct linked-exam/subject navigation; minor — no swipe-delete, only a bottom "Delete task" button (inconsistent with Exams' row-level swipe). |
| **Timetable** | B | Recently polished (Week occupancy-map cards, refined header/nav/segmented control); Day mode intentionally denser and consistent with the rest of the app; still worth a second look once Calendar/Timetable relationship is settled (§8, §26). |
| **Subject Detail** | A− | Theme-driven, good metric cards, correct task/exam associations; visually the most "designed" screen alongside Today. |
| **Exam Detail** | A− | Same quality bar; progress bar and study-task list are clean and correctly wired. |
| **Calendar** | B+ | Functionally excellent (§8) and theme-driven; visual polish is a notch below Today/Subject/Exam Detail (denser month grid, smaller touch targets on date cells) — good foundation. |
| **Quick Add** | B+ | Clean bottom sheet, theme-driven, correct routing for all four options; visually solid, slightly generic icon-row layout. |
| **More** | C | Functionally trivial (four flat rows, `row()` helper with no icons/hierarchy) — works, but doesn't communicate that Calendar is a major feature vs. a utility link (§5/§8). |
| **Settings** | C | Uses the older `StyledPage.Header` pattern (fine on its own, but inconsistent with `ScreenHeader` used elsewhere — §18); contains dead/misleading rows (Default start tab → Homework, §7); "Clear all data" is buggy (§14/§21). Needs both a data-completeness fix and a visual/IA pass, not a full redesign. |
| **Premium** | D | Functionally solid (plan selection, restore purchases, store-unavailable state all present) but is the **only** place in the app with hard-coded, theme-breaking colours (`#6366F1` throughout `PremiumGate.tsx`, `MockPaymentSheet.tsx`) — a Midnight/Ocean/Forest/Rose user sees an indigo paywall that doesn't match the rest of their app. |
| **Security** | — (does not exist) | No screen exists. `lockEnabled`/`biometricEnabled` are modelled end-to-end in the data layer with zero UI (§6/§22). Cannot be graded because there is nothing to grade. |

---

## 18. Navigation/header standardisation

At least **four independent header treatments** currently ship:

1. **`ScreenHeader`** (`src/components/ScreenHeader.tsx`) — back button (44×44
   touch target, ~38px visible circle) + optional centered title/subtitle +
   optional trailing text action. Used by Timetable, Subject/Exam/Task Detail,
   Calendar.
2. **`StyledPage.Header`** (fluent-styles library component) — back arrow +
   left-aligned title + optional right-side custom node. Used by Settings,
   Exams. Visually similar intent to `ScreenHeader` but a completely different
   implementation, so the two will drift over time (already do — sizes,
   corner radii and alignment aren't identical between them).
3. **Cancel / Title / Save modal-sheet header** — hand-rolled independently
   three times: `app/new-task.tsx`, `AddSubjectSheet.tsx`, `AddExamSheet.tsx`.
   Same intent, same disabled-until-valid Save logic, slightly different
   spacing/typography each time.
4. **Ad-hoc/no header** — `TodayScreen`/`TasksScreen`/`More` (correct — they're
   tab roots and shouldn't have a back button); `PremiumScreen` has its own
   bespoke floating "✕" close button in the top-right instead of any of the
   above; the orphaned `HomeScreen` has yet another bespoke header (logo +
   title + import/share icon buttons).

**Recommended consolidation — three patterns, matching the brief's own example:**

```text
Pattern A — Root Screen (tab)
  No back button. Optional inline title text (Today/Tasks style). Used by:
  Today, Tasks, More, Exams (drop its back chevron — it's a tab root).

Pattern B — Push / Detail Screen
  ScreenHeader: back + centered title(+subtitle) + optional trailing action.
  Used by: Timetable, Subject/Exam/Task Detail, Calendar, Settings (replace
  StyledPage.Header here to remove pattern #2 entirely).

Pattern C — Modal Form
  One shared <ModalFormHeader>: Cancel (left) / Title (center) / Save (right,
  disabled until valid). Used by: New Task, Add/Edit Subject, Add/Edit Exam,
  Premium (adapt its close button to the same visual language).
```

This removes header treatments #2 and the duplicated #3 without inventing
anything new — Pattern B is already `ScreenHeader`, Pattern C is already the
*right idea*, just triplicated.

---

## 19. User journey findings

**Journey 1 — New Student (Install → Setup → Add Subjects → Build Timetable →
Today).** No onboarding/setup screen was found in `app/` (no `(onboarding)`
route content beyond the directory placeholder) — a brand-new user lands
directly on Today with an empty state, then must find Quick Add → Class or the
Timetable FAB to add their first subject. Works, but there's no guided
first-run path.

**Journey 2 — Homework (Teacher gives homework → Quick Add → Homework →
Subject → Deadline → Reminder → Save → Today → Complete).** Fully correct as
verified in code — Quick Add's Homework option is a V2 Task, appears in Today,
completes correctly via `taskService.complete`. **Caveat:** this journey is only
correct if the user reaches Homework via Quick Add. If they instead land on the
legacy `/homework` screen (via Settings → Default start tab, §7/§9), the same
journey silently fails to reach Today at all.

**Journey 3 — Exam (Create → Subject → Exam Detail → Study Tasks → Progress).**
Fully correct, verified in `ExamDetailScreen`/`AddExamSheet`/`taskService`.

**Journey 4 — Planning (Calendar → Select Date → View Classes+Tasks+Exam →
Open item).** Fully correct (§8), but the journey itself starts with "Calendar"
being three taps deep and unadvertised (More → Academic Calendar) rather than
a natural first stop.

**Journey 5 — Daily Usage (Open → See today → Next class → Work due →
Complete).** This is exactly what `TodayScreen` does, and does well (§12).

**Journey 6 — Custom Home.** Covered in full in §7 — the mechanism exists,
persists, but is disconnected from actual app launch. This journey currently
**cannot** be completed as a user would expect it to work.

**Unnecessary taps / dead ends / duplicate screens found across journeys:**
Calendar (buried, §5), `/homework` and `/settings` duplicate tab routes (§3),
Tasks tab has no own add action (relies on Quick Add, §13), Default start tab
setting has no effect after app restart (§7).

### Appendix — Simplicity audit (taps to complete major actions)

| Action | Taps (from a tab root) | Notes |
|---|---|---|
| Create homework | 2 (⊕ → Homework) → fill form → Save | Good — matches expectations |
| Create exam | 2 (⊕ → Exam) → fill form → Save | Good |
| View timetable | 2 (More → Timetable) | Acceptable, but Timetable is a primary planning surface living behind a secondary tab |
| Open calendar | 2 (More → Academic Calendar) | Same concern, more acute given Calendar's importance (§5/§8) |
| Complete task | 1 (tap the checkbox on a Tasks/Today row) | Excellent — no navigation required at all |
| Edit subject | 3 (Subject Detail → Edit → change fields → Save), reached via Today/Timetable/Subject list | Reasonable for a form-heavy action |
| Add study task | 1 from Exam Detail ("+ Add study task") | Excellent — a genuinely good contextual shortcut |
| Change theme | 2 (More → Settings → tap a theme tile) | Good |
| Backup data | **Not possible for Tasks/Exams** — only timetable subjects can be shared/imported (§4/§14); there is no "back up everything" action at all |

Flagged as unnecessarily long / broken, not just "long": Backup isn't slow,
it's **absent** for two of the app's three core entities. Everything else
audited is already fast.

---

## 20. Architecture findings

Layering is respected almost everywhere:

```text
UI (screens) → Hooks (useTasks/useExams/useSubjects/useHomework) →
  Stores (useAppStore.dataVersion, useSettingsStore, useThemeStore) →
  Services (taskService/examService/subjectService/homeworkService/
            settingsService/notificationService) → Drizzle → SQLite
```

**Exception found:** `SettingsScreen.tsx` imports `db` and raw schema tables
directly and performs Drizzle calls in-component (`handleClearAll`,
`handleUndoImport`) instead of going through a service — the one place in the
audited codebase where UI performs database logic directly (§14).

**Duplicate services:** `homeworkService`/`useHomework` fully duplicate what
`taskService`/`useTasks` (with `type='homework'`) already do, and are the only
duplicate service pair found (§9). No other service-layer duplication was
found — `taskService`, `examService`, `subjectService`, `settingsService`,
`notificationService` are each single-purpose and singly-implemented.

**Duplicated selectors:** none found beyond the Homework/Task split above —
`upcoming`/`past` (exams), `active`/`completed` (tasks), `pending`/`done`
(legacy homework) are each computed once, inside their respective hook, from a
single fetch.

**Stale-state risks:** none found in the V2 layer (§12). The only stale-state
risk in the app is conceptual, not technical: the legacy `homework` table can
silently diverge from `tasks` if the orphaned screen is ever reached (§9).

---

## 21. Data consistency findings

1. **`tasks` is excluded from "Clear all data"** (§14) — high-severity, silent,
   contradicts the confirmation dialog's own claim.
2. **Legacy `homework` writes are invisible everywhere else** (§9) — any new
   row created via `/homework` → `AddHomeworkSheet` does not appear in
   Today/Tasks/Calendar/Subject Detail/Exam Detail, and gets no reminder via the
   V2 notification path.
3. **`defaultTab` is persisted but never read at launch** (§7) — not a data
   *corruption* risk, but a genuine "setting has no effect" bug.
4. **`downloadedExportPath` is written nowhere, read nowhere** — dead column,
   harmless but worth removing or building the feature it implies.
5. **FK behaviour differs between legacy and V2 on subject delete**: `homework`
   cascades on subject delete, `tasks` sets `subjectId` to null instead — correct
   for each table's own design, but worth knowing if a subject-delete
   confirmation message is ever written generically across both ("this will
   also delete all homework for this subject" in `HomeScreen.tsx` is technically
   only true of the legacy table it's not even using — see next point).
6. **`HomeScreen.tsx`'s delete-subject confirmation copy** ("This will also
   delete all homework for this subject") is stale/incorrect relative to V2
   Tasks (which are *not* deleted on subject delete, only unlinked) — moot only
   because `HomeScreen` itself is unreachable; would need correcting if it, or
   copy borrowed from it, is ever reused.

No corruption or data-loss risk was found in the live, reachable V2 paths
(Today/Tasks/Timetable/Subject/Exam/Calendar) beyond the items above.

---

## 22. Features that should be restored

- **Default start tab actually affecting app launch** (§7) — restore the
  read-at-boot behaviour; keep the persisted preference and its Settings UI,
  fix the labels/targets.
- **PIN/biometric app lock** — the original app modelled this fully; V2 never
  built the UI. `expo-local-authentication` is already installed and unused.
  This is a restoration of intent already present in the schema, not a new
  feature request.
- Nothing else from the original app appears to be missing *functionality* —
  the original `HomeScreen`'s subject-timeline-as-home-screen concept is fully
  subsumed by Today + Timetable together, so it does not need restoring as a
  screen, just possibly as a `defaultTab` option pointing at Timetable.

## 23. Features that should be relocated

- **Calendar**: More → a primary/near-primary position (§5/§8/§26).
- **Security (once built)**: needs its own Settings category/section, not
  buried as a sub-row of something else — schema is ready.
- **Backup/Export** (once built): deserves its own Settings "Data" category
  distinct from "Timetable" (Timetable's Share/Import is subject-only; a real
  backup needs to cover Tasks and Exams too).

## 24. Features that should be simplified

- **Header treatments** — four patterns → three (§18).
- **Modal-form header** — three independent implementations → one shared
  component (§16/§18).
- **More screen** — four flat, icon-less rows → a properly grouped/iconed list
  that visually distinguishes "planning surfaces" (Timetable, Calendar) from
  "utilities" (Settings, Premium).

## 25. Features that may be redundant

- **`/homework` and `/settings` as hidden tab routes** — `/settings` is a pure
  duplicate of the pushed Settings screen; `/homework` is the orphaned legacy
  screen. Both are dead weight in the route table.
- **`HomeworkScreen` + `AddHomeworkSheet` + `homeworkService` + `useHomework`
  + the `homework` table** — fully superseded by Tasks (`type='homework'`);
  migration 007 already proves the intended direction. Safe to retire once
  confirmed no user has unmigrated data sitting only in the legacy table on an
  existing install (a second, final migration could be added to sweep any
  remainder before the table/screen are dropped — implementation detail for
  the next phase, not this audit).
- **The orphaned `HomeScreen.tsx`** — 562 lines with no import path anywhere;
  either delete it or, if any of its patterns (day-chip timeline,
  import/share icon buttons in a header) are wanted for Timetable/Today, lift
  just those patterns and delete the rest.

---

## 26. Recommended final navigation

```text
Kronos
├── Today            (unchanged — primary landing screen, or per user's
│                      Default Start setting)
├── Timetable         (Day / Week / Month — Month absorbs Calendar, see below)
├── Tasks             (All / Today / Upcoming / Completed — add a FAB/quick-add
│                      affordance of its own, §13/§19)
├── Exams             (Upcoming / Past — drop the tab-root back chevron, §18)
└── More
     ├── Subjects (optional dedicated list, currently reached only via
     │             Timetable/Today/Subject Detail — low priority)
     ├── Settings  (Appearance · Reminders · Default Start · Data · Security ·
     │              About — see §27)
     └── Premium
```

## 27. Recommended final information architecture

Calendar's most natural home is as a **third mode alongside Timetable's
existing Day/Week segmented control**, not a separate top-level destination —
Timetable and Calendar answer the same question ("when is X happening") at two
different zoom levels, and Timetable already owns the screen real estate and
navigation entry point Calendar needs. Concretely: extend the existing
Day/Week segmented control to Day/Week/Month, and have "Month" render
`CalendarScreen`'s existing month-grid + agenda (which is already a pure view
over the same hooks Timetable uses — no data work required). This gives
Calendar a primary nav position without adding a fifth bottom tab, and without
duplicating any UI that Timetable doesn't already have (header, segmented
control, safe-area handling are all already built).

Settings reorganised into the categories the brief proposed, matched against
what actually exists today:

```text
Settings
├── Appearance        — theme tiles (unchanged)
├── Default Start      — Today / Tasks / Timetable / Exams (fixed labels+targets, §7)
├── Reminders          — global enable + resync (unchanged)
├── Data
│    ├── Share/Import timetable (unchanged, moved under Data from "Timetable")
│    └── Clear all data (fixed to include Tasks, §14/§21)
├── Security            — PIN + biometric (new UI over existing schema, §22)
├── Premium             — upgrade banner / manage (unchanged)
└── About               (unchanged)
```

## 28. Page-by-page redesign priority

Ordered by (visual gap × how central the screen is to daily use):

1. **Premium** (§17: D) — theme-compliance fix is small and isolated but highly
   visible (every non-Indigo user sees it).
2. **Settings** (§17: C) — needs both the data-completeness fix (§14) and a
   `ScreenHeader`/Pattern-B header pass + the Security section.
3. **More** (§17: C) — needs the grouped/iconed treatment once Calendar moves
   into Timetable (§27), since More's row list shrinks and simplifies anyway.
4. **Calendar** (§17: B+) — polish pass once its nav position changes (§27),
   so the visual work happens once, in its final context.
5. Everything else (Today, Tasks, New Task, Task Detail, Timetable, Subject
   Detail, Exam Detail, Quick Add) is already A/B-grade and only needs the
   shared header consolidation (§18), not a redesign.

## 29. Risks

- **Retiring legacy Homework** touches a real (if orphaned) DB table — must
  confirm no existing installed users have data only in `homework` that never
  got the migration-007 copy (e.g. rows created after that migration ran, via
  the orphaned screen) before dropping anything.
- **Reconnecting `defaultTab` to launch routing** changes app boot behaviour —
  needs testing across all three (soon four) destinations plus the case where
  the stored value points at a since-removed destination (`'homework'`).
- **Moving Calendar into Timetable as a third segmented mode** changes an
  already-just-polished screen (Timetable was reworked this session, §17) —
  sequence this after Timetable's current visual state is confirmed approved,
  not concurrently.
- **Fixing "Clear all data"** is destructive-action code — needs a deliberate,
  reviewed change, not a quick patch, given it already has one bug from being
  hand-written outside the service layer.
- No risk was found in the theme/architecture layers themselves — they're
  sound and low-risk to build on.

## 30. Recommended implementation order

1. Fix "Clear all data" to include `tasks`, and move it into a proper
   `dataService.resetAll()` (or similar) so screens stop touching Drizzle
   directly (§14/§20/§22) — small, high-value, low-risk.
2. Fix `defaultTab`: read it at boot, correct its labels/targets (§7/§22).
3. Retire the legacy Homework path: hide `/homework`'s last entry point (the
   Default Start option), then remove `HomeworkScreen`/`AddHomeworkSheet`/
   `homeworkService`/`useHomework`/the hidden tab route once confirmed safe
   (§29), and delete the orphaned `HomeScreen.tsx`.
4. Fix Premium's theme violations (`PremiumGate.tsx`, `MockPaymentSheet.tsx`)
   (§15/§17).
5. Consolidate headers onto the three-pattern system (§18) — replace
   `StyledPage.Header` usages with `ScreenHeader`, extract one shared
   `<ModalFormHeader>` for New Task/Add Subject/Add Exam.
6. Move Calendar into Timetable as a third Day/Week/Month mode (§27); simplify
   More once Calendar is no longer a row there.
7. Rebuild Settings' IA (§27) and add the Security section UI over the
   existing schema (§22/§23).
8. Add a FAB/add-affordance to the Tasks tab (§13/§19) and consider extending
   `SwipeDeleteAction` to Task rows for parity with Exams.

This order fixes correctness/data bugs first (cheap, high-trust), then visual
consistency (theme, headers), then IA moves (Calendar, Settings, Security) last
— each step is independently shippable and testable, matching the "screen by
screen" review process requested for the next phase.

---

## Final proposed product structure

```text
TODAY
├── Next Class
├── Today's Schedule
├── Tasks Due
└── Coming Up (exam)

TIMETABLE
├── Day
├── Week
└── Month              (Calendar, folded in — §27)

TASKS
├── All
├── Today
├── Upcoming
└── Completed

EXAMS
├── Upcoming
└── Past

MORE
├── Subjects
├── Settings
│    ├── Appearance
│    ├── Default Start
│    ├── Reminders
│    ├── Data (backup/import/export/clear)
│    ├── Security (PIN/biometric)
│    └── About
└── Premium
```

This is a convergence of what already exists and works (Today/Tasks/Exams/Quick
Add's structure is sound as-is) with the two structural moves this audit found
justified by evidence (Calendar into Timetable, Security surfaced in Settings)
— not a reinvention of the product.

---

*End of audit. No code was changed in the course of producing this document.*
