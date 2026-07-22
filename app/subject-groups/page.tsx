import { redirect } from 'next/navigation';

/** Subject Groups live under Configuration now. */
export default function SubjectGroupsPage() {
  redirect('/configuration?tab=subject-groups');
}
