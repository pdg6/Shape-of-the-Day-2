import React, { useState, useEffect } from 'react';
import { Classroom } from '../../types';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { Copy, Edit2, BarChart2, Check, Calendar, ListTodo, Presentation } from 'lucide-react';
import { toDateString } from '../../utils/dateHelpers';

interface ClassCardProps {
    classroom: Classroom;
    onEdit: (cls: Classroom) => void;
    onSelect: (id: string) => void;
    onViewHistory: (id: string) => void;
    onViewStudents?: (id: string) => void;
    onViewTasks?: (id: string) => void;
    onManageTasks?: (id: string) => void;
    onViewShape?: (id: string) => void;
    onViewCalendar?: (id: string) => void;
    onViewData?: (id: string) => void;
    isSelected?: boolean;
}

export const ClassCard: React.FC<ClassCardProps> = ({ classroom, onEdit, onSelect, onViewStudents, onViewTasks, onManageTasks, onViewShape, onViewCalendar, onViewData, isSelected }) => {
    const [activeStudentCount, setActiveStudentCount] = useState<number | null>(null);
    const [savedTaskCount, setSavedTaskCount] = useState<number>(0);
    const [isHovered, setIsHovered] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const fetchActiveCount = async () => {
            try {
                const coll = collection(db, `classrooms/${classroom.id}/live_students`);
                const snapshot = await getDocs(coll);

                // Filter students active within last 90 minutes
                const now = Date.now();
                const INACTIVITY_LIMIT_MS = 90 * 60 * 1000; // 90 minutes

                let activeCount = 0;
                snapshot.forEach((doc) => {
                    const data = doc.data();
                    if (!data.lastSeen) {
                        // If no lastSeen, count them (new student)
                        activeCount++;
                        return;
                    }

                    let lastSeenTime = 0;
                    if (typeof data.lastSeen.toDate === 'function') {
                        lastSeenTime = data.lastSeen.toDate().getTime();
                    } else if (data.lastSeen instanceof Date) {
                        lastSeenTime = data.lastSeen.getTime();
                    } else {
                        lastSeenTime = new Date(data.lastSeen).getTime();
                    }

                    if ((now - lastSeenTime) <= INACTIVITY_LIMIT_MS) {
                        activeCount++;
                    }
                });

                setActiveStudentCount(activeCount);
            } catch (error) {
                console.error("Error fetching active student count:", error);
                setActiveStudentCount(0);
            }
        };
        fetchActiveCount();
    }, [classroom.id]);

    // Fetch saved task count for today
    useEffect(() => {
        const fetchSavedTaskCount = async () => {
            try {
                const today = toDateString();
                const q = query(
                    collection(db, 'tasks'),
                    where('selectedRoomIds', 'array-contains', classroom.id),
                    where('teacherId', '==', auth.currentUser?.uid)
                );
                const snapshot = await getDocs(q);

                // Filter for today's saved (non-draft) tasks
                let count = 0;
                snapshot.forEach(doc => {
                    const data = doc.data();
                    const inRange = today >= (data.startDate || '') && today <= (data.endDate || today);
                    const isSaved = data.status !== 'draft';
                    if (inRange && isSaved) count++;
                });

                setSavedTaskCount(count);
            } catch (error) {
                console.error("Error fetching saved task count:", error);
                setSavedTaskCount(0);
            }
        };
        fetchSavedTaskCount();
    }, [classroom.id]);

    const handleCopyCode = (e: React.MouseEvent) => {
        if (!isSelected) return;
        e.stopPropagation();
        navigator.clipboard.writeText(classroom.joinCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const isActive = activeStudentCount !== null && activeStudentCount > 0;
    const cardColor = classroom.color || '#3B82F6'; // Default blue

    return (
        <div
            className="group relative flex flex-col h-full bg-brand-lightSurface dark:bg-[#1a1d24] rounded-2xl border border-slate-200 dark:border-white/5 shadow-layered lift-hover transition-all duration-300 cursor-pointer overflow-hidden"
            style={{
                borderColor: isHovered ? cardColor : undefined
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={() => onSelect(classroom.id)}
        >
            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Header / Banner */}
                <div className="h-20 p-6 relative flex justify-between items-start border-b border-gray-100 dark:border-gray-800">
                    <div className="z-10 w-full min-w-0">
                        <h3 className={`text-xl font-bold leading-tight mb-1 truncate pr-2 ${isSelected ? 'text-brand-accent' : 'text-brand-textDarkPrimary dark:text-brand-textPrimary'}`}>
                            {classroom.name}
                        </h3>
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-2">
                            <span className="opacity-75 truncate">{classroom.subject}</span>
                            <span className="w-1 h-1 flex-none rounded-full bg-gray-300 dark:bg-gray-600" />
                            <span className="opacity-75">{classroom.gradeLevel}</span>
                        </p>
                    </div>
                    <button
                        onClick={(e) => {
                            if (!isSelected) return;
                            e.stopPropagation();
                            onEdit(classroom);
                        }}
                        className={`flex items-center justify-center p-2 rounded-xl text-sm font-bold text-gray-400 transition-all duration-300 transition-float hover:-translate-y-0.5 shadow-layered-sm border border-transparent ${isSelected ? 'hover:text-brand-accent hover:bg-brand-accent/10 hover:border-brand-accent/20' : ''}`}
                        title="Edit Class"
                    >
                        <Edit2 size={16} />
                    </button>
                </div>

                {/* Body Content */}
                <div className="flex-1 p-6 flex flex-col justify-center gap-4">
                    {/* Stats Row */}
                    <div className="flex items-start gap-4">
                        <button
                            onClick={(e) => {
                                if (!isSelected) return;
                                e.stopPropagation();
                                if (onViewStudents) onViewStudents(classroom.id);
                            }}
                            className={`flex-1 text-left group/stats -m-2 p-2 rounded-xl transition-all duration-300 transition-float hover:-translate-y-0.5 border border-transparent focus:outline-none focus:ring-2 focus:ring-brand-accent/20 ${isSelected ? 'hover:bg-gray-50 dark:hover:bg-white/5 hover:border-slate-200 dark:hover:border-white/5 shadow-layered-sm' : ''}`}
                        >
                            <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 transition-colors ${isSelected ? 'text-brand-accent' : 'text-gray-400'}`}>Students</p>
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-2xl font-bold text-brand-textDarkPrimary dark:text-brand-textPrimary">
                                    {activeStudentCount ?? '-'}
                                </span>
                                {isActive ? (
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse" title="Online" />
                                ) : (
                                    <span className="w-2 h-2 rounded-full bg-gray-300 dark:bg-white/10" title="Offline" />
                                )}
                            </div>
                        </button>

                        <div className="w-px bg-gray-200 dark:bg-gray-700 self-stretch" />

                        <button
                            onClick={(e) => {
                                if (!isSelected) return;
                                e.stopPropagation();
                                if (onViewTasks) onViewTasks(classroom.id);
                            }}
                            className={`flex-1 text-left group/stats -m-2 p-2 rounded-xl transition-all duration-300 transition-float hover:-translate-y-0.5 border border-transparent focus:outline-none focus:ring-2 focus:ring-brand-accent/20 ${isSelected ? 'hover:bg-gray-50 dark:hover:bg-white/5 hover:border-slate-200 dark:hover:border-white/5 shadow-layered-sm' : ''}`}
                        >
                            <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 transition-colors ${isSelected ? 'text-brand-accent' : 'text-gray-400'}`}>Tasks</p>
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-2xl font-bold text-brand-textDarkPrimary dark:text-brand-textPrimary">
                                    {savedTaskCount}
                                </span>
                            </div>
                        </button>
                    </div>

                    {/* Join Code - Simplified */}
                    <button
                        onClick={handleCopyCode}
                        className={`w-full group/code relative flex items-center justify-between p-2.5 bg-gray-50 dark:bg-white/5 rounded-xl border border-dashed border-gray-300 dark:border-white/10 transition-all duration-300 transition-float hover:-translate-y-0.5 ${isSelected ? 'hover:border-brand-accent hover:bg-brand-accent/5 shadow-layered-sm' : ''}`}
                        title="Click to copy join code"
                    >
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Code</span>
                        <div className="flex items-center gap-2">
                            <span className={`font-mono font-bold text-lg tracking-widest text-brand-textDarkPrimary dark:text-brand-textPrimary transition-colors ${isSelected ? 'group-hover/code:text-brand-accent' : ''}`}>
                                {classroom.joinCode}
                            </span>
                            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className={`w-3.5 h-3.5 text-gray-400 ${isSelected ? 'group-hover/code:text-brand-accent' : ''}`} />}
                        </div>
                    </button>
                </div>
            </div>

            {/* Actions Footer (Bottom Row) */}
            <div className="flex flex-row h-14 bg-gray-50/50 dark:bg-[#151921]/50 border-t border-slate-200 dark:border-white/5">
                {[
                    { id: 'tasks', icon: ListTodo, label: 'Tasks', fn: onManageTasks },
                    { id: 'shape', icon: Presentation, label: 'Shape', fn: onViewShape },
                    { id: 'calendar', icon: Calendar, label: 'Cal', fn: onViewCalendar },
                    { id: 'analytics', icon: BarChart2, label: 'Data', fn: onViewData }
                ].map((action, idx) => (
                    <button
                        key={action.id}
                        onClick={(e) => {
                            if (!isSelected) return;
                            e.stopPropagation();
                            if (action.fn) action.fn(classroom.id);
                        }}
                        className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-all duration-300 focus:outline-none relative group/btn
                                ${isSelected
                                ? 'text-slate-500 hover:text-brand-accent hover:bg-white dark:hover:bg-[#1a1d24] shadow-inner-sm'
                                : 'opacity-30 cursor-default'
                            } ${idx > 0 ? 'border-l border-slate-200 dark:border-white/5' : ''}`}
                        title={action.label}
                    >
                        <div className={`p-2 rounded-full transition-all duration-300 group-hover/btn:bg-brand-accent/10 group-hover/btn:shadow-layered-sm group-hover/btn:-translate-y-0.5`}>
                            <action.icon className="w-5 h-5 transition-transform duration-300 group-hover/btn:scale-110" />
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-tighter">{action.label}</span>
                        {isSelected && (
                            <div className="absolute inset-x-0 bottom-0 h-0.5 bg-brand-accent scale-x-0 group-hover/btn:scale-x-100 transition-transform duration-300" />
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
};
