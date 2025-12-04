'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface Class {
    id: string;
    name: string;
    classGroupId?: string;
    sections?: { id: string; name: string }[];
}

export interface ClassGroup {
    id: string;
    name: string;
    classes: Class[];
    subjectGroups: {
        id: string;
        name: string;
    }[];
    campusId: string;
    campus?: {
        name: string;
        school?: {
            name: string;
        }
    }
}

export interface Campus {
    id: string;
    name: string;
    classGroups: ClassGroup[];
}

export interface SchoolWithCampuses {
    id: string;
    name: string;
    initials: string;
    campuses: Campus[];
}

interface SidebarContextType {
    schools: SchoolWithCampuses[];
    classGroups: ClassGroup[];
    refreshData: () => Promise<void>;
    isLoading: boolean;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
    const [schools, setSchools] = useState<SchoolWithCampuses[]>([]);
    const [classGroups, setClassGroups] = useState<ClassGroup[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchSchools = async () => {
        try {
            const response = await fetch('/api/schools');
            if (response.ok) {
                const data = await response.json();
                setSchools(data);
            }
        } catch (error) {
            console.error('Error fetching schools:', error);
        }
    };

    const fetchClassGroups = async () => {
         try {
            // We will create this endpoint
            const response = await fetch('/api/class-groups');
            if (response.ok) {
                const data = await response.json();
                setClassGroups(data);
            }
        } catch (error) {
            console.error('Error fetching class groups:', error);
        }
    };

    const refreshData = useCallback(async () => {
        setIsLoading(true);
        await Promise.all([fetchSchools(), fetchClassGroups()]);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        refreshData();
    }, [refreshData]);

    return (
        <SidebarContext.Provider value={{ schools, classGroups, refreshData, isLoading }}>
            {children}
        </SidebarContext.Provider>
    );
}

export function useSidebar() {
    const context = useContext(SidebarContext);
    if (context === undefined) {
        throw new Error('useSidebar must be used within a SidebarProvider');
    }
    return context;
}
