'use client'

import { useState, useEffect, use } from 'react'
import UserForm from '@/components/user-form'

interface UserData {
  id: string
  name: string
  email: string
  city?: string | null
  religion?: string | null
  emailVerified: boolean
  profilePath?: string | null
  schoolId: string
  gender: 'MALE'|'FEMALE'|'OTHER'|'UNSPECIFIED'
  phone?: string | null
  address?: string | null
  suspended: boolean
  locked: boolean
}

export default function EditUserPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params)
  const [user, setUser] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/users/${userId}`)
        if (!res.ok) throw new Error('User not found')
        const json = await res.json()
        setUser(json)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [userId])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-xl mx-auto text-center">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-xl mx-auto text-center">
          <p className="text-red-600">{error || 'User not found'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900">Edit User</h1>
          <p className="mt-2 text-sm text-gray-600">Update the user details below.</p>
        </div>
        <UserForm userId={userId} initialData={user} />
      </div>
    </div>
  )
}
