'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Plus, BookOpen } from 'lucide-react';

interface ClassItem {
  id: string;
  name: string;
  subjectGroupId: string;
}

export default function SubjectGroupDetailPage() {
  const params = useParams();
  const subjectGroupId = params.subjectGroupId as string;
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newClassName, setNewClassName] = useState('');

  useEffect(() => {
    if (subjectGroupId) fetchClasses();
  }, [subjectGroupId]);

  const fetchClasses = async () => {
    try {
      const res = await fetch(`/api/subject-groups/${subjectGroupId}/classes`);
      if (res.ok) {
        const json = await res.json();
        setClasses(json);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`/api/subject-groups/${subjectGroupId}/classes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newClassName }),
    });
    if (res.ok) {
      setNewClassName('');
      setIsAdding(false);
      fetchClasses();
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Classes</h1>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Class
        </button>
      </div>

      {isAdding && (
        <div className="mb-6 p-4 bg-white rounded-lg shadow border border-gray-200">
          <form onSubmit={handleAddClass} className="flex gap-4">
            <input
              type="text"
              value={newClassName}
              onChange={(e) => setNewClassName(e.target.value)}
              placeholder="Enter class name"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              autoFocus
            />
            <button
              type="submit"
              disabled={!newClassName.trim()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 text-gray-600 hover:text-gray-900"
            >
              Cancel
            </button>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12">Loading...</div>
      ) : classes.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No classes found</h3>
          <p className="text-gray-500 mt-1">Get started by adding a new class.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map((cls) => (
            <div
              key={cls.id}
              className="p-4 bg-white rounded-lg shadow border border-gray-200 hover:border-indigo-500 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <BookOpen className="w-5 h-5 text-indigo-600" />
                </div>
                <span className="font-medium text-gray-900">{cls.name}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
