import React, { useState, useEffect } from 'react';
import { Classroom } from '../../types';
import { collection, getCountFromServer } from 'firebase/firestore';
import { db } from '../../firebase';
import { Copy, Edit2, BarChart2, Check, Calendar, ListTodo, Presentation } from 'lucide-react';

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
    const [isHovered, setIsHovered] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const fetchActiveCount = async () => {
            try {
                const coll = collection(db, `classrooms/${classroom.id}/live_students`);
                const snapshot = await getCountFromServer(coll);
                setActiveStudentCount(snapshot.data().count);
            } catch (error) {
                console.error("Error fetching active student count:", error);
                setActiveStudentCount(0);
            }
        };
        fetchActiveCount();
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
            className="group relative flex flex-col h-full bg-brand-lightSurface dark:bg-brand-darkSurface rounded-xl border-2 border-gray-200 dark:border-gray-700 transition-all duration-300 hover:shadow-xl cursor-pointer overflow-hidden"
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
                <div className="h-20 p-5 relative flex justify-between items-start border-b border-gray-100 dark:border-gray-800">
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
                        className={`flex items-center gap-2 p-1.5 rounded-md text-sm font-bold text-gray-400 transition-colors ${isSelected ? 'hover:text-brand-accent hover:bg-brand-accent/10' : ''}`}
                        title="Edit Class"
                    >
                        <Edit2 size={16} />
                    </button>
                </div>

                {/* Body Content */}
                <div className="flex-1 p-5 flex flex-col justify-center gap-4">
                    {/* Stats Row */}
                    <div className="flex items-start gap-4">
                        <button
                            onClick={(e) => {
                                if (!isSelected) return;
                                e.stopPropagation();
                                if (onViewStudents) onViewStudents(classroom.id);
                            }}
                            className={`flex-1 text-left group/stats -m-2 p-2 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-brand-accent/20 ${isSelected ? 'hover:bg-gray-50 dark:hover:bg-gray-800/50' : ''}`}
                        >
                            <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 transition-colors ${isSelected ? 'text-brand-accent' : 'text-gray-400' + (isSelected ? ' group-hover/stats:text-brand-accent' : '')}`}>Students</p>
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-2xl font-bold text-brand-textDarkPrimary dark:text-brand-textPrimary">
                                    {activeStudentCount ?? '-'}
                                </span>
                                {isActive ? (
                                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" title="Online" />
                                ) : (
                                    <span className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600" title="Offline" />
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
                            className={`flex-1 text-left group/stats -m-2 p-2 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-brand-accent/20 ${isSelected ? 'hover:bg-gray-50 dark:hover:bg-gray-800/50' : ''}`}
                        >
                            <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 transition-colors ${isSelected ? 'text-brand-accent' : 'text-gray-400' + (isSelected ? ' group-hover/stats:text-brand-accent' : '')}`}>Tasks</p>
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-2xl font-bold text-brand-textDarkPrimary dark:text-brand-textPrimary">
                                    {classroom.contentLibrary?.length || 0}
                                </span>
                            </div>
                        </button>
                    </div>

                    {/* Join Code - Simplified */}
                    <button
                        onClick={handleCopyCode}
                        className={`w-full group/code relative flex items-center justify-between p-2.5 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 transition-all duration-200 ${isSelected ? 'hover:border-brand-accent hover:bg-brand-accent/5' : ''}`}
                        title="Click to copy join code"
                    >
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Code</span>
                        <div className="flex items-center gap-2">
                            <span className={`font-mono font-bold text-lg tracking-widest text-brand-textDarkPrimary dark:text-brand-textPrimary transition-colors ${isSelected ? 'group-hover/code:text-brand-accent' : ''}`}>
                                {classroom.joinCode}
                            </span>
                            {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className={`w-3.5 h-3.5 text-gray-400 ${isSelected ? 'group-hover/code:text-brand-accent' : ''}`} />}
                        </div>
                    </button>
                </div>
            </div>

            {/* Actions Footer (Bottom Row) */}
            <div className="flex flex-row h-14 border-t-2 border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/20">
                <button
                    onClick={(e) => {
                        if (!isSelected) return;
                        e.stopPropagation();
                        if (onManageTasks) onManageTasks(classroom.id);
                    }}
                    className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-gray-500 transition-all focus:outline-none hover:bg-white dark:hover:bg-gray-800 ${isSelected ? 'hover:text-brand-accent' : 'opacity-50 cursor-default'}`}
                    title="Tasks"
                >
                    <ListTodo className="w-5 h-5" />
                    <span className="text-[9px] font-bold uppercase">Tasks</span>
                </button>

                <div className="w-px h-8 bg-gray-200 dark:bg-gray-700 my-auto" />

                <button
                    onClick={(e) => {
                        if (!isSelected) return;
                        e.stopPropagation();
                        if (onViewShape) onViewShape(classroom.id);
                    }}
                    className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-gray-500 transition-all focus:outline-none hover:bg-white dark:hover:bg-gray-800 ${isSelected ? 'hover:text-brand-accent' : 'opacity-50 cursor-default'}`}
                    title="Shape"
                >
                    <Presentation className="w-5 h-5" />
                    <span className="text-[9px] font-bold uppercase">Shape</span>
                </button>

                <div className="w-px h-8 bg-gray-200 dark:bg-gray-700 my-auto" />

                <button
                    onClick={(e) => {
                        if (!isSelected) return;
                        e.stopPropagation();
                        if (onViewCalendar) onViewCalendar(classroom.id);
                    }}
                    className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-gray-500 transition-all focus:outline-none hover:bg-white dark:hover:bg-gray-800 ${isSelected ? 'hover:text-brand-accent' : 'opacity-50 cursor-default'}`}
                    title="Calendar"
                >
                    <Calendar className="w-5 h-5" />
                    <span className="text-[9px] font-bold uppercase">Cal</span>
                </button>

                <div className="w-px h-8 bg-gray-200 dark:bg-gray-700 my-auto" />

                <button
                    onClick={(e) => {
                        if (!isSelected) return;
                        e.stopPropagation();
                        if (onViewData) onViewData(classroom.id);
                    }}
                    className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-gray-500 transition-all focus:outline-none hover:bg-white dark:hover:bg-gray-800 ${isSelected ? 'hover:text-brand-accent' : 'opacity-50 cursor-default'}`}
                    title="Analytics"
                >
                    <BarChart2 className="w-5 h-5" />
                    <span className="text-[9px] font-bold uppercase">Data</span>
                </button>
            </div>
        </div>
    );
};
