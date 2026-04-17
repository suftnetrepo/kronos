You are working on **Kronos** (the timetable app) and using **Vela** only as a **reference/donor project**.

## Goal

Improve Kronos by adapting the strongest architectural and production-readiness patterns from Vela **without merging the apps** and **without importing unrelated cycle-tracker logic**.

Kronos must remain the source of truth for:

* timetable
* subjects
* homework
* exams
* reminders
* settings
* premium feature gating tied to timetable use cases

Vela is only a donor for:

* security / app lock flow
* settings architecture
* backup / export / import architecture
* premium service structure
* app config cleanup
* release hygiene / polish patterns

---

## Projects

### Target app

**Kronos**
Relevant files/folders include:

* `app/_layout.tsx`
* `app/add-homework.tsx`
* `app/add-subject.tsx`
* `app/edit-subject.tsx`
* `app/premium.tsx`
* `src/screens/home/HomeScreen.tsx`
* `src/screens/settings/SettingsScreen.tsx`
* `src/screens/premium/PremiumScreen.tsx`
* `src/screens/premium/PremiumGate.tsx`
* `src/screens/premium/MockPaymentSheet.tsx`
* `src/screens/subject/AddSubjectSheet.tsx`
* `src/screens/subject/EditSubjectSheet.tsx`
* `src/screens/timetable/ImportTimetableContent.tsx`
* `src/screens/timetable/ShareTimetableContent.tsx`
* `src/services/premiumService.ts`
* `src/services/notificationService.ts`
* `src/services/timetableShareService.ts`
* `src/services/subjectService.ts`
* `src/services/homeworkService.ts`
* `src/services/examService.ts`
* `src/hooks/usePremium.ts`
* `src/stores/*`
* `src/db/*`
* `src/components/ErrorBoundary.tsx`

### Donor app

**Vela**
Relevant donor files/folders include:

* `app/_layout.tsx`
* `app/index.tsx`
* `app/(lock)/lock-screen.tsx`
* `app/(lock)/_layout.tsx`
* `app/(auth)/pin-setup.tsx`
* `app/(app)/settings.tsx`
* `src/services/security.service.ts`
* `src/services/settings.service.ts`
* `src/services/velaDataService.ts`
* `src/services/premium.service.ts`
* `src/services/notification.service.ts`
* `src/hooks/useBiometric.ts`
* `src/hooks/useSettings.ts`
* `src/hooks/usePremium.ts`
* `src/stores/auth.store.ts`
* `src/stores/settings.store.ts`
* `src/constants/config.ts`
* `src/constants/premium.ts`
* `app.json`

---

## Important rules

1. **Do not merge the apps.**
2. **Do not copy Vela tracker/cycle-specific business logic.**
3. **Do not rename Kronos domain concepts** just to match Vela.
4. **Do not break existing Kronos routing and timetable flows.**
5. **Make changes in small, isolated modules.**
6. **Preserve Kronos UI identity unless a change clearly improves structure or polish.**
7. **Keep Expo SDK / RN versions aligned with Kronos unless a small safe update is required.**
8. **Do not add dead code or placeholder files that are not wired in.**
9. **Avoid large speculative refactors.**
10. **Each phase must leave Kronos in a runnable state.**

---

## What to copy conceptually from Vela

### 1) Security / app lock

Adapt Vela’s security model into Kronos:

* secure PIN storage
* biometric unlock support
* lock/unlock flow
* auth/security store separation
* security service abstraction

But adapt it to Kronos use cases:

* optional “Lock App” toggle in settings
* lock shown on app launch/resume when enabled
* no cycle-tracker references

Likely donor references:

* `src/services/security.service.ts`
* `src/hooks/useBiometric.ts`
* `src/stores/auth.store.ts`
* `app/(lock)/*`
* `app/(auth)/pin-setup.tsx`

### 2) Settings architecture

Use Vela’s cleaner settings organization to improve Kronos:

* move toward a dedicated settings service/store pattern
* support settings such as:

  * theme
  * reminders enabled
  * app lock enabled
  * biometric enabled
  * premium debug/dev controls only if gated to dev
* remove ad hoc settings logic where possible

Likely donor references:

* `src/services/settings.service.ts`
* `src/stores/settings.store.ts`
* `src/hooks/useSettings.ts`
* `app/(app)/settings.tsx`

### 3) Backup / export / import architecture

Kronos already has import/share flow. Rework it using Vela’s better structure:

* create a clean backup format for Kronos data
* include subjects, timetable data, homework, exams, and app settings where appropriate
* support export to file and import from file
* validate imported data before applying
* preserve user data integrity
* avoid destructive restore unless explicitly confirmed

Likely donor references:

* `src/services/velaDataService.ts`
* Vela export/import docs as architecture reference only:

  * `VELA_EXPORT_IMPORT_DESIGN.md`
  * `VELA_EXPORT_IMPORT_README.md`
  * `VELA_EXPORT_IMPORT_SUMMARY.md`
  * `VELA_EXPORT_IMPORT_USER_GUIDE.md`

### 4) Premium structure

Kronos currently has a mock premium flow. Replace its architecture with a cleaner service/hook split inspired by Vela:

* central premium constants
* premium state abstraction
* premium entitlement checks
* feature gating tied to Kronos features
* restore purchases flow
* no mock payment UI in production path

Important:

* Vela may still be test-store oriented. Do not blindly copy placeholders.
* If live store config is not available yet, keep the code structured for RevenueCat integration but clearly separate any temporary test behavior.
* Remove or isolate `MockPaymentSheet` from production flow.

Likely donor references:

