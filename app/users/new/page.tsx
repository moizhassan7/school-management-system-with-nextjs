import UserForm from '@/components/user-form';

export default function NewUserPage() {
  return (
    <div className="w-full max-w-[1100px] mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900">Add New User</h1>
        <p className="mt-2 text-sm text-gray-600">
          Create account, assign campuses, and set module permissions.
        </p>
      </div>
      <UserForm />
    </div>
  );
}
