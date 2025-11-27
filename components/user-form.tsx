'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { z, ZodIssue } from 'zod'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6).optional(),
  city: z.string().optional(),
  religion: z.string().optional(),
  emailVerified: z.boolean().optional(),
  profilePath: z.string().optional(),
  schoolId: z.string().min(1),
  gender: z.enum(['MALE','FEMALE','OTHER','UNSPECIFIED']),
  phone: z.string().optional(),
  address: z.string().optional(),
  suspended: z.boolean().optional(),
  locked: z.boolean().optional(),
})

interface SchoolOption {
  id: string
  name: string
  initials: string
}

interface UserFormProps {
  userId?: string
  initialData?: {
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
}

export default function UserForm({ userId, initialData }: UserFormProps) {
  const router = useRouter()
  const [schools, setSchools] = useState<SchoolOption[]>([])
  const [errors, setErrors] = useState<Record<string,string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const loadSchools = async () => {
      const res = await fetch('/api/schools')
      if (res.ok) {
        const json = (await res.json()) as Array<{ id: string; name: string; initials: string }>
        const opts: SchoolOption[] = json.map((s) => ({ id: s.id, name: s.name, initials: s.initials }))
        setSchools(opts)
      }
    }
    loadSchools()
  }, [])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setErrors({})

    const form = new FormData(e.currentTarget)
    const payload = {
      name: String(form.get('name') || ''),
      email: String(form.get('email') || ''),
      password: form.get('password') ? String(form.get('password')) : undefined,
      city: String(form.get('city') || ''),
      religion: String(form.get('religion') || ''),
      emailVerified: form.get('emailVerified') === 'on',
      profilePath: String(form.get('profilePath') || ''),
      schoolId: String(form.get('schoolId') || ''),
      gender: String(form.get('gender') || 'UNSPECIFIED') as 'MALE'|'FEMALE'|'OTHER'|'UNSPECIFIED',
      phone: String(form.get('phone') || ''),
      address: String(form.get('address') || ''),
      suspended: form.get('suspended') === 'on',
      locked: form.get('locked') === 'on',
    }

    try {
      const validated = schema.parse(payload)
      const url = userId ? `/api/users/${userId}` : '/api/users'
      const method = userId ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validated),
      })
      if (!res.ok) {
        const json = await res.json()
        if (json.errors) {
          const issues = json.errors as ZodIssue[]
          const fieldErrors: Record<string,string> = {}
          issues.forEach((issue) => {
            const k = Array.isArray(issue.path) ? String(issue.path[0]) : String(issue.path)
            fieldErrors[k] = issue.message
          })
          setErrors(fieldErrors)
          return
        }
        throw new Error(json.error || 'Failed to save user')
      }
      router.push('/users')
      router.refresh()
    } catch (err) {
      if (err instanceof z.ZodError) {
        const fieldErrors: Record<string,string> = {}
        err.issues.forEach((i) => {
          if (i.path && i.path.length) fieldErrors[String(i.path[0])] = i.message
        })
        setErrors(fieldErrors)
      } else {
        alert(err instanceof Error ? err.message : 'Error')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <div>
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" defaultValue={initialData?.name} />
        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" defaultValue={initialData?.email} />
        {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" />
        {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="city">City</Label>
          <Input id="city" name="city" defaultValue={initialData?.city ?? ''} />
        </div>
        <div>
          <Label htmlFor="religion">Religion</Label>
          <Input id="religion" name="religion" defaultValue={initialData?.religion ?? ''} />
        </div>
      </div>
      <div>
        <Label htmlFor="profilePath">Profile Path</Label>
        <Input id="profilePath" name="profilePath" defaultValue={initialData?.profilePath ?? ''} />
      </div>
      <div>
        <Label htmlFor="schoolId">School</Label>
        <select id="schoolId" name="schoolId" defaultValue={initialData?.schoolId} className="mt-1 block w-full rounded-md border-gray-300 p-2 border">
          <option value="">Select school</option>
          {schools.map((s) => (
            <option key={s.id} value={s.id}>{s.initials} — {s.name}</option>
          ))}
        </select>
        {errors.schoolId && <p className="text-red-500 text-xs mt-1">{errors.schoolId}</p>}
      </div>
      <div>
        <Label htmlFor="gender">Gender</Label>
        <select id="gender" name="gender" defaultValue={initialData?.gender ?? 'UNSPECIFIED'} className="mt-1 block w-full rounded-md border-gray-300 p-2 border">
          <option value="UNSPECIFIED">Unspecified</option>
          <option value="MALE">Male</option>
          <option value="FEMALE">Female</option>
          <option value="OTHER">Other</option>
        </select>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" defaultValue={initialData?.phone ?? ''} />
        </div>
        <div>
          <Label htmlFor="address">Address</Label>
          <Input id="address" name="address" defaultValue={initialData?.address ?? ''} />
        </div>
      </div>
      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="emailVerified" defaultChecked={initialData?.emailVerified ?? false} />
          <span>Email Verified</span>
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="suspended" defaultChecked={initialData?.suspended ?? false} />
          <span>Suspended</span>
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="locked" defaultChecked={initialData?.locked ?? false} />
          <span>Locked</span>
        </label>
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting} className="flex-1">
          {isSubmitting ? 'Saving...' : userId ? 'Update User' : 'Create User'}
        </Button>
        <Button type="button" variant="outline" className="flex-1" onClick={() => router.push('/users')}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
