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
    onShowJoinCode?: (id: string) => void;
    isSelected?: boolean;
}

export const ClassCard: React.FC<ClassCardProps> = ({ classroom, onEdit, onSelect, onViewStudents, onViewTasks, onManageTasks, onViewShape, onViewCalendar, onViewData, onShowJoinCode, isSelected }) => {
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
            className={`group relative flex flex-col h-full rounded-2xl cursor-pointer overflow-hidden levitated-tile ${isSelected ? 'active' : ''}`}
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
                <div className="h-20 p-6 relative flex justify-between items-start">
                    <div className="z-10 w-full min-w-0">
                        <h3 className={`text-xl font-bold leading-tight mb-1 truncate pr-2 ${isSelected ? 'text-white' : 'text-brand-textPrimary'}`}>
                            {classroom.name}
                        </h3>
                        <p className={`text-xs font-medium flex items-center gap-2 ${isSelected ? 'text-brand-textPrimary/80' : 'text-brand-textSecondary'}`}>
                            <span className="opacity-75 truncate">{classroom.subject}</span>
                            <span className={`w-1 h-1 flex-none rounded-full ${isSelected ? 'bg-white/40' : 'bg-[var(--color-border-strong)]'}`} />
                            <span className="opacity-75">{classroom.gradeLevel}</span>
                        </p>
                    </div>
                    <button
                        onClick={(e) => {
                            if (!isSelected) return;
                            e.stopPropagation();
                            onEdit(classroom);
                        }}
                        className={`flex items-center justify-center p-2 rounded-xl text-sm font-bold text-brand-textSecondary transition-float button-lift-dynamic shadow-layered-sm border border-transparent ${isSelected ? 'hover:text-brand-accent hover:bg-brand-accent/10 hover:border-brand-accent/20 hover:shadow-layered-lg' : ''}`}
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
                            className={`flex-1 text-left -m-2 p-2 rounded-xl transition-float button-lift-dynamic border border-transparent
            ${isSelected ? 'hover:bg-[var(--color-bg-tile-hover)] hover:border-[var(--color-border-subtle)] shadow-layered-sm hover:shadow-layered-lg' : ''}`}
                        >
                            <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 transition-colors ${isSelected ? 'text-brand-textPrimary/80' : 'text-brand-textSecondary'}`}>Students</p>
                            <div className="flex items-baseline gap-1.5">
                                <span className={`text-2xl font-bold ${isSelected ? 'text-brand-textPrimary' : 'text-brand-textPrimary'}`}>
                                    {activeStudentCount ?? '-'}
                                </span>
                                {isActive ? (
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse" title="Online" />
                                ) : (
                                    <span className="w-2 h-2 rounded-full bg-[var(--color-border-strong)]" title="Offline" />
                                )}
                            </div>
                        </button>


                        <button
                            onClick={(e) => {
                                if (!isSelected) return;
                                e.stopPropagation();
                                if (onViewTasks) onViewTasks(classroom.id);
                            }}
                            className={`flex-1 text-left group/stats -m-2 p-2 rounded-xl transition-float button-lift-dynamic border border-transparent focus:outline-none focus:ring-2 focus:ring-brand-accent/20 ${isSelected ? 'hover:bg-[var(--color-bg-tile-hover)] hover:border-[var(--color-border-subtle)] shadow-layered-sm' : ''}`}
                        >
                            <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 transition-colors ${isSelected ? 'text-brand-textPrimary/80' : 'text-brand-textSecondary'}`}>Tasks</p>
                            <div className="flex items-baseline gap-1.5">
                                <span className={`text-2xl font-bold ${isSelected ? 'text-brand-textPrimary' : 'text-brand-textPrimary'}`}>
                                    {savedTaskCount}
                                </span>
                            </div>
                        </button>
                    </div>

                    {/* Join Code - Click to show modal, copy icon to copy */}
                    <div
                        onClick={(e) => {
                            if (!isSelected) return;
                            e.stopPropagation();
                            if (onShowJoinCode) onShowJoinCode(classroom.id);
                        }}
                        className={`w-full group/code relative flex items-center justify-between p-2.5
                    rounded-xl transition-float border cursor-pointer
                    bg-[var(--color-bg-tile)] shadow-layered
                    hover:shadow-layered-lg button-lift-dynamic
                    ${isSelected
                                ? 'text-brand-textSecondary hover:text-brand-textPrimary hover:bg-[var(--color-bg-tile-hover)] border-[var(--color-border-subtle)] hover:border-brand-accent/50'
                                : 'border-[var(--color-border-subtle)] cursor-default'}`}
                        title="Click to show join code"
                    >
                        <span className="text-[10px] font-bold text-brand-textSecondary uppercase tracking-widest">Code</span>
                        <div className="flex items-center gap-2">
                            <span className={`font-mono font-bold text-lg tracking-widest transition-colors ${isSelected ? 'text-brand-textPrimary group-hover/code:text-brand-accent' : 'text-brand-textPrimary'}`}>
                                {classroom.joinCode}
                            </span>
                            <button
                                onClick={handleCopyCode}
                                className={`p-1 rounded-md transition-colors ${isSelected ? 'hover:bg-white/20' : 'hover:bg-[var(--color-bg-tile-hover)]'}`}
                                title="Copy join code"
                            >
                                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className={`w-3.5 h-3.5 transition-colors ${isSelected ? 'text-brand-textPrimary group-hover/code:text-brand-accent' : 'text-brand-textSecondary'}`} />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Action Footer - Elevated floating buttons */}
            <div className={`p-3 transition-opacity duration-300 ${isSelected ? 'opacity-100' : 'opacity-40 group-hover:opacity-70'}`}>
                <div className="flex gap-2">
                    {[
                        { id: 'tasks', icon: ListTodo, label: 'Tasks', fn: onManageTasks },
                        { id: 'shape', icon: Presentation, label: 'Shape', fn: onViewShape },
                        { id: 'calendar', icon: Calendar, label: 'Cal', fn: onViewCalendar },
                        { id: 'analytics', icon: BarChart2, label: 'Data', fn: onViewData }
                    ].map((action) => (
                        <button
                            key={action.id}
                            onClick={(e) => {
                                if (!isSelected) return;
                                e.stopPropagation();
                                if (action.fn) action.fn(classroom.id);
                            }}
                            className={`group/btn relative flex-1 flex flex-col items-center justify-center gap-1.5 py-2.5 px-1
                    rounded-xl transition-float border
                    bg-[var(--color-bg-tile)] shadow-layered
                    hover:shadow-layered-lg button-lift-dynamic
                    ${isSelected
                                    ? 'text-brand-textSecondary hover:text-brand-textPrimary hover:bg-[var(--color-bg-tile-hover)] border-[var(--color-border-subtle)] hover:border-brand-accent/50'
                                    : 'border-[var(--color-border-subtle)] cursor-default'}`}
                            title={action.label}
                        >
                            <action.icon className={`w-4 h-4 transition-colors ${isSelected ? 'group-hover/btn:text-brand-accent' : ''}`} />
                            <span className={`text-[9px] font-black uppercase tracking-widest transition-colors ${isSelected ? 'group-hover/btn:text-brand-textPrimary' : ''}`}>
                                {action.label}
                            </span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};
