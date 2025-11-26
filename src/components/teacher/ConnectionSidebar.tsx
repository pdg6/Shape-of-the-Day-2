import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, Users, ChevronRight, User } from 'lucide-react';
import { useClassStore } from '../../store/classStore';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { LiveStudent } from '../../types';

interface ConnectionSidebarProps {
    classCode: string; // The static code for the class (e.g., "7X99L")
    classId: string;   // The Firestore document ID for the class
}

const ConnectionSidebar: React.FC<ConnectionSidebarProps> = ({ classCode, classId }) => {
    const { isSidebarOpen, setSidebarOpen, activeStudentCount, setActiveStudentCount } = useClassStore();
    const [liveStudents, setLiveStudents] = useState<LiveStudent[]>([]);

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
        <div
            className={`
                fixed right-0 top-0 h-full bg-white dark:bg-brand-darkSurface shadow-2xl z-50 transition-all duration-300 ease-in-out border-l border-gray-200 dark:border-gray-700
                ${isSidebarOpen ? 'w-[350px]' : 'w-[60px]'}
            `}
        >
            {/* COLLAPSED STATE */}
            {!isSidebarOpen && (
                <div
                    className="h-full flex flex-col items-center py-6 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    onClick={() => setSidebarOpen(true)}
                >
                    {/* Top: QR Icon */}
                    <div className="p-2 bg-brand-accent/10 rounded-lg text-brand-accent mb-8">
                        <QrCode className="w-6 h-6" />
                    </div>

                    {/* Middle: Vertical Text */}
                    <div className="flex-1 flex items-center justify-center">
                        <span className="transform -rotate-90 text-lg font-bold tracking-widest text-brand-textDarkPrimary dark:text-brand-textPrimary whitespace-nowrap">
                            {classCode}
                        </span>
                    </div>

                    {/* Bottom: Student Count */}
                    <div className="mt-8 relative">
                        <Users className="w-6 h-6 text-gray-400" />
                        {activeStudentCount > 0 && (
                            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                                {activeStudentCount}
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* EXPANDED STATE */}
            {isSidebarOpen && (
                <div className="h-full flex flex-col">
                    {/* Header */}
                    <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-start justify-between bg-gray-50 dark:bg-gray-800/50">
                        <div>
                            <h2 className="text-xl font-bold text-brand-textDarkPrimary dark:text-brand-textPrimary mb-1">Join Class</h2>
                            <p className="text-sm text-brand-textDarkSecondary dark:text-brand-textSecondary">Scan to connect instantly</p>
                        </div>
                        <button
                            onClick={() => setSidebarOpen(false)}
                            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
                        >
                            <ChevronRight className="w-6 h-6 text-gray-500" />
                        </button>
                    </div>

                    {/* QR Code Section (Fixed at top) */}
                    <div className="p-6 flex flex-col items-center justify-center bg-white dark:bg-brand-darkSurface border-b border-gray-200 dark:border-gray-700">
                        <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 mb-3">
                            <QRCodeSVG
                                value={joinUrl}
                                size={160}
                                level={"H"}
                                includeMargin={true}
                            />
                        </div>
                        <div className="text-center w-full">
                            <p className="text-xs text-gray-500 mb-1 uppercase tracking-wider font-semibold">Class Code</p>
                            <div className="flex items-center justify-center gap-2 bg-gray-50 dark:bg-gray-800/50 py-2 px-4 rounded-lg border border-gray-100 dark:border-gray-700">
                                <span className="text-2xl font-mono font-bold text-brand-accent tracking-[0.2em]">{classCode}</span>
                            </div>
                        </div>
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(joinUrl);
                                // Could add a toast here
                            }}
                            className="mt-3 text-xs text-brand-accent hover:underline font-medium"
                        >
                            Copy Join Link
                        </button>
                    </div>

                    {/* Live Roster Section (Scrollable) */}
                    <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-brand-darkSurface/50">
                        <div className="p-4">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center justify-between sticky top-0 bg-gray-50 dark:bg-brand-darkSurface/50 py-2 z-10">
                                <span>Live Students</span>
                                <span className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full text-[10px]">
                                    {liveStudents.length}
                                </span>
                            </h3>

                            <div className="space-y-2">
                                {liveStudents.length === 0 ? (
                                    <div className="text-center py-8 text-gray-400 text-sm italic">
                                        Waiting for students to join...
                                    </div>
                                ) : (
                                    liveStudents.map((student) => (
                                        <div
                                            key={student.uid}
                                            className="flex items-center gap-3 p-3 bg-white dark:bg-brand-darkSurface rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm animate-in slide-in-from-bottom-2 duration-300 hover:shadow-md transition-shadow"
                                        >
                                            <div className="w-8 h-8 rounded-full bg-brand-accent/10 flex items-center justify-center text-brand-accent font-bold text-xs shrink-0">
                                                {student.displayName.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-brand-textDarkPrimary dark:text-brand-textPrimary truncate">
                                                    {student.displayName}
                                                </p>
                                                <p className="text-xs text-gray-500 truncate">
                                                    {student.currentStatus === 'todo' ? 'Just joined' : student.currentStatus}
                                                </p>
                                            </div>
                                            {/* Status Indicator Dot */}
                                            <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${student.currentStatus === 'stuck' ? 'bg-red-500 animate-pulse ring-2 ring-red-200 dark:ring-red-900' :
                                                    student.currentStatus === 'question' ? 'bg-amber-500 animate-pulse ring-2 ring-amber-200 dark:ring-amber-900' :
                                                        student.currentStatus === 'done' ? 'bg-blue-500' :
                                                            'bg-emerald-500'
                                                }`} />
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ConnectionSidebar;
