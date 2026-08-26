# Kronos V2 integration stage

This stage deliberately prioritises connected behaviour over visual polish.

## Connected data paths

- Subject create/edit/delete invalidates the shared app data version, updating Today, Timetable, Calendar and subject pickers.
- Existing legacy Homework rows are copied once into the V2 Task domain by migration 007.
- New Homework created through Quick Add is a Task with `type=homework`.
- Tasks can be linked to a Subject and/or Exam and are visible from Tasks, Today, Subject Detail, Exam Detail and Calendar.
- Exam study tasks update Exam Detail progress after returning from Task Detail.
- Task create/edit/complete/reopen/delete schedules, reschedules or cancels its Expo notification.
- Subject and Exam reminders retain their existing lifecycle.
- Startup reminder recovery now covers Subjects, Tasks and Exams.

## Manual acceptance path

1. Create a subject with recurring days and reminder.
2. Confirm it appears on Today, Day/Week Timetable and Calendar.
3. Edit its days/time and confirm all views update.
4. Quick Add a Homework task linked to the subject, set a custom date/time and reminder.
5. Confirm it appears in Tasks, Today when relevant, Subject Detail and Calendar.
6. Open Task Detail, edit it, complete it, reopen it, then delete it.
7. Add an Exam linked to the subject and confirm Today/Calendar/Subject Detail.
8. From Exam Detail add a Study task; complete it and confirm study progress updates.
9. Restart the app and verify data and future reminders remain intact.
