import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useClassStore } from '../../store/classStore';
import { LiveStudent, Task } from '../../types';
import { CheckCircle, Activity, Users, Copy, Check, ListChecks, Trash2, HelpCircle, Play } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '../shared/Button';

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

    // Fetch Active Tasks for the Class (Real-time to catch imported tasks)
    useEffect(() => {
        if (!currentClassId) return;

        // Query tasks for this class. 
        // Note: In a real app, we might filter by 'published' status or date.
        const q = query(collection(db, 'tasks'), where('selectedRoomIds', 'array-contains', currentClassId));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const taskData: Task[] = [];
            snapshot.forEach((doc) => {
                taskData.push({ id: doc.id, ...doc.data() } as Task);
            });
            // Sort by creation time if available, or title
            // Assuming we want them in some logical order.
            setTasks(taskData);
        });

        return () => unsubscribe();
    }, [currentClassId]);

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
        <div className="space-y-6 animate-in fade-in duration-500">
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
                        {students.length} Active
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
            {students.length === 0 ? (
                <div className="text-center py-12 bg-brand-lightSurface dark:bg-brand-darkSurface rounded-xl border-2 border-gray-200 dark:border-gray-700">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Users className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-fluid-lg font-bold text-gray-900 dark:text-white mb-1">Waiting for students...</h3>
                    <p className="text-fluid-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-6">
                        Share this code with your students to get started.
                    </p>

                    {/* Join Code Section */}
                    {currentClass && (
                        <div className="inline-flex flex-col items-center gap-4 p-6 bg-gray-50 dark:bg-gray-900/50 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700">
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
                <StudentListView students={students} totalTasks={tasks.length} tasks={tasks} onDelete={handleDeleteStudent} />
            ) : (
                <TaskListView tasks={tasks} students={students} />
            )}
        </div>
    );
};

// --- Sub-Components ---

