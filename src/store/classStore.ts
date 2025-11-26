import { create } from 'zustand';

interface ClassState {
    currentClassId: string | null;
    isSidebarOpen: boolean;
    activeStudentCount: number;
    darkMode: boolean;

    // Actions
    setCurrentClassId: (id: string | null) => void;
    toggleSidebar: () => void;
    setSidebarOpen: (isOpen: boolean) => void;
    setActiveStudentCount: (count: number) => void;
    toggleDarkMode: () => void;
}

export const useClassStore = create<ClassState>((set) => ({
    currentClassId: null,
    isSidebarOpen: false, // Default closed to show QR icon
    activeStudentCount: 0,
    darkMode: typeof window !== 'undefined' ? localStorage.getItem('darkMode') !== 'false' : true,

    setCurrentClassId: (id) => set({ currentClassId: id }),
    toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
    setSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),
    setActiveStudentCount: (count) => set({ activeStudentCount: count }),
    toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
}));
