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
}

export const ClassCard: React.FC<ClassCardProps> = ({ classroom, onEdit, onSelect, onViewStudents, onViewTasks, onManageTasks, onViewShape, onViewCalendar, onViewData }) => {
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
        e.stopPropagation();
        navigator.clipboard.writeText(classroom.joinCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const isActive = activeStudentCount !== null && activeStudentCount > 0;
    const cardColor = classroom.color || '#3B82F6'; // Default blue

    return (
        <div
            className="group relative flex flex-col h-full bg-brand-lightSurface dark:bg-brand-darkSurface rounded-xl border-[3px] border-gray-200 dark:border-gray-700 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl overflow-hidden cursor-pointer"
            style={{
                borderColor: isHovered ? cardColor : undefined
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={() => onSelect(classroom.id)}
        >
            {/* Header / Banner */}
            <div
                className="h-24 p-6 relative flex justify-between items-start transition-colors duration-300"
                style={{
                    backgroundColor: isHovered ? `${cardColor}15` : `${cardColor}08`
                }}
            >
                <div className="z-10 w-full">
                    <h3 className="text-xl font-bold text-brand-textDarkPrimary dark:text-brand-textPrimary leading-tight mb-1 truncate pr-4">
                        {classroom.name}
                    </h3>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-2">
                        <span className="opacity-75">{classroom.subject}</span>
                        <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                        <span className="opacity-75">{classroom.gradeLevel}</span>
                    </p>
                </div>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onEdit(classroom);
                    }}
                    className="flex items-center gap-2 p-2 -mr-2 rounded-lg text-sm font-bold text-blue-600 dark:text-blue-500 hover:bg-blue-500/10 transition-colors"
                    title="Edit Class"
                >
                    <Edit2 size={16} />
                    <span>Edit</span>
                </button>
            </div>

            {/* Body Content */}
            <div className="flex-1 p-6 pt-2 flex flex-col gap-6">
                {/* Stats Row */}
                <div className="flex items-start gap-4 mt-2">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (onViewStudents) onViewStudents(classroom.id);
                        }}
                        className="flex-1 text-left group/stats hover:bg-gray-50 dark:hover:bg-gray-800/50 -m-2 p-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-brand-accent/20"
                    >
                        <p className="text-xs font-bold text-gray-400 group-hover/stats:text-brand-accent uppercase tracking-wider mb-1 transition-colors">Students</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-bold text-brand-textDarkPrimary dark:text-brand-textPrimary">
                                {activeStudentCount ?? '-'}
                            </span>
                            {isActive ? (
                                <span className="text-sm font-medium text-green-600 dark:text-green-400 animate-pulse">
                                    online
                                </span>
                            ) : (
                                <span className="text-sm font-medium text-gray-400 dark:text-gray-500">
                                    offline
                                </span>
                            )}
                        </div>
                    </button>

                    <div className="w-px bg-gray-200 dark:bg-gray-700 self-stretch" />

                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (onViewTasks) onViewTasks(classroom.id);
                        }}
                        className="flex-1 text-left group/stats hover:bg-gray-50 dark:hover:bg-gray-800/50 -m-2 p-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-brand-accent/20"
                    >
                        <p className="text-xs font-bold text-gray-400 group-hover/stats:text-brand-accent uppercase tracking-wider mb-1 transition-colors">Tasks</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-bold text-brand-textDarkPrimary dark:text-brand-textPrimary">
                                {classroom.contentLibrary?.length || 0}
                            </span>
                            <span className="text-sm font-medium text-gray-400 dark:text-gray-500">
                                assigned
                            </span>
                        </div>
                    </button>
                </div>

                {/* Join Code - Premium Token Style */}
                <button
                    onClick={handleCopyCode}
                    className="w-full group/code relative flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-brand-accent hover:bg-brand-accent/5 transition-all duration-200"
                    title="Click to copy join code"
                >
                    <div className="flex flex-col items-start">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Join Code</span>
                        <span className="font-mono font-bold text-xl tracking-widest text-brand-textDarkPrimary dark:text-brand-textPrimary group-hover/code:text-brand-accent transition-colors">
                            {classroom.joinCode}
                        </span>
                    </div>
                    <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 group-hover/code:scale-110 transition-transform">
                        {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gray-400 group-hover/code:text-brand-accent" />}
                    </div>
                </button>
            </div>

            {/* Actions Footer */}
            <div className="p-4 border-t-[3px] border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/20">
                <div className="grid grid-cols-4 gap-2">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (onManageTasks) onManageTasks(classroom.id);
                        }}
                        className="flex flex-col items-center justify-center gap-1 p-2 rounded-xl text-gray-500 hover:text-brand-accent hover:bg-white dark:hover:bg-gray-800 transition-all focus:outline-none focus:ring-2 focus:ring-brand-accent/20"
                        title="Task Manager"
                    >
                        <ListTodo className="w-5 h-5" />
                        <span className="text-[10px] font-bold uppercase">Tasks</span>
                    </button>

                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (onViewShape) onViewShape(classroom.id);
                        }}
                        className="flex flex-col items-center justify-center gap-1 p-2 rounded-xl text-gray-500 hover:text-brand-accent hover:bg-white dark:hover:bg-gray-800 transition-all focus:outline-none focus:ring-2 focus:ring-brand-accent/20"
                        title="Shape of the Day"
                    >
                        <Presentation className="w-5 h-5" />
                        <span className="text-[10px] font-bold uppercase">Shape</span>
                    </button>

                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (onViewCalendar) onViewCalendar(classroom.id);
                        }}
                        className="flex flex-col items-center justify-center gap-1 p-2 rounded-xl text-gray-500 hover:text-brand-accent hover:bg-white dark:hover:bg-gray-800 transition-all focus:outline-none focus:ring-2 focus:ring-brand-accent/20"
                        title="Class Calendar"
                    >
                        <Calendar className="w-5 h-5" />
                        <span className="text-[10px] font-bold uppercase">Calendar</span>
                    </button>

                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (onViewData) onViewData(classroom.id);
                        }}
                        className="flex flex-col items-center justify-center gap-1 p-2 rounded-xl text-gray-500 hover:text-brand-accent hover:bg-white dark:hover:bg-gray-800 transition-all focus:outline-none focus:ring-2 focus:ring-brand-accent/20"
                        title="Analytics"
                    >
                        <BarChart2 className="w-5 h-5" />
                        <span className="text-[10px] font-bold uppercase">Data</span>
                    </button>

                </div>
            </div>
        </div>
    );
};