* `src/services/premium.service.ts`
* `src/hooks/usePremium.ts`
* `src/constants/premium.ts`
* documentation:

  * `VELA_PREMIUM_SYSTEM.md`
  * `PREMIUM_MONETIZATION_AUDIT.md`
  * `REVENUECAT_TEST_STORE_CONFIG.md`

### 5) Notifications / reminders hardening

Keep Kronos reminder functionality, but harden it using lessons from Vela’s structure:

* ensure subject reminder IDs are stored
* cancel old reminders before re-scheduling
* avoid duplicate reminders on edit
* cancel reminders on delete if needed
* keep notification API centralized

Likely donor reference:

* `src/services/notification.service.ts`

### 6) App config cleanup

Bring Kronos `app.json` closer to Vela’s cleaner setup:

* remove unnecessary Android permissions if not required
* keep only justified permissions
* preserve needed notification and biometric permissions
* prepare for proper release config

Specifically review Kronos Android permissions:

* `READ_EXTERNAL_STORAGE`
* `WRITE_EXTERNAL_STORAGE`
* `SCHEDULE_EXACT_ALARM`

Only keep them if truly required by actual features and current Expo platform behavior.

Also fix release readiness items such as:

* placeholder EAS project ID
* missing release/build configuration if needed

---

## What NOT to copy

Do **not** copy these from Vela:

* cycle tracking logic
* mood logic
* symptom logic
* prediction algorithms
* daily log flows
* tracker-specific constants
* tracker-specific screens
* onboarding copy/content that is unrelated to Kronos
* cycle database schema
* tracker naming or domain language

Examples of donor files to avoid:

* `src/algorithm/prediction.ts`
* `src/constants/moods.ts`
* `src/constants/symptoms.ts`
* `src/constants/symptomIconMap.ts`
* `src/constants/tracker.ts`
* `src/services/cycle.service.ts`
* `src/services/log.service.ts`
* `src/hooks/useCycles.ts`
* `src/hooks/useDailyLog.ts`
* `src/hooks/useDailyLogs.ts`
* `src/hooks/useMoods.ts`
* `src/hooks/usePrediction.ts`
* `src/hooks/useSymptoms.ts`
* `src/hooks/useTracker.ts`
* `app/(app)/tracker.tsx`
* `app/(app)/log.tsx`
* `app/(app)/insights.tsx`

---

## Implementation order

Work in this exact order.

### Phase 1 — Safety and branch setup

* Create a dedicated refactor branch.
* Audit Kronos routing, stores, services, and current reminder/premium behavior.
* Do not change business logic yet.
* Produce a short mapping note of:

  * files to touch
  * files to leave alone
  * risks

### Phase 2 — Settings architecture

* Introduce or refactor toward:

  * `settings.service`
  * `settings.store`
  * `useSettings` hook if useful
* Wire `SettingsScreen` to the new architecture.
* Preserve existing settings behavior.
* Add placeholders for:

  * lock app
  * biometrics
  * reminder preferences
* Keep app runnable.

### Phase 3 — Security / lock flow

* Add optional app lock using PIN and biometric support.
* Add secure storage for PIN and lock state.
* Add lock screen route and launch/resume protection.
* Add settings toggles.
* Do not interfere with timetable CRUD flows.
* Keep this feature optional and disabled by default unless clearly intended otherwise.

### Phase 4 — Export / import hardening

* Refactor Kronos import/export using a clean data service approach.
* Create a validated Kronos backup schema.
* Include only relevant Kronos entities.
* Add safe restore logic.
* Preserve current sharing where useful.

### Phase 5 — Reminder reliability

* Fix reminder lifecycle in Kronos:

  * create
  * edit
  * delete
  * re-schedule
* Ensure no duplicate scheduled notifications remain after edits.
* Ensure IDs are tracked and cleaned up.

### Phase 6 — Premium architecture cleanup

* Replace the current mock-oriented premium structure with a cleaner service/hook/constants setup.
* Keep UI simple.
* Remove production dependence on `MockPaymentSheet`.
* Leave a clear integration seam for RevenueCat/live billing.
* Keep all Kronos premium gates working.

### Phase 7 — App config / release hygiene

* Clean `app.json`
* minimize permissions
* fix placeholder release config
* remove obvious dev leftovers from production path
* keep dev tools only if clearly isolated

### Phase 8 — Final cleanup and verification

* Remove dead imports and dead files
* Verify navigation
* Verify data persistence
* Verify reminders
* Verify lock flow
* Verify import/export
* Verify premium gates
* Summarize all changes clearly

---

## Expected deliverables

For each phase, provide:

1. concise summary
2. files changed
3. why the approach was chosen
4. any risks or follow-up items

At the end, provide:

* a final change summary
* a list of anything intentionally deferred
* a list of manual QA steps

---

## Manual QA checklist

The finished app must be tested for at least:

* app launch
* timetable load
* add subject
* edit subject
* delete subject
* add homework
* add exam
* premium screen open
* premium gate behavior
* settings save/reload
* enable lock app
* unlock with PIN
* unlock with biometrics where supported
* export data
* import data
* reminder scheduling
* reminder editing without duplicates
* cold restart persistence

---

## Current Kronos issues already known

Please treat these as active targets:

* premium flow is currently mock-based
* restore purchases is not properly implemented
* release config is incomplete
* notification scheduling likely duplicates on edit because old schedules are not clearly cleaned up
* Android permissions appear broader than necessary

---

## Success criteria

This task is successful only if:

* Kronos still feels like Kronos
* Vela improves structure without leaking unrelated tracker logic
* the app becomes closer to production-ready
* changes are modular, understandable, and reversible
* no giant unsafe rewrite is introduced
