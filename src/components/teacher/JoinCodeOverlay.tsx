import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X } from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { LiveStudent } from '../../types';

interface JoinCodeOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    classCode: string;
    classId: string;
}

const JoinCodeOverlay: React.FC<JoinCodeOverlayProps> = ({ isOpen, onClose, classCode, classId }) => {
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
        });

        return () => unsubscribe();
    }, [classId]);

    // The URL that students will visit to join
    const joinUrl = `${window.location.origin}/join/${classCode}`;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className="w-full max-w-2xl bg-brand-lightSurface dark:bg-brand-darkSurface rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden transform transition-all animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
                    <h2 className="text-xl font-bold text-brand-textDarkPrimary dark:text-brand-textPrimary">
                        Join Class
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="flex flex-col md:flex-row gap-6">
                        {/* Left: QR Code and Join Info */}
                        <div className="flex-1 flex flex-col items-center space-y-4">
                            {/* Join URL */}
                            <div className="w-full flex flex-col items-center justify-center px-4 py-3 rounded-xl border-[3px] border-green-500/20 bg-green-500/5">
                                <span className="text-xs text-green-600 dark:text-green-400 uppercase tracking-wider font-semibold mb-1">Join at</span>
                                <span className="text-xl font-mono text-brand-textDarkPrimary dark:text-brand-textPrimary">
                                    shape-of-the-day.com
                                </span>
                            </div>

                            {/* Class Code */}
                            <div className="w-full flex flex-col items-center justify-center px-4 py-3 rounded-xl border-[3px] border-green-500/20 bg-green-500/5">
                                <span className="text-xs text-green-600 dark:text-green-400 uppercase tracking-wider font-semibold mb-1">Class Code</span>
                                <span className="text-2xl font-mono font-bold text-brand-textDarkPrimary dark:text-brand-textPrimary tracking-[0.15em]">
                                    {classCode}
                                </span>
                            </div>

                            {/* QR Code */}
                            <div className="w-56 h-56 bg-white p-4 rounded-xl border-[3px] border-gray-200 dark:border-gray-700 shadow-sm">
                                <QRCodeSVG
                                    value={joinUrl}
                                    style={{ width: '100%', height: '100%' }}
                                    level={"H"}
                                    includeMargin={false}
                                />
                            </div>
                        </div>

                        {/* Right: Live Students */}
                        <div className="flex-1 flex flex-col min-h-[300px]">
                            <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center justify-between">
                                <span>Live Students</span>
                                <span className="bg-green-500/10 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full text-xs font-bold">
                                    {liveStudents.length}
                                </span>
                            </h3>

                            <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar">
                                {liveStudents.length === 0 ? (
                                    <div className="text-center py-12 text-gray-400 text-sm italic">
                                        Waiting for students...
                                    </div>
                                ) : (
                                    liveStudents.map((student) => (
                                        <div
                                            key={student.uid}
                                            className="flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 border-[3px] border-gray-200 dark:border-gray-800 hover:border-green-500/30 bg-white dark:bg-gray-800/50 hover:shadow-md group cursor-default"
                                        >
                                            <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center text-green-600 dark:text-green-400 font-bold text-xs shrink-0 group-hover:bg-green-500/20 transition-colors">
                                                {student.displayName.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-brand-textDarkPrimary dark:text-brand-textPrimary truncate">
                                                    {student.displayName}
                                                </p>
                                                <p className="text-xs text-gray-500 truncate">
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
                </div>
            </div>
        </div>
    );
};

export default JoinCodeOverlay;
