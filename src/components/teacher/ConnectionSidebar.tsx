import React, { useEffect, useState, useRef, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ChevronRight } from 'lucide-react';
import { useClassStore } from '../../store/classStore';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { LiveStudent } from '../../types';

interface ConnectionSidebarProps {
    classCode: string; // The static code for the class (e.g., "7X99L")
    classId: string;   // The Firestore document ID for the class
}

const ConnectionSidebar: React.FC<ConnectionSidebarProps> = ({ classCode, classId }) => {
    const { isSidebarOpen, setSidebarOpen, setActiveStudentCount } = useClassStore();
    const [liveStudents, setLiveStudents] = useState<LiveStudent[]>([]);
    const closeButtonRef = useRef<HTMLButtonElement>(null);
    const previousFocusRef = useRef<HTMLElement | null>(null);

    // Focus management: focus close button when sidebar opens, restore focus when closed
    useEffect(() => {
        if (isSidebarOpen) {
            // Store the previously focused element
            previousFocusRef.current = document.activeElement as HTMLElement;
            // Focus the close button after animation
            const timer = setTimeout(() => {
                closeButtonRef.current?.focus();
            }, 300);
            return () => clearTimeout(timer);
        } else if (previousFocusRef.current) {
            // Restore focus when sidebar closes
            previousFocusRef.current.focus();
            previousFocusRef.current = null;
        }
    }, [isSidebarOpen]);

    // Handle Escape key to close sidebar
    const handleKeyDown = useCallback((event: KeyboardEvent) => {
        if (event.key === 'Escape' && isSidebarOpen) {
            setSidebarOpen(false);
        }
    }, [isSidebarOpen, setSidebarOpen]);

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    // Listen for real-time updates to the roster
    useEffect(() => {
        if (!classId) return;

        // Reference to the sub-collection: classrooms/{classId}/live_students
        const studentsRef = collection(db, 'classrooms', classId, 'live_students');

        // Subscribe to changes
        const unsubscribe = onSnapshot(studentsRef, (snapshot) => {
            const students: LiveStudent[] = [];
            snapshot.forEach((doc) => {
                students.push(doc.data() as LiveStudent);
            });

            setLiveStudents(students);
            setActiveStudentCount(students.length);
        });

        return () => unsubscribe();
    }, [classId, setActiveStudentCount]);

    // The URL that students will visit to join
    const joinUrl = `${window.location.origin}/join/${classCode}`;

    return (
        <aside
            role="complementary"
            aria-label="Class connection panel"
            aria-hidden={!isSidebarOpen}
            className={`
                fixed right-0 top-[64px] h-[calc(100dvh-64px)] w-80 bg-brand-lightSurface dark:bg-brand-darkSurface shadow-2xl transition-transform duration-300 ease-in-out z-sidebar
                ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full pointer-events-none'}
            `}
        >
            <div className="h-full flex flex-col">
                {/* Content Area */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* QR Code Section */}
                    <div className="p-4 flex flex-col items-center justify-center space-y-3 bg-gray-50/50 dark:bg-gray-900/20">

                        {/* Join URL */}
                        <div className="w-full flex flex-col items-center justify-center px-3 py-3 rounded-lg border-2 border-brand-accent/20 bg-brand-accent/5">
                            <span className="text-fluid-xs text-brand-accent uppercase tracking-wider font-semibold mb-1">Join at</span>
                            <span className="text-xl font-mono text-brand-textDarkPrimary dark:text-brand-textPrimary">
                                shape-of-the-day.com
                            </span>
                        </div>

                        {/* Class Code */}
                        <div className="w-full flex flex-col items-center justify-center px-3 py-3 rounded-lg border-2 border-brand-accent/20 bg-brand-accent/5">
                            <span className="text-fluid-xs text-brand-accent uppercase tracking-wider font-semibold mb-1">Class Code</span>
                            <span className="text-xl font-mono font-bold text-brand-textDarkPrimary dark:text-brand-textPrimary tracking-[0.15em]">
                                {classCode}
                            </span>
                        </div>

                        <div className="w-48 aspect-square bg-white p-3 rounded-lg border-2 border-gray-200 dark:border-gray-700 shadow-sm mt-2">
                            <QRCodeSVG
                                value={joinUrl}
                                style={{ width: '100%', height: '100%' }}
                                level={"H"}
                                includeMargin={false}
                            />
                        </div>
                    </div>

                    {/* Live Roster Section */}
                    <div className="flex-1 overflow-y-auto bg-brand-lightSurface dark:bg-brand-darkSurface">
                        <div className="p-4 space-y-2">
                            <h3 className="text-fluid-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center justify-between sticky top-0 bg-brand-lightSurface dark:bg-brand-darkSurface py-2 z-10">
                                <span>Live Students</span>
                                <span className="bg-brand-accent/10 text-brand-accent px-2 py-0.5 rounded-full text-fluid-xs font-bold">
                                    {liveStudents.length}
                                </span>
                            </h3>

                            {liveStudents.length === 0 ? (
                                <div className="text-center py-8 text-gray-400 text-fluid-sm italic">
                                    Waiting for students...
                                </div>
                            ) : (
                                liveStudents.map((student) => (
                                    <div
                                        key={student.uid}
                                        className="w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 border-2 border-gray-200 dark:border-gray-800 hover:border-brand-accent/30 bg-white dark:bg-gray-800/50 hover:shadow-md group cursor-default focus:outline-none focus:ring-2 focus:ring-brand-accent"
                                        tabIndex={0}
                                        role="listitem"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-brand-accent/10 flex items-center justify-center text-brand-accent font-bold text-fluid-xs shrink-0 group-hover:bg-brand-accent/20 transition-colors">
                                            {student.displayName.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-fluid-sm font-medium text-brand-textDarkPrimary dark:text-brand-textPrimary truncate">
                                                {student.displayName}
                                            </p>
                                            <p className="text-fluid-xs text-gray-500 truncate">
                                                {student.currentStatus === 'todo' ? 'Just joined' : student.currentStatus}
                                            </p>
                                        </div>
                                        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${student.currentStatus === 'stuck' ? 'bg-red-500 animate-pulse ring-2 ring-red-100 dark:ring-red-900/30' :
                                            student.currentStatus === 'question' ? 'bg-amber-500 animate-pulse ring-2 ring-amber-100 dark:ring-amber-900/30' :
                                                student.currentStatus === 'done' ? 'bg-blue-500' :
                                                    'bg-emerald-500'
                                            }`} />
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer with Close Button */}
                <div className="p-4 bg-brand-lightSurface dark:bg-brand-darkSurface">
                    <button
                        ref={closeButtonRef}
                        onClick={() => setSidebarOpen(false)}
                        className="w-full flex items-center justify-center gap-2 p-3 text-gray-500 hover:text-brand-accent hover:bg-brand-accent/10 rounded-xl transition-all font-medium"
                        title="Close Sidebar"
                        aria-label="Close connection panel"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </aside>
    );
};

export default ConnectionSidebar;
