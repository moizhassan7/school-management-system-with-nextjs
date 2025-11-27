"use client"

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface SubjectGroup {
  id: string
  name: string
  description?: string | null
  classGroup: {
    id: string
    name: string
    campus: { id: string; name: string; school?: { id: string; initials: string; name: string } | null }
  }
  subjects: { id: string; name: string }[]
}

interface SchoolOption {
  id: string
  initials: string
  name: string
  campuses: {
    id: string
    name: string
    classGroups: { id: string; name: string }[]
  }[]
}

export default function SubjectGroupsPage() {
  const [groups, setGroups] = useState<SubjectGroup[]>([])
  const [schools, setSchools] = useState<SchoolOption[]>([])
  const [loading, setLoading] = useState(true)

  const [isAdding, setIsAdding] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', classGroupId: '' })
  const [submitting, setSubmitting] = useState(false)
  const [selectedSchoolId, setSelectedSchoolId] = useState('')
  const [selectedCampusId, setSelectedCampusId] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const [grRes, schRes] = await Promise.all([
        fetch('/api/subject-groups'),
        fetch('/api/schools'),
      ])
      const groupsJson = grRes.ok ? await grRes.json() : []
      const schoolsJson = schRes.ok ? await schRes.json() : []
      setGroups(groupsJson)
      setSchools(schoolsJson as SchoolOption[])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    const res = await fetch('/api/subject-groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        description: form.description,
        classGroupId: form.classGroupId,
      }),
    })
    setSubmitting(false)
    if (res.ok) {
      setIsAdding(false)
      setForm({ name: '', description: '', classGroupId: '' })
      load()
    }
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Subject Groups</h1>
        <Button onClick={() => setIsAdding(!isAdding)}>Add Subject Group</Button>
      </div>

      {isAdding && (
      <div className="mb-6 p-4 bg-white rounded-lg shadow border border-gray-200">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Input id="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="schoolId">School</Label>
            <select
              id="schoolId"
              className="mt-1 block w-full rounded-md border-gray-300 p-2 border"
              value={selectedSchoolId}
              onChange={(e) => {
                setSelectedSchoolId(e.target.value)
                setSelectedCampusId('')
                setForm({ ...form, classGroupId: '' })
              }}
            >
              <option value="">Select school</option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>{s.initials} • {s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="campusId">Campus</Label>
            <select
              id="campusId"
              className="mt-1 block w-full rounded-md border-gray-300 p-2 border"
              value={selectedCampusId}
              onChange={(e) => {
                setSelectedCampusId(e.target.value)
                setForm({ ...form, classGroupId: '' })
              }}
              disabled={!selectedSchoolId}
            >
              <option value="">Select campus</option>
              {(schools.find((s) => s.id === selectedSchoolId)?.campuses ?? []).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="classGroupId">Class Group</Label>
            <select
              id="classGroupId"
              className="mt-1 block w-full rounded-md border-gray-300 p-2 border"
              value={form.classGroupId}
              onChange={(e) => setForm({ ...form, classGroupId: e.target.value })}
              disabled={!selectedCampusId}
            >
              <option value="">Select class group</option>
              {(schools.find((s) => s.id === selectedSchoolId)?.campuses.find((c) => c.id === selectedCampusId)?.classGroups ?? []).map((cg) => (
                <option key={cg.id} value={cg.id}>{cg.name}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3">
            <Button type="submit" disabled={submitting || !form.name.trim() || !form.classGroupId}>Create</Button>
            <Button type="button" variant="outline" onClick={() => setIsAdding(false)}>Cancel</Button>
          </div>
        </form>
      </div>
      )}

      {loading ? (
        <div>Loading...</div>
      ) : groups.length === 0 ? (
        <div className="text-gray-500">No subject groups</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border">
            <thead>
              <tr className="bg-gray-50">
                <th className="p-2 text-left border">Name</th>
                <th className="p-2 text-left border">Description</th>
                <th className="p-2 text-left border">Class Group</th>
                <th className="p-2 text-left border">Campus</th>
                <th className="p-2 text-left border">School</th>
                <th className="p-2 text-left border">Subjects</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <tr key={g.id} className="border-t">
                  <td className="p-2 border">{g.name}</td>
                  <td className="p-2 border">{g.description ?? ''}</td>
                  <td className="p-2 border">{g.classGroup?.name}</td>
                  <td className="p-2 border">{g.classGroup?.campus?.name}</td>
                  <td className="p-2 border">{g.classGroup?.campus?.school ? g.classGroup?.campus?.school.initials : ''}</td>
                  <td className="p-2 border">{g.subjects.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
