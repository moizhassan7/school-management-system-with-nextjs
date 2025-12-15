'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// 1. Define Types matching the Deep Hierarchy
export interface ClassItem {
    id: string;
    name: string;
}

export interface ClassGroup {
    id: string;
    name: string;
    classes: ClassItem[]; // Now included in the School tree
    campusId?: string;
}

export interface Campus {
    id: string;
    name: string;
    classGroups: ClassGroup[];
}

export interface SchoolWithHierarchy {
    id: string;
    name: string;
    initials: string;
    campuses: Campus[];
}

interface SidebarContextType {
    schools: SchoolWithHierarchy[];
    refreshData: () => Promise<void>;
    isLoading: boolean;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
    const [schools, setSchools] = useState<SchoolWithHierarchy[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const refreshData = useCallback(async () => {
        setIsLoading(true);
        try {
            // Because we updated the API, this single call gets the whole tree
            const response = await fetch('/api/schools');
            if (response.ok) {
                const data = await response.json();
                setSchools(data);
            }
        } catch (error) {
            console.error('Error fetching school hierarchy:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        refreshData();
    }, [refreshData]);

    return (
        <SidebarContext.Provider value={{ schools, refreshData, isLoading }}>
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