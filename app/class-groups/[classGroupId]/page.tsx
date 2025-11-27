'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Plus, Search, Layers } from 'lucide-react';
import { useSidebar } from '@/contexts/SidebarContext';

interface SubjectGroup {
    id: string;
    name: string;
}

export default function ClassGroupPage() {
    const params = useParams();
    const classGroupId = params.classGroupId as string;
    const { refreshData } = useSidebar();
    const [subjectGroups, setSubjectGroups] = useState<SubjectGroup[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');

    useEffect(() => {
        if (classGroupId) {
            fetchSubjectGroups();
        }
    }, [classGroupId]);

    const fetchSubjectGroups = async () => {
        try {
            const response = await fetch(`/api/class-groups/${classGroupId}/subject-groups`);
            if (response.ok) {
                const data = await response.json();
                setSubjectGroups(data);
            }
        } catch (error) {
            console.error('Error fetching subject groups:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddSubjectGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const response = await fetch(`/api/subject-groups`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name: newGroupName, classGroupId }),
            });

            if (response.ok) {
                setNewGroupName('');
                setIsAdding(false);
                fetchSubjectGroups();
                refreshData(); // Refresh sidebar
            }
        } catch (error) {
            console.error('Error adding subject group:', error);
        }
    };

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Subject Groups</h1>
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Add Subject Group
                </button>
            </div>

            {isAdding && (
                <div className="mb-6 p-4 bg-white rounded-lg shadow border border-gray-200">
                    <form onSubmit={handleAddSubjectGroup} className="flex gap-4">
                        <input
                            type="text"
                            value={newGroupName}
                            onChange={(e) => setNewGroupName(e.target.value)}
                            placeholder="Enter subject group name"
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            autoFocus
                        />
                        <button
                            type="submit"
                            disabled={!newGroupName.trim()}
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
            ) : subjectGroups.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <Layers className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900">No subject groups found</h3>
                    <p className="text-gray-500 mt-1">Get started by adding a new subject group.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {subjectGroups.map((sg) => (
                        <div
                            key={sg.id}
                            className="p-4 bg-white rounded-lg shadow border border-gray-200 hover:border-indigo-500 transition-colors cursor-pointer"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-100 rounded-lg">
                                    <Layers className="w-5 h-5 text-indigo-600" />
                                </div>
                                <a href={`/subject-groups/${sg.id}`} className="font-medium text-gray-900 hover:text-indigo-700">{sg.name}</a>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