const StudentListView: React.FC<{ students: LiveStudent[], totalTasks: number, tasks: Task[], onDelete: (uid: string, name: string) => void }> = ({ students, totalTasks, tasks, onDelete }) => {
    // Helper to get status-based styling for the unified task pill
    const getStatusPillStyle = (status: string) => {
        // Normalize legacy statuses
        const normalizedStatus = (status === 'stuck' || status === 'question') ? 'help' : status;

        switch (normalizedStatus) {
            case 'help':
                return {
                    bg: 'bg-status-stuck/15 dark:bg-status-stuck/20',
                    border: 'border-status-stuck',
                    text: 'text-status-stuck',
                    icon: HelpCircle
                };
            case 'in_progress':
                return {
                    bg: 'bg-status-progress/15 dark:bg-status-progress/20',
                    border: 'border-status-progress',
                    text: 'text-status-progress',
                    icon: Play
                };
            case 'done':
                return {
                    bg: 'bg-status-complete/15 dark:bg-status-complete/20',
                    border: 'border-status-complete',
                    text: 'text-status-complete',
                    icon: CheckCircle
                };
            default: // todo, idle, unknown
                return {
                    bg: 'bg-gray-100 dark:bg-gray-800',
                    border: 'border-gray-300 dark:border-gray-600',
                    text: 'text-gray-500 dark:text-gray-400',
                    icon: null
                };
        }
    };

    return (
        <div className="bg-brand-lightSurface dark:bg-brand-darkSurface rounded-xl border-2 border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
            <table className="w-full text-left">
                <thead className="bg-gray-50 dark:bg-gray-800 border-b-2 border-gray-200 dark:border-gray-700">
                    <tr>
                        <th className="p-4 text-xs font-bold text-gray-500 uppercase w-40">Student</th>
                        <th className="p-4 text-xs font-bold text-gray-500 uppercase w-20 text-center">Progress</th>
                        <th className="p-4 text-xs font-bold text-gray-500 uppercase">Current Task</th>
                        <th className="p-4 text-xs font-bold text-gray-500 uppercase">Questions / Comments</th>
                        <th className="p-4 text-xs font-bold text-gray-500 uppercase w-16 text-center">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {students.map(student => {
                        const isAllDone = student.metrics.tasksCompleted >= totalTasks && totalTasks > 0;
                        const needsHelp = student.currentStatus === 'help' || student.currentStatus === 'stuck' || student.currentStatus === 'question';
                        const isWorking = student.currentStatus === 'in_progress' || needsHelp;

                        // Always show the NEXT upcoming task (based on completed count)
                        const sortedTasks = [...tasks].sort((a, b) => (a.presentationOrder || 0) - (b.presentationOrder || 0));
                        const nextTaskIndex = student.metrics.tasksCompleted;
                        const nextTask = nextTaskIndex < sortedTasks.length ? sortedTasks[nextTaskIndex] : null;

                        // Status: if student is actively working/stuck on this task, show that status
                        // Otherwise show as "todo" (gray - not started yet)
                        const displayStatus = isAllDone
                            ? 'done'
                            : isWorking
                                ? student.currentStatus
                                : 'todo';
                        const pillStyle = getStatusPillStyle(displayStatus);
                        const StatusIcon = pillStyle.icon;

                        return (
                            <tr key={student.uid} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                {/* Student Name */}
                                <td className="p-4 font-bold text-brand-textDarkPrimary dark:text-brand-textPrimary">
                                    {student.displayName}
                                </td>

                                {/* Progress - white until done, then accent */}
                                <td className="p-4 text-center">
                                    <span className={`text-sm font-bold ${isAllDone ? 'text-brand-accent' : 'text-brand-textDarkPrimary dark:text-brand-textPrimary'}`}>
                                        {student.metrics.tasksCompleted}/{totalTasks}
                                    </span>
                                </td>

                                {/* Current Task */}
                                <td className="p-4">
                                    <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 font-semibold text-sm ${pillStyle.bg} ${pillStyle.border} ${pillStyle.text}`}>
                                        {StatusIcon && <StatusIcon className="w-4 h-4 shrink-0" />}
                                        <span className="truncate max-w-[180px]">
                                            {isAllDone
                                                ? 'All Done!'
                                                : nextTask
                                                    ? nextTask.title
                                                    : 'Idle'}
                                        </span>
                                    </span>
                                </td>

                                {/* Questions/Comments - expands to fill space */}
                                <td className="p-4">
                                    {student.currentMessage ? (
                                        <span className={`text-sm italic ${needsHelp ? 'text-status-stuck' : 'text-gray-500 dark:text-gray-400'}`} title={student.currentMessage}>
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
            <div className="text-center py-12 text-gray-500">
                <p>No tasks assigned to this class yet.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tasks.map(task => {
                // Calculate stats for this task
                const activeStudents = students.filter(s => s.currentTaskId === task.id);
                // Check if task is in student's completed history
                const studentsCompleted = students.filter(s => s.taskHistory?.some(h => h.id === task.id && h.status === 'done'));

                // Merge stuck and question into unified "help" status
                const helpStudents = activeStudents.filter(s =>
                    s.currentStatus === 'stuck' || s.currentStatus === 'question' || s.currentStatus === 'help'
                );
                const inProgressStudents = activeStudents.filter(s => s.currentStatus === 'in_progress');

                // Determine Card Styling
                let borderColor = 'border-gray-200 dark:border-gray-700';
                let bgColor = 'bg-brand-lightSurface dark:bg-brand-darkSurface';
                let opacity = 'opacity-100';

                if (helpStudents.length > 0) {
                    borderColor = 'border-amber-500';
                    bgColor = 'bg-amber-50 dark:bg-amber-900/10';
                } else if (activeStudents.length > 0) {
                    borderColor = 'border-brand-accent'; // In Progress
                } else if (studentsCompleted.length === students.length && students.length > 0) {
                    borderColor = 'border-brand-accent/50';
                    bgColor = 'bg-brand-accent/5';
                    opacity = 'opacity-60 grayscale'; // Greyed out effect
                }

                return (
                    <div key={task.id} className={`rounded-xl border-2 shadow-sm p-5 transition-all duration-300 ${borderColor} ${bgColor} ${opacity}`}>
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="font-bold text-lg text-brand-textDarkPrimary dark:text-brand-textPrimary line-clamp-2">
                                {task.title}
                            </h3>
                            {studentsCompleted.length === students.length && students.length > 0 && (
                                <CheckCircle className="w-6 h-6 text-brand-accent" />
                            )}
                        </div>

                        {/* Progress Bar for this Task */}
                        <div className="mb-4">
                            <div className="flex justify-between text-xs font-bold text-gray-500 mb-1">
                                <span>Class Progress</span>
                                <span>{Math.round((studentsCompleted.length / (students.length || 1)) * 100)}%</span>
                            </div>
                            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-brand-accent rounded-full transition-all duration-500"
                                    style={{ width: `${(studentsCompleted.length / (students.length || 1)) * 100}%` }}
                                />
                            </div>
                        </div>

                        {/* Student Buckets - unified Help instead of Stuck/Question */}
                        <div className="space-y-2">
                            <StudentBucket label="Needs Help" count={helpStudents.length} students={helpStudents} color="text-amber-600 bg-amber-100" />
                            <StudentBucket label="Working" count={inProgressStudents.length} students={inProgressStudents} color="text-brand-accent bg-brand-accent/10" />
                            <StudentBucket label="Done" count={studentsCompleted.length} students={studentsCompleted} color="text-brand-accent bg-brand-accent/20" />
                        </div>
                    </div>
                );
            })}
        </div>
    );
};


const StudentBucket: React.FC<{ label: string, count: number, students: LiveStudent[], color: string }> = ({ label, count, students, color }) => {
    if (count === 0) return null;
    return (
        <div className="flex items-start gap-2 text-sm">
            <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase w-20 shrink-0 text-center ${color}`}>
                {label} ({count})
            </span>
            <div className="flex flex-wrap gap-1 flex-1">
                {students.map(s => (
                    <span key={s.uid} className="text-xs text-gray-600 dark:text-gray-400 bg-white dark:bg-black/20 px-1.5 rounded border border-black/5 dark:border-white/5">
                        {s.displayName}
                    </span>
                ))}
            </div>
        </div>
    );
};



export default LiveView;
