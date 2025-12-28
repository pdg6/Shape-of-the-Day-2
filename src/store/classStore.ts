import { create } from 'zustand';
import { Classroom } from '../types';

const CURRENT_CLASS_KEY = 'currentClassId';

interface ClassState {
    currentClassId: string | null;
    classrooms: Classroom[];
    isSidebarOpen: boolean;
    activeStudentCount: number;
    darkMode: boolean;
    isClassModalOpen: boolean;
    editingClass: Classroom | null;

    // Theme Preference
    backgroundTheme: '4c' | '2a' | '3a';

    // App View State
    view: 'landing' | 'teacher' | 'student';
    studentName: string;
    studentClassId: string;
    studentClassroomColor: string | undefined;

    // Actions
    setCurrentClassId: (id: string | null) => void;
    setClassrooms: (classrooms: Classroom[]) => void;
    toggleSidebar: () => void;
    setSidebarOpen: (isOpen: boolean) => void;
    setActiveStudentCount: (count: number) => void;
    toggleDarkMode: () => void;
    setDarkMode: (isDark: boolean) => void;
    setIsClassModalOpen: (isOpen: boolean, editingClass?: Classroom | null) => void;
    setBackgroundTheme: (theme: '4c' | '2a' | '3a') => void;

    // View Actions
    setView: (view: 'landing' | 'teacher' | 'student') => void;
    setStudentName: (name: string) => void;
    setStudentClassId: (id: string) => void;
    setStudentClassroomColor: (color: string | undefined) => void;
    resetAppState: () => void;
}

export const useClassStore = create<ClassState>((set) => ({
    currentClassId: typeof window !== 'undefined' ? localStorage.getItem(CURRENT_CLASS_KEY) : null,
    classrooms: [],
    isSidebarOpen: false,
    activeStudentCount: 0,
    darkMode: typeof window !== 'undefined' ? localStorage.getItem('darkMode') !== 'false' : true,
    isClassModalOpen: false,
    editingClass: null,
    backgroundTheme: typeof window !== 'undefined' ? (localStorage.getItem('backgroundTheme') as '4c' | '2a' | '3a') || '4c' : '4c',

    // Initial View State
    view: 'landing',
    studentName: typeof window !== 'undefined' ? sessionStorage.getItem('studentName') || '' : '',
    studentClassId: typeof window !== 'undefined' ? sessionStorage.getItem('studentClassId') || '' : '',
    studentClassroomColor: typeof window !== 'undefined' ? sessionStorage.getItem('studentClassroomColor') || undefined : undefined,

    setCurrentClassId: (id) => {
        if (typeof window !== 'undefined') {
            if (id) localStorage.setItem(CURRENT_CLASS_KEY, id);
            else localStorage.removeItem(CURRENT_CLASS_KEY);
        }
        set({ currentClassId: id });
    },
    setClassrooms: (classrooms) => set({ classrooms }),
    toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
    setSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),
    setActiveStudentCount: (count) => set({ activeStudentCount: count }),
    toggleDarkMode: () => set((state) => {
        const nextDark = !state.darkMode;
        if (typeof window !== 'undefined') localStorage.setItem('darkMode', String(nextDark));
        return { darkMode: nextDark };
    }),
    setDarkMode: (isDark: boolean) => {
        if (typeof window !== 'undefined') localStorage.setItem('darkMode', String(isDark));
        set({ darkMode: isDark });
    },
    setIsClassModalOpen: (isOpen, editingClass = null) => set({ isClassModalOpen: isOpen, editingClass }),
    setBackgroundTheme: (theme) => {
        if (typeof window !== 'undefined') localStorage.setItem('backgroundTheme', theme);
        set({ backgroundTheme: theme });
    },

    // View State Actions
    setView: (view) => set({ view }),
    setStudentName: (studentName) => {
        if (typeof window !== 'undefined') {
            if (studentName) sessionStorage.setItem('studentName', studentName);
            else sessionStorage.removeItem('studentName');
        }
        set({ studentName });
    },
    setStudentClassId: (studentClassId) => {
        if (typeof window !== 'undefined') {
            if (studentClassId) sessionStorage.setItem('studentClassId', studentClassId);
            else sessionStorage.removeItem('studentClassId');
        }
        set({ studentClassId });
    },
    setStudentClassroomColor: (studentClassroomColor) => {
        if (typeof window !== 'undefined') {
            if (studentClassroomColor) sessionStorage.setItem('studentClassroomColor', studentClassroomColor);
            else sessionStorage.removeItem('studentClassroomColor');
        }
        set({ studentClassroomColor });
    },
    resetAppState: () => {
        if (typeof window !== 'undefined') {
            sessionStorage.removeItem('studentName');
            sessionStorage.removeItem('studentClassId');
            sessionStorage.removeItem('studentClassroomColor');
            localStorage.removeItem(CURRENT_CLASS_KEY);
        }
        set({
            view: 'landing',
            studentName: '',
            studentClassId: '',
            studentClassroomColor: undefined,
            currentClassId: null,
            classrooms: []
        });
    }
}));
