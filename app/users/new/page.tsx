import UserForm from '@/components/user-form'

export default function NewUserPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900">Add New User</h1>
          <p className="mt-2 text-sm text-gray-600">Enter the details of the user you want to add.</p>
        </div>
        <UserForm />
      </div>
    </div>
  )
}
