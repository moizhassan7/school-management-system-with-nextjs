"use client"

import { useEffect, useState } from 'react'
import { Plus, Layers, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

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
  
  // Select state
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('')
  const [selectedCampusId, setSelectedCampusId] = useState<string>('')

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
      setSelectedSchoolId('')
      setSelectedCampusId('')
      load()
    }
  }

  // Derived state for dropdown options
  const selectedSchool = schools.find(s => s.id === selectedSchoolId)
  const availableCampuses = selectedSchool?.campuses || []
  const selectedCampus = availableCampuses.find(c => c.id === selectedCampusId)
  const availableClassGroups = selectedCampus?.classGroups || []

  return (
    <div className="container mx-auto py-10 px-4 sm:px-6 lg:px-8 space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Subject Groups</h1>
          <p className="text-muted-foreground mt-1">Manage academic streams and subject collections.</p>
        </div>
        <Button onClick={() => setIsAdding(!isAdding)}>
          <Plus className="mr-2 h-4 w-4" /> Add Subject Group
        </Button>
      </div>

      {isAdding && (
        <Card className="border-indigo-100 shadow-md">
          <CardHeader>
            <CardTitle>Create New Subject Group</CardTitle>
            <CardDescription>Enter the details below to create a new subject group.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input 
                    id="name" 
                    placeholder="e.g. Pre-Medical" 
                    value={form.name} 
                    onChange={(e) => setForm({ ...form, name: e.target.value })} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input 
                    id="description" 
                    placeholder="Optional description" 
                    value={form.description} 
                    onChange={(e) => setForm({ ...form, description: e.target.value })} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>School</Label>
                  <Select 
                    value={selectedSchoolId} 
                    onValueChange={(val) => {
                      setSelectedSchoolId(val)
                      setSelectedCampusId('')
                      setForm({ ...form, classGroupId: '' })
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select school" />
                    </SelectTrigger>
                    <SelectContent>
                      {schools.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.initials} • {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Campus</Label>
                  <Select 
                    value={selectedCampusId} 
                    disabled={!selectedSchoolId}
                    onValueChange={(val) => {
                      setSelectedCampusId(val)
                      setForm({ ...form, classGroupId: '' })
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select campus" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCampuses.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Class Group</Label>
                  <Select 
                    value={form.classGroupId} 
                    disabled={!selectedCampusId}
                    onValueChange={(val) => setForm({ ...form, classGroupId: val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select class group" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableClassGroups.map((cg) => (
                        <SelectItem key={cg.id} value={cg.id}>{cg.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsAdding(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting || !form.name.trim() || !form.classGroupId}>
                  {submitting ? 'Creating...' : 'Create Group'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Subject Groups</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : groups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center border-dashed border rounded-lg">
              <div className="rounded-full bg-muted/50 p-4 mb-4">
                <Layers className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">No subject groups found.</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Class Group</TableHead>
                    <TableHead>Campus</TableHead>
                    <TableHead>School</TableHead>
                    <TableHead className="text-right">Subjects</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groups.map((g) => (
                    <TableRow key={g.id}>
                      <TableCell className="font-medium">{g.name}</TableCell>
                      <TableCell className="text-muted-foreground">{g.description || '-'}</TableCell>
                      <TableCell>{g.classGroup?.name}</TableCell>
                      <TableCell>{g.classGroup?.campus?.name}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                          {g.classGroup?.campus?.school ? g.classGroup.campus.school.initials : ''}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">{g.subjects.length}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}