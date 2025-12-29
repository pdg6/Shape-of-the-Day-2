import { create } from 'zustand';
import { Classroom } from '../types';

const CURRENT_CLASS_KEY = 'currentClassId';

export interface BackgroundSettings {
    bgColor: string;
    particleColor: string;
    particlesEnabled: boolean;
    particleEffect: 'none' | 'grid' | 'magnetic' | 'orbit' | 'swarm_small' | 'swarm_large' | 'gravity';
    particleOpacity: number;
    primaryTheme: string;       // 'bone' | 'mist' | 'silver' | 'iron' | 'ink'
    secondaryTheme: string;     // 'stone' | 'ash' | 'pewter' | 'lead' | 'graphite'
    tileTheme: string;          // 'onyx' | 'slate' | 'graphite' | 'cloud' | 'glacier'
    elevationLevel: 'whisper' | 'gentle' | 'float' | 'lift' | 'dramatic';
    borderStyle: 'auto' | 'accent' | 'ghost' | 'glass' | 'vibrant';
    horizonEtching: boolean;
    glowEffect: boolean;
}

interface ClassState {
    currentClassId: string | null;
    classrooms: Classroom[];
    isSidebarOpen: boolean;
    activeStudentCount: number;
    isClassModalOpen: boolean;
    editingClass: Classroom | null;

    // Theme Preference
    backgroundSettings: BackgroundSettings;

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
    setIsClassModalOpen: (isOpen: boolean, editingClass?: Classroom | null) => void;
    setBackgroundSettings: (settings: Partial<BackgroundSettings>) => void;

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
    isClassModalOpen: false,
    editingClass: null,
    backgroundSettings: (() => {
        const defaultSettings: BackgroundSettings = {
            bgColor: '#050505',
            particleColor: 'multi',
            particlesEnabled: true,
            particleEffect: 'orbit' as const,
            particleOpacity: 0.25,
            primaryTheme: 'white',    // Position 1 (Lightest)
            secondaryTheme: 'slate', // Position 1 (Lightest)
            tileTheme: 'onyx',       // Position 1 (Darkest)
            elevationLevel: 'gentle', // Default: mild floating
            borderStyle: 'auto',
            horizonEtching: true,
            glowEffect: true
        };

        if (typeof window === 'undefined') return defaultSettings;

        const saved = localStorage.getItem('backgroundSettings');
        if (saved) {
            try {
                return { ...defaultSettings, ...JSON.parse(saved) };
            } catch (e) {
                return defaultSettings;
            }
        }

        // Migration from old backgroundTheme
        const oldTheme = localStorage.getItem('backgroundTheme');
        if (oldTheme === '2a') return { ...defaultSettings, bgColor: '#050505', particleColor: '#111111' };
        if (oldTheme === '3a') return { ...defaultSettings, bgColor: '#0f1115', particleColor: '#3b82f6', particleEffect: 'grid' as const };

        // Migration of old hex values to new IDs if needed, otherwise defaults work
        const migratedSettings = { ...defaultSettings };
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                // Map old hexes to new IDs if present
                if (parsed.textColor === '#3b82f6') migratedSettings.primaryTheme = 'accent';
                else if (parsed.textColor === '#262626') migratedSettings.primaryTheme = 'onyx';
                else if (parsed.textColor === '#94a3b8') migratedSettings.primaryTheme = 'muted';
                else if (parsed.textColor === '#F2EFEA' || parsed.textColor === '#F8FAFC') migratedSettings.primaryTheme = 'white';

                if (parsed.textBaseColor === '#050505') migratedSettings.secondaryTheme = 'onyx';
                else if (parsed.textBaseColor === '#334155') migratedSettings.secondaryTheme = 'slate';
                else if (parsed.textBaseColor === '#64748b') migratedSettings.secondaryTheme = 'muted';
                else if (parsed.textBaseColor === '#94a3b8' || parsed.textBaseColor === '#A8A29D') migratedSettings.secondaryTheme = 'slate';

                return { ...migratedSettings, ...parsed, primaryTheme: migratedSettings.primaryTheme, secondaryTheme: migratedSettings.secondaryTheme };
            } catch (e) { return defaultSettings; }
        }

        return defaultSettings;
    })(),

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
    setIsClassModalOpen: (isOpen, editingClass = null) => set({ isClassModalOpen: isOpen, editingClass }),
    setBackgroundSettings: (settings) => set((state) => {
        const newSettings = { ...state.backgroundSettings, ...settings };
        if (typeof window !== 'undefined') {
            localStorage.setItem('backgroundSettings', JSON.stringify(newSettings));
        }
        return { backgroundSettings: newSettings };
    }),

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
