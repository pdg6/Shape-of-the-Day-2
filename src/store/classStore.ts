import { create } from 'zustand';
import { Classroom } from '../types';

interface ClassState {
    currentClassId: string | null;
    classrooms: Classroom[];
    isSidebarOpen: boolean;
    activeStudentCount: number;
    darkMode: boolean;
    isClassModalOpen: boolean;
    editingClass: Classroom | null;

    // Actions
    setCurrentClassId: (id: string | null) => void;
    setClassrooms: (classrooms: Classroom[]) => void;
    toggleSidebar: () => void;
    setSidebarOpen: (isOpen: boolean) => void;
    setActiveStudentCount: (count: number) => void;
    toggleDarkMode: () => void;
    setIsClassModalOpen: (isOpen: boolean, editingClass?: Classroom | null) => void;
}

export const useClassStore = create<ClassState>((set) => ({
    currentClassId: null,
    classrooms: [],
    isSidebarOpen: false, // Default closed to show QR icon
    activeStudentCount: 0,
    darkMode: typeof window !== 'undefined' ? localStorage.getItem('darkMode') !== 'false' : true,

    isClassModalOpen: false,
    editingClass: null,

    setCurrentClassId: (id) => set({ currentClassId: id }),
    setClassrooms: (classrooms) => set({ classrooms }),
    toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
    setSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),
    setActiveStudentCount: (count) => set({ activeStudentCount: count }),
    toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
    setIsClassModalOpen: (isOpen, editingClass = null) => set({ isClassModalOpen: isOpen, editingClass }),
}));
