import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, deleteDoc, doc } from 'firebase/firestore';
import { subscribeToClassroomTasks } from '../../services/firestoreService';
import { db, auth } from '../../firebase';
import { useClassStore } from '../../store/classStore';
import { LiveStudent, Task } from '../../types';
import { Activity, Users, Copy, Check, ListChecks, Trash2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '../shared/Button';
import TaskProgressIcons from './TaskProgressIcons';
import { getHierarchicalNumber } from '../../utils/taskHierarchy';

/**
 * LiveView Component
 * 
 * Real-time dashboard where teachers can see student progress.
 * Supports two views:
 * 1. By Student: List of students with status and progress.
 * 2. By Task: Cards for each task showing class distribution.
 */
interface LiveViewProps {
    activeView?: 'students' | 'tasks';
    onViewChange?: (view: 'students' | 'tasks') => void;
}

const LiveView: React.FC<LiveViewProps> = ({ activeView = 'students', onViewChange }) => {
    const { currentClassId, classrooms } = useClassStore();
    const [students, setStudents] = useState<LiveStudent[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const [internalView, setInternalView] = useState<'students' | 'tasks'>(activeView);

    // Sync internal state with prop changes
    useEffect(() => {
        setInternalView(activeView);
    }, [activeView]);

    // Handle view change - update internal state and notify parent
    const handleViewChange = (view: 'students' | 'tasks') => {
        setInternalView(view);
        onViewChange?.(view);
    };

    // Handle deleting a student from the live session
    const handleDeleteStudent = async (studentUid: string, studentName: string) => {
        if (!currentClassId) return;

        const confirmed = window.confirm(
            `Are you sure you want to remove "${studentName}" from the class?\n\nThis will remove them from the active session and clear their progress data.`
        );

        if (confirmed) {
            try {
                await deleteDoc(doc(db, 'classrooms', currentClassId, 'live_students', studentUid));
            } catch (error) {
                console.error('Error deleting student:', error);
                alert('Failed to remove student. Please try again.');
            }
        }
    };

    const currentClass = classrooms.find(c => c.id === currentClassId);
    const joinUrl = `${window.location.origin}/join`;

    // Fetch Live Students
    useEffect(() => {
        if (!currentClassId) return;

        const q = query(collection(db, 'classrooms', currentClassId, 'live_students'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const studentData: LiveStudent[] = [];
            snapshot.forEach((doc) => {
                studentData.push(doc.data() as LiveStudent);
            });
            // Sort alphabetically by name
            studentData.sort((a, b) => a.displayName.localeCompare(b.displayName));
            setStudents(studentData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [currentClassId]);

    // Helper to check if a student was active within the last 90 minutes
    const isRecentlyActive = (student: LiveStudent): boolean => {
        if (!student.lastSeen) return true; // If no lastSeen, show them (new student)

        const now = Date.now();
        const INACTIVITY_LIMIT_MS = 90 * 60 * 1000; // 90 minutes

        let lastSeenTime = 0;
        if (typeof student.lastSeen.toDate === 'function') {
            lastSeenTime = student.lastSeen.toDate().getTime();
        } else if (student.lastSeen instanceof Date) {
            lastSeenTime = student.lastSeen.getTime();
        } else {
            // Fallback if it's a number or string
            lastSeenTime = new Date(student.lastSeen).getTime();
        }

        return (now - lastSeenTime) <= INACTIVITY_LIMIT_MS;
    };

    // Filter students to only show those active within the last 90 minutes
    const activeStudents = students.filter(isRecentlyActive);

    // Get today's date for filtering tasks
    const today = new Date().toISOString().split('T')[0] ?? '';

    // Fetch Active Tasks for the Class - ONLY tasks active TODAY
    useEffect(() => {
        const user = auth.currentUser;
        if (!currentClassId || !user) return;

        const unsubscribe = subscribeToClassroomTasks(currentClassId, (taskData: Task[]) => {
            // Filter to only show tasks that are active TODAY
            const todaysTasks = taskData.filter(task => {
                const startDate = task.startDate || '';
                const endDate = task.endDate || task.startDate || '';
                // Check if today falls within the task's date range
                const isActiveToday = today >= startDate && today <= endDate;
                // Exclude draft tasks
                return isActiveToday && task.status !== 'draft';
            });
            setTasks(todaysTasks);
        }, user.uid);

        return () => unsubscribe();
    }, [currentClassId, today]);

    // Auto-remove inactive students (90 minutes)
    useEffect(() => {
        if (!currentClassId || students.length === 0) return;

        const checkInactivity = async () => {
            const now = Date.now();
            const INACTIVITY_LIMIT_MS = 90 * 60 * 1000; // 90 minutes

            const inactiveStudents = students.filter(student => {
                if (!student.lastSeen) return false;

                // key check: is it a Firestore Timestamp?
                let lastSeenTime = 0;
                if (typeof student.lastSeen.toDate === 'function') {
                    lastSeenTime = student.lastSeen.toDate().getTime();
                } else if (student.lastSeen instanceof Date) {
                    lastSeenTime = student.lastSeen.getTime();
                } else {
                    // Fallback if it's a number or string
                    lastSeenTime = new Date(student.lastSeen).getTime();
                }

                return (now - lastSeenTime) > INACTIVITY_LIMIT_MS;
            });

            if (inactiveStudents.length > 0) {
                console.log(`[Auto-Cleanup] Removing ${inactiveStudents.length} inactive students`);
                for (const student of inactiveStudents) {
                    try {
                        console.log(`Removing inactive student: ${student.displayName} (${student.uid})`);
                        await deleteDoc(doc(db, 'classrooms', currentClassId, 'live_students', student.uid));
                    } catch (err) {
                        console.error('Error removing inactive student:', err);
                    }
                }
            }
        };

        // Check every minute
        const intervalId = setInterval(checkInactivity, 60000);
        return () => clearInterval(intervalId);
    }, [currentClassId, students]);

    if (!currentClassId) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <Activity className="w-12 h-12 mb-4 opacity-20" />
                <p>No class selected.</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-accent"></div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col space-y-6 animate-in fade-in duration-500 overflow-hidden">
            {/* Content Header - hidden on mobile (TeacherDashboard provides mobile header) */}
            <div className="hidden lg:flex h-16 flex-shrink-0 items-center justify-between">
                {/* Left: Label + Class Name + Active Count */}
                <div className="flex items-center gap-3">
                    <div className="flex items-baseline gap-3">
                        <span className="text-fluid-lg font-black text-gray-400">
                            Live View:
                        </span>
                        <span className="text-fluid-lg font-black text-brand-textDarkPrimary dark:text-brand-textPrimary underline decoration-brand-accent decoration-2 underline-offset-4">
                            {currentClass?.name || 'No Class Selected'}
                        </span>
                    </div>
                    {/* Active Count Badge */}
                    <div className="flex items-center gap-2 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-sm font-medium border border-green-200 dark:border-green-800">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                        {activeStudents.length} Active
                    </div>
                </div>

                {/* Right: View Toggle Buttons */}
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="md"
                        icon={ListChecks}
                        onClick={() => handleViewChange('tasks')}
                        className={internalView === 'tasks' ? 'text-brand-accent' : 'text-gray-500'}
                    >
                        Tasks
                    </Button>
                    <Button
                        variant="ghost"
                        size="md"
                        icon={Users}
                        onClick={() => handleViewChange('students')}
                        className={internalView === 'students' ? 'text-brand-accent' : 'text-gray-500'}
                    >
                        Students
                    </Button>
                </div>
            </div>

            {/* Content */}
            {activeStudents.length === 0 ? (
                <div className="text-center py-12 bg-brand-lightSurface dark:bg-[#1a1d24] rounded-2xl border border-slate-200 dark:border-white/5 shadow-layered">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Users className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-fluid-lg font-bold text-gray-900 dark:text-white mb-1">Waiting for students...</h3>
                    <p className="text-fluid-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-6">
                        Share this code with your students to get started.
                    </p>

                    {/* Join Code Section */}
                    {currentClass && (
                        <div className="inline-flex flex-col items-center gap-4 p-6 bg-gray-50 dark:bg-[#151921] rounded-2xl border border-dashed border-gray-200 dark:border-white/10">
                            <div className="flex items-center gap-6">
                                {/* QR Code */}
                                <div className="bg-white p-2 rounded-lg shadow-sm border border-gray-100">
                                    <QRCodeSVG
                                        value={`${joinUrl}?code=${currentClass.joinCode}`}
                                        size={80}
                                        level="H"
                                        fgColor="#000000"
                                        bgColor="#ffffff"
                                    />
                                </div>

                                {/* Code & URL */}
                                <div className="text-left">
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Join at</p>
                                    <p className="text-fluid-sm font-medium text-brand-textDarkPrimary dark:text-brand-textPrimary mb-3">
                                        shapeoftheday.app/join
                                    </p>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Class Code</p>
                                    <div className="flex items-center gap-2">
                                        <span className="text-2xl font-mono font-black text-brand-accent tracking-widest">
                                            {currentClass.joinCode}
                                        </span>
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(currentClass.joinCode);
                                                setCopied(true);
                                                setTimeout(() => setCopied(false), 2000);
                                            }}
                                            className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/30"
                                            title="Copy code"
                                        >
                                            {copied ? (
                                                <Check className="w-4 h-4 text-green-500" />
                                            ) : (
                                                <Copy className="w-4 h-4 text-gray-400" />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            ) : internalView === 'students' ? (
                <StudentListView students={activeStudents} totalTasks={tasks.length} tasks={tasks} onDelete={handleDeleteStudent} />
            ) : (
                <TaskListView tasks={tasks} students={activeStudents} />
            )}
        </div>
    );
};

// --- Sub-Components ---

const StudentListView: React.FC<{ students: LiveStudent[], totalTasks: number, tasks: Task[], onDelete: (uid: string, name: string) => void }> = ({ students, tasks, onDelete }) => {
    return (
        <div className="bg-brand-lightSurface dark:bg-[#1a1d24] rounded-2xl border border-slate-200 dark:border-white/5 overflow-hidden shadow-layered transition-shadow duration-300">
            <table className="w-full text-left">
                <thead className="bg-gray-50 dark:bg-[#151921] border-b border-gray-200 dark:border-white/5">
                    <tr>
                        <th className="p-4 text-xs font-bold text-gray-500 uppercase w-40">Student</th>
                        <th className="p-4 text-xs font-bold text-gray-500 uppercase">Task Progress</th>
                        <th className="p-4 text-xs font-bold text-gray-500 uppercase">Questions / Comments</th>
                        <th className="p-4 text-xs font-bold text-gray-500 uppercase w-16 text-center">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-white/5">
                    {students.map(student => {
                        const needsHelp = student.currentStatus === 'help' || student.currentStatus === 'stuck' || student.currentStatus === 'question';

                        return (
                            <tr key={student.uid} className="hover:bg-gray-50 dark:hover:bg-[#151921] transition-colors">
                                {/* Student Name */}
                                <td className="p-4 font-bold text-brand-textDarkPrimary dark:text-brand-textPrimary">
                                    {student.displayName}
                                </td>

                                {/* Task Progress Icons */}
                                <td className="p-4">
                                    <TaskProgressIcons
                                        tasks={tasks}
                                        taskStatuses={student.taskStatuses || {}}
                                        maxVisible={10}
                                    />
                                </td>

                                {/* Questions/Comments - expands to fill space */}
                                <td className="p-4">
                                    {student.currentMessage ? (
                                        <span className={`text-sm italic ${needsHelp ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`} title={student.currentMessage}>
                                            "{student.currentMessage}"
                                        </span>
                                    ) : (
                                        <span className="text-sm text-gray-400 dark:text-gray-600">—</span>
                                    )}
                                </td>

                                {/* Actions */}
                                <td className="p-4 text-center">
                                    <button
                                        onClick={() => onDelete(student.uid, student.displayName)}
                                        className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/30"
                                        title={`Remove ${student.displayName} from class`}
                                        aria-label={`Remove ${student.displayName} from class`}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

const TaskListView: React.FC<{ tasks: Task[], students: LiveStudent[] }> = ({ tasks, students }) => {
    if (tasks.length === 0) {
        return (
            <div className="text-center py-12 text-gray-500 bg-brand-lightSurface dark:bg-[#1a1d24] rounded-2xl border border-dashed border-slate-200 dark:border-white/10 shadow-layered-sm">
                <Activity className="w-12 h-12 mb-4 opacity-20 mx-auto" />
                <p>No tasks scheduled for today.</p>
            </div>
        );
    }

    // Sort tasks by presentation order strictly to match other views
    const sortedTasks = [...tasks].sort((a, b) => (a.presentationOrder || 0) - (b.presentationOrder || 0));

    return (
        <div className="flex-1 flex overflow-x-auto pb-6 gap-6 custom-scrollbar snap-x">
            {sortedTasks.map(task => {
                // Calculate stats for this task
                const helpStudents = students.filter(s => s.taskStatuses?.[task.id] === 'help');
                const inProgressStudents = students.filter(s => s.taskStatuses?.[task.id] === 'in_progress');
                const studentsCompleted = students.filter(s => s.taskStatuses?.[task.id] === 'done');
                const totalWorking = helpStudents.length + inProgressStudents.length + studentsCompleted.length;

                // Column styling based on activity
                const hasActivity = totalWorking > 0;
                const hasHelp = helpStudents.length > 0;

                return (
                    <div
                        key={task.id}
                        className={`
                            flex-shrink-0 w-72 snap-start flex flex-col h-full
                            bg-brand-lightSurface dark:bg-[#1a1d24] 
                            rounded-2xl border transition-all duration-300
                            ${hasHelp
                                ? 'border-amber-500 shadow-layered-lg shadow-amber-500/10 scale-[1.01]'
                                : hasActivity
                                    ? 'border-brand-accent/50 shadow-layered'
                                    : 'border-slate-200 dark:border-white/5 opacity-60 shadow-layered-sm'}
                        `}
                    >
                        {/* Column Header */}
                        <div className={`p-4 border-b flex flex-col gap-3 ${hasHelp ? 'border-amber-100 dark:border-white/10 bg-amber-50/50 dark:bg-amber-900/5' : 'border-slate-100 dark:border-white/5'}`}>
                            <div className="flex items-center justify-between">
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded shadow-sm ${hasHelp ? 'bg-amber-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>
                                    TASK {getHierarchicalNumber(task, tasks)}
                                </span>
                                {hasHelp && (
                                    <div className="flex items-center gap-1.5 text-[10px] font-black text-amber-600 dark:text-amber-500 uppercase tracking-widest">
                                        <span className="w-2 h-2 bg-amber-500 rounded-full animate-ping" />
                                        ALERT
                                    </div>
                                )}
                                {hasActivity && !hasHelp && (
                                    <div className="flex items-center gap-1.5 text-[10px] font-black text-brand-accent uppercase tracking-widest">
                                        <span className="w-2 h-2 bg-brand-accent rounded-full animate-pulse" />
                                        LIVE
                                    </div>
                                )}
                            </div>

                            <h3 className="font-black text-base text-brand-textDarkPrimary dark:text-brand-textPrimary line-clamp-2 leading-tight tracking-tight uppercase">
                                {task.title}
                            </h3>
                        </div>

                        {/* Student Buckets - Scrollable area */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar bg-gray-50/30 dark:bg-[#151921]/20">
                            {/* HELP BUCKET */}
                            <StudentBucketColumn
                                label="Needs Help"
                                students={helpStudents}
                                color="bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/20"
                                badgeColor="bg-red-500 text-white"
                                textColor="text-red-700 dark:text-red-400"
                            />

                            {/* WORKING BUCKET */}
                            <StudentBucketColumn
                                label="Working"
                                students={inProgressStudents}
                                color="bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/20"
                                badgeColor="bg-emerald-500 text-white"
                                textColor="text-emerald-700 dark:text-emerald-400"
                            />

                            {/* DONE BUCKET */}
                            <StudentBucketColumn
                                label="Done"
                                students={studentsCompleted}
                                color="bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/20"
                                badgeColor="bg-blue-500 text-white"
                                textColor="text-blue-700 dark:text-blue-400"
                            />

                            {!hasActivity && (
                                <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-30 mt-12">
                                    <Activity size={40} className="mb-3" />
                                    <span className="text-xs font-black uppercase tracking-widest">Idle</span>
                                </div>
                            )}
                        </div>

                        {/* Footer Statistics */}
                        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-b-xl border-t border-gray-100 dark:border-gray-800 space-y-4">
                            {/* Engagement Metric */}
                            <div className="space-y-1.5">
                                <div className="flex flex-col gap-0.5">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-black text-brand-textDarkPrimary dark:text-white uppercase tracking-widest">Engagement</span>
                                        <span className="text-[10px] font-bold text-brand-textDarkPrimary dark:text-brand-textPrimary bg-white dark:bg-gray-900 px-1.5 rounded border border-black/5">
                                            {Math.round((totalWorking / (students.length || 1)) * 100)}%
                                        </span>
                                    </div>
                                    <span className="text-[9px] text-gray-400 leading-tight">Students who have started</span>
                                </div>
                                <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-brand-accent/60 transition-all duration-500 w-[var(--engagement-width)]"
                                        style={{ '--engagement-width': `${(totalWorking / (students.length || 1)) * 100}%` } as React.CSSProperties}
                                    />
                                </div>
                            </div>

                            {/* Friction Metric */}
                            <div className="space-y-1.5">
                                <div className="flex flex-col gap-0.5">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-black text-brand-textDarkPrimary dark:text-white uppercase tracking-widest">Friction</span>
                                        <span className="text-[10px] font-bold text-brand-textDarkPrimary dark:text-brand-textPrimary bg-white dark:bg-gray-900 px-1.5 rounded border border-black/5">
                                            {totalWorking > 0 ? Math.round((helpStudents.length / (helpStudents.length + inProgressStudents.length || 1)) * 100) : 0}%
                                        </span>
                                    </div>
                                    <span className="text-[9px] text-gray-400 leading-tight">Active students needing help</span>
                                </div>
                                <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-brand-accent/60 transition-all duration-500 w-[var(--friction-width)]"
                                        style={{ '--friction-width': `${totalWorking > 0 ? (helpStudents.length / (helpStudents.length + inProgressStudents.length || 1)) * 100 : 0}%` } as React.CSSProperties}
                                    />
                                </div>
                            </div>

                            {/* Main Completion Progress */}
                            <div className="space-y-1.5">
                                <div className="flex flex-col gap-0.5">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-black text-brand-textDarkPrimary dark:text-white uppercase tracking-widest">Completion</span>
                                        <span className="text-[10px] font-bold text-brand-textDarkPrimary dark:text-brand-textPrimary bg-white dark:bg-gray-900 px-1.5 rounded border border-black/5">
                                            {Math.round((studentsCompleted.length / (students.length || 1)) * 100)}%
                                        </span>
                                    </div>
                                    <span className="text-[9px] text-gray-400 leading-tight">Total finished for this task</span>
                                </div>
                                <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-brand-accent/60 transition-all duration-500 w-[var(--completion-width)]"
                                        style={{ '--completion-width': `${(studentsCompleted.length / (students.length || 1)) * 100}%` } as React.CSSProperties}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

const StudentBucketColumn: React.FC<{
    label: string,
    students: LiveStudent[],
    color: string,
    badgeColor: string,
    textColor: string
}> = ({ label, students, color, badgeColor, textColor }) => {
    if (students.length === 0) return null;

    return (
        <div className={`rounded-lg border-2 p-3 ${color} animate-in slide-in-from-top-2 duration-300`}>
            <div className="flex items-center justify-between mb-3">
                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${badgeColor}`}>
                    {label}
                </span>
                <span className={`text-xs font-bold ${textColor}`}>
                    {students.length}
                </span>
            </div>
            <div className="space-y-2">
                {students.map(s => (
                    <div
                        key={s.uid}
                        className="bg-white dark:bg-gray-900 p-2.5 rounded-lg border border-black/5 dark:border-white/5 shadow-sm flex flex-col gap-1"
                    >
                        <span className="text-sm font-bold text-brand-textDarkPrimary dark:text-brand-textPrimary">
                            {s.displayName}
                        </span>
                        {s.currentMessage && (
                            <span className="text-[10px] italic text-gray-500 dark:text-gray-400 line-clamp-2 leading-tight">
                                "{s.currentMessage}"
                            </span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};



export default LiveView;
