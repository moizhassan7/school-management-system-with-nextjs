"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface User {
  id: string
  name: string
  email: string
  phone?: string | null
  suspended: boolean
  locked: boolean
  school?: { id: string; initials: string; name: string } | null
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const res = await fetch('/api/users')
    if (res.ok) {
      const json = await res.json()
      setUsers(json)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this user?')) return
    const res = await fetch(`/api/users/${id}`, { method: 'DELETE' })
    if (res.ok) load()
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Users</h1>
        <Link href="/users/new">
          <Button>Create User</Button>
        </Link>
      </div>
      {loading ? (
        <div>Loading...</div>
      ) : users.length === 0 ? (
        <div className="text-gray-500">No users</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border">
            <thead>
              <tr className="bg-gray-50">
                <th className="p-2 text-left border">Name</th>
                <th className="p-2 text-left border">Email</th>
                <th className="p-2 text-left border">Phone</th>
                <th className="p-2 text-left border">School</th>
                <th className="p-2 text-left border">Status</th>
                <th className="p-2 text-left border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t">
                  <td className="p-2 border">{u.name}</td>
                  <td className="p-2 border">{u.email}</td>
                  <td className="p-2 border">{u.phone ?? ''}</td>
                  <td className="p-2 border">{u.school ? `${u.school.initials}` : ''}</td>
                  <td className="p-2 border">
                    {u.suspended ? 'Suspended' : 'Active'}{u.locked ? ' • Locked' : ''}
                  </td>
                  <td className="p-2 border space-x-2">
                    <Link href={`/users/${u.id}/edit`} className="text-indigo-600">Edit</Link>
                    <button onClick={() => handleDelete(u.id)} className="text-red-600">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
