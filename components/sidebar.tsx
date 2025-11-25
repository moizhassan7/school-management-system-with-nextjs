'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { School, Building2, Home, Plus, ChevronDown, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';

interface ClassGroup {
    id: string;
    name: string;
}

interface Campus {
    id: string;
    name: string;
    classGroups: ClassGroup[];
}

interface SchoolWithCampuses {
    id: string;
    name: string;
    initials: string;
    campuses: Campus[];
}

export default function Sidebar() {
    const pathname = usePathname();
    const [schools, setSchools] = useState<SchoolWithCampuses[]>([]);
    const [expandedSchools, setExpandedSchools] = useState<Set<string>>(new Set());
    const [expandedCampuses, setExpandedCampuses] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSchools();
    }, []);

    const fetchSchools = async () => {
        try {
            const response = await fetch('/api/schools');
            if (response.ok) {
                const data = await response.json();
                setSchools(data);
            }
        } catch (error) {
            console.error('Error fetching schools:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleSchool = (schoolId: string) => {
        const newExpanded = new Set(expandedSchools);
        if (newExpanded.has(schoolId)) {
            newExpanded.delete(schoolId);
        } else {
            newExpanded.add(schoolId);
        }
        setExpandedSchools(newExpanded);
    };

    const toggleCampus = (campusId: string) => {
        const newExpanded = new Set(expandedCampuses);
        if (newExpanded.has(campusId)) {
            newExpanded.delete(campusId);
        } else {
            newExpanded.add(campusId);
        }
        setExpandedCampuses(newExpanded);
    };

    const isActive = (path: string) => {
        return pathname === path;
    };

    return (
        <div className="w-64 bg-gray-900 min-h-screen text-white flex flex-col">
            {/* Logo/Brand */}
            <div className="p-6 border-b border-gray-700">
                <h1 className="text-xl font-bold flex items-center gap-2">
                    <Building2 className="w-6 h-6" />
                    School Manager
                </h1>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 overflow-y-auto">
                <ul className="space-y-1">
                    {/* Home */}
                    <li>
                        <Link
                            href="/"
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive('/')
                                ? 'bg-indigo-600 text-white'
                                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                                }`}
                        >
                            <Home className="w-5 h-5" />
                            <span className="font-medium">Home</span>
                        </Link>
                    </li>

                    {/* Add New School */}
                    <li>
                        <Link
                            href="/schools/new"
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive('/schools/new')
                                ? 'bg-indigo-600 text-white'
                                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                                }`}
                        >
                            <Plus className="w-5 h-5" />
                            <span className="font-medium">Add School</span>
                        </Link>
                    </li>

                    {/* Divider */}
                    {schools.length > 0 && (
                        <li className="pt-4 pb-2">
                            <div className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                Schools
                            </div>
                        </li>
                    )}

                    {/* Schools List */}
                    {schools.map((school) => {
                        const isExpanded = expandedSchools.has(school.id);
                        const schoolCampusesPath = `/schools/${school.id}/campuses`;

                        return (
                            <li key={school.id}>
                                <div>
                                    {/* School Item */}
                                    <div className="flex items-center">
                                        <button
                                            onClick={() => toggleSchool(school.id)}
                                            className="flex items-center gap-2 px-4 py-2 text-gray-300 hover:text-white transition-colors"
                                        >
                                            {isExpanded ? (
                                                <ChevronDown className="w-4 h-4" />
                                            ) : (
                                                <ChevronRight className="w-4 h-4" />
                                            )}
                                        </button>
                                        <Link
                                            href={schoolCampusesPath}
                                            className={`flex-1 flex items-center gap-2 px-2 py-2 rounded-lg transition-colors ${isActive(schoolCampusesPath)
                                                ? 'bg-indigo-600 text-white'
                                                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                                                }`}
                                        >
                                            <School className="w-4 h-4" />
                                            <span className="text-sm font-medium truncate">
                                                {school.initials}
                                            </span>
                                        </Link>
                                    </div>

                                    {/* Campuses (when expanded) */}
                                    {isExpanded && school.campuses.length > 0 && (
                                        <ul className="ml-8 mt-1 space-y-1">
                                            {school.campuses.map((campus) => {
                                                const campusPath = `/schools/${school.id}/campuses/${campus.id}`;
                                                const isCampusExpanded = expandedCampuses.has(campus.id);
                                                return (
                                                    <li key={campus.id}>
                                                        <div>
                                                            {/* Campus Item */}
                                                            <div className="flex items-center">
                                                                {campus.classGroups.length > 0 && (
                                                                    <button
                                                                        onClick={() => toggleCampus(campus.id)}
                                                                        className="flex items-center gap-1 px-2 py-1 text-gray-400 hover:text-white transition-colors"
                                                                    >
                                                                        {isCampusExpanded ? (
                                                                            <ChevronDown className="w-3 h-3" />
                                                                        ) : (
                                                                            <ChevronRight className="w-3 h-3" />
                                                                        )}
                                                                    </button>
                                                                )}
                                                                <Link
                                                                    href={campusPath}
                                                                    className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${isActive(campusPath)
                                                                            ? 'bg-indigo-600 text-white'
                                                                            : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                                                                        } ${campus.classGroups.length === 0 ? 'ml-5' : ''}`}
                                                                >
                                                                    <Building2 className="w-3 h-3" />
                                                                    <span className="truncate">{campus.name}</span>
                                                                </Link>
                                                            </div>

                                                            {/* Class Groups (when campus is expanded) */}
                                                            {isCampusExpanded && campus.classGroups.length > 0 && (
                                                                <ul className="ml-8 mt-1 space-y-1">
                                                                    {campus.classGroups.map((classGroup) => {
                                                                        const classGroupPath = `/schools/${school.id}/campuses/${campus.id}/class-groups/${classGroup.id}`;
                                                                        return (
                                                                            <li key={classGroup.id}>
                                                                                <Link
                                                                                    href={classGroupPath}
                                                                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors ${isActive(classGroupPath)
                                                                                            ? 'bg-indigo-600 text-white'
                                                                                            : 'text-gray-500 hover:bg-gray-800 hover:text-white'
                                                                                        }`}
                                                                                >
                                                                                    <span className="truncate">{classGroup.name}</span>
                                                                                </Link>
                                                                            </li>
                                                                        );
                                                                    })}
                                                                </ul>
                                                            )}
                                                        </div>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    )}
                                </div>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-gray-700">
                <p className="text-xs text-gray-400 text-center">
                    School Management System
                </p>
            </div>
        </div>
    );
}
