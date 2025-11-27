'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { School, Building2, Home, Plus, ChevronDown, ChevronRight, Users, BookOpen, Layers } from 'lucide-react';
import { useState } from 'react';
import { useSidebar } from '@/contexts/SidebarContext';

export default function Sidebar() {
    const pathname = usePathname();
    const { schools, classGroups } = useSidebar();
    const [expandedSchools, setExpandedSchools] = useState<Set<string>>(new Set());
    const [expandedClassGroups, setExpandedClassGroups] = useState<Set<string>>(new Set());

    const toggleSchool = (schoolId: string) => {
        const newExpanded = new Set(expandedSchools);
        if (newExpanded.has(schoolId)) {
            newExpanded.delete(schoolId);
        } else {
            newExpanded.add(schoolId);
        }
        setExpandedSchools(newExpanded);
    };

    const toggleClassGroup = (groupId: string) => {
        const newExpanded = new Set(expandedClassGroups);
        if (newExpanded.has(groupId)) {
            newExpanded.delete(groupId);
        } else {
            newExpanded.add(groupId);
        }
        setExpandedClassGroups(newExpanded);
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
                    ABC School
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

                    {/* Users */}
                    <li>
                        <Link
                            href="/users"
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive('/users')
                                ? 'bg-indigo-600 text-white'
                                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                                }`}
                        >
                            <Users className="w-5 h-5" />
                            <span className="font-medium">Users</span>
                        </Link>
                    </li>

                    <li>
                        <Link
                            href="/subject-groups"
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive('/subject-groups')
                                ? 'bg-indigo-600 text-white'
                                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                                }`}
                        >
                            <Layers className="w-5 h-5" />
                            <span className="font-medium">Subject Groups</span>
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
                                                return (
                                                    <li key={campus.id}>
                                                        <Link
                                                            href={campusPath}
                                                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${isActive(campusPath)
                                                                    ? 'bg-indigo-600 text-white'
                                                                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                                                                } ml-5`}
                                                        >
                                                            <Building2 className="w-3 h-3" />
                                                            <span className="truncate">{campus.name}</span>
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

                    {/* Divider for Class Groups */}
                    {classGroups.length > 0 && (
                        <li className="pt-4 pb-2">
                            <div className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                Class Groups
                            </div>
                        </li>
                    )}

                    {/* Class Groups List */}
                    {classGroups.map((group) => {
                        const isExpanded = expandedClassGroups.has(group.id);
                        const groupPath = `/class-groups/${group.id}`;

                        return (
                            <li key={group.id}>
                                <div>
                                    <div className="flex items-center">
                                        <button
                                            onClick={() => toggleClassGroup(group.id)}
                                            className="flex items-center gap-2 px-4 py-2 text-gray-300 hover:text-white transition-colors"
                                        >
                                            {isExpanded ? (
                                                <ChevronDown className="w-4 h-4" />
                                            ) : (
                                                <ChevronRight className="w-4 h-4" />
                                            )}
                                        </button>
                                        <Link
                                            href={groupPath}
                                            className={`flex-1 flex items-center gap-2 px-2 py-2 rounded-lg transition-colors ${isActive(groupPath)
                                                ? 'bg-indigo-600 text-white'
                                                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                                                }`}
                                        >
                                            <Users className="w-4 h-4" />
                                            <span className="text-sm font-medium truncate">
                                                {group.name}
                                            </span>
                                        </Link>
                                    </div>

                                    {/* Subject Groups and Classes (when expanded) */}
                                    {isExpanded && group.subjectGroups && group.subjectGroups.length > 0 && (
                                        <ul className="ml-8 mt-1 space-y-1">
                                            {group.subjectGroups.map((sg) => {
                                                const sgPath = `/subject-groups/${sg.id}`;
                                                return (
                                                    <li key={sg.id}>
                                                        <div className="ml-5">
                                                            <Link
                                                                href={sgPath}
                                                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${isActive(sgPath)
                                                                        ? 'bg-indigo-600 text-white'
                                                                        : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                                                                    }`}
                                                            >
                                                                <Layers className="w-3 h-3" />
                                                                <span className="truncate">{sg.name}</span>
                                                            </Link>
                                                            {sg.classes && sg.classes.length > 0 && (
                                                                <ul className="ml-6 mt-1 space-y-1">
                                                                    {sg.classes.map((cls) => {
                                                                        const classPath = `/subject-groups/${sg.id}`;
                                                                        return (
                                                                            <li key={cls.id}>
                                                                                <Link
                                                                                    href={classPath}
                                                                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors ${isActive(classPath)
                                                                                            ? 'bg-indigo-600 text-white'
                                                                                            : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                                                                                        }`}
                                                                                >
                                                                                    <BookOpen className="w-3 h-3" />
                                                                                    <span className="truncate">{cls.name}</span>
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
