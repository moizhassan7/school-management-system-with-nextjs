'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Plus, ArrowLeft, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface ClassItem { id: string; name: string }

export default function ClassGroupClassesPage() {
  const params = useParams();
  const classGroupId = params.classGroupId as string;

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newClassName, setNewClassName] = useState('');

  const load = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/class-groups/${classGroupId}/classes`);
      const data = res.ok ? await res.json() : [];
      setClasses(data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { if (classGroupId) load(); }, [classGroupId]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;
    const res = await fetch(`/api/class-groups/${classGroupId}/classes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newClassName })
    });
    if (res.ok) {
      setNewClassName('');
      setIsAdding(false);
      load();
    }
  };

  return (
    <div className="container max-w-6xl mx-auto py-10 px-4 space-y-8">
      <div className="flex items-center gap-2">
        <Link href={`/class-groups/${classGroupId}`}>
          <Button variant="ghost"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <h1 className="text-2xl font-bold">Manage Classes</h1>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-muted-foreground">Create and manage classes in this class group.</p>
        <Button onClick={() => setIsAdding(!isAdding)}>
          <Plus className="mr-2 h-4 w-4" /> {isAdding ? 'Cancel' : 'Add Class'}
        </Button>
      </div>

      {isAdding && (
        <Card className="border-indigo-100 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Create New Class</CardTitle>
            <CardDescription>Enter a name like "Grade 9" or "Grade 9-A".</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdd} className="flex gap-3">
              <div className="flex-1">
                <Label htmlFor="name" className="sr-only">Name</Label>
                <Input id="name" value={newClassName} onChange={e => setNewClassName(e.target.value)} placeholder="e.g. Grade 9-A" autoFocus />
              </div>
              <Button type="submit" disabled={!newClassName.trim()}>Save</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading classes...</div>
      ) : classes.length === 0 ? (
        <Card className="border-dashed py-12 flex flex-col items-center justify-center text-center">
          <div className="bg-muted/50 p-4 rounded-full mb-3">
            <BookOpen className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">No classes found</h3>
          <p className="text-muted-foreground max-w-sm mb-4">Add a class to start creating sections and enrolling students.</p>
          <Button variant="outline" onClick={() => setIsAdding(true)}>Create First Class</Button>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {classes.map(cls => (
            <Link key={cls.id} href={`/classes/${cls.id}`}>
              <Card className="hover:shadow-md transition-all cursor-pointer hover:border-indigo-300">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Class</CardTitle>
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{cls.name}</div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

