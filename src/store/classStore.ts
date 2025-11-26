import { create } from 'zustand';

interface ClassState {
    currentClassId: string | null;
    isSidebarOpen: boolean;
    activeStudentCount: number;

    // Actions
    setCurrentClassId: (id: string | null) => void;
    toggleSidebar: () => void;
    setSidebarOpen: (isOpen: boolean) => void;
    setActiveStudentCount: (count: number) => void;
}

export const useClassStore = create<ClassState>((set) => ({
    currentClassId: null,
    isSidebarOpen: false, // Default closed to show QR icon
    activeStudentCount: 0,

    setCurrentClassId: (id) => set({ currentClassId: id }),
    toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
    setSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),
    setActiveStudentCount: (count) => set({ activeStudentCount: count }),
}));
