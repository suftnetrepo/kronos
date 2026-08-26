import { Redirect } from 'expo-router'

// Obsolete entry point — legacy homework created here would never appear in
// Today/Tasks/Calendar/Subject Detail/Exam Detail (see the product audit).
// Redirect to the New Task flow with type=homework, which is the unified,
// fully-wired path for creating homework.
export default function AddHomeworkRedirect() {
  return <Redirect href={{ pathname: '/new-task', params: { type: 'homework' } } as any} />
}
