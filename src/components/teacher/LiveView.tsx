import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, deleteDoc, doc } from 'firebase/firestore';
import { subscribeToClassroomTasks } from '../../services/firestoreService';
import { db, auth } from '../../firebase';
import { useClassStore } from '../../store/appSettings';
import { LiveStudent, Task, Classroom } from '../../types';
import { Activity, Users, Copy, Check, ListChecks, Trash2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '../shared/Button';
import TaskProgressIcons from './TaskProgressIcons';
import { getHierarchicalNumber } from '../../utils/taskHierarchy';
import { PageLayout } from '../shared/PageLayout';
import { TeacherChatModal } from './TeacherChatModal';
import { MessageCircle, Brain, Sparkles, Loader2 } from 'lucide-react';
import { analyzeStruggles, suggestScaffolding } from '../../services/aiService';
import { AiInsightModal } from './AiInsightModal';
import { StruggleAnalysis } from '../../types';
import toast from 'react-hot-toast';

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

    // Chat State
    const [chatSession, setChatSession] = useState<{
        studentId: string;
        studentName: string;
        taskId: string;
        taskTitle: string;
    } | null>(null);

    // AI Insight State
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [insightState, setInsightState] = useState<{
        type: 'struggles' | 'scaffolding';
        data?: StruggleAnalysis;
        tasks?: Task[];
    } | null>(null);

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

    // Handle opening chat
    const handleOpenChat = (student: LiveStudent, taskId?: string) => {
        // If taskId is provided, use it.
        // Otherwise try to find their current task.
        const targetTaskId = taskId || student.currentTaskId;

        if (!targetTaskId) {
            alert("This student doesn't have an active task to chat about yet.");
            return;
        }

        const task = tasks.find(t => t.id === targetTaskId);
        const taskTitle = task ? task.title : 'Unknown Task';

        setChatSession({
            studentId: student.uid,
            studentName: student.displayName,
            taskId: targetTaskId,
            taskTitle: taskTitle
        });
    };

    const handleAnalyzeStruggles = async () => {
        if (!currentClassId) return;
        setIsAnalyzing(true);
        try {
            const result = await analyzeStruggles(currentClassId);
            setInsightState({ type: 'struggles', data: result });
        } catch (error) {
            console.error('Error analyzing struggles:', error);
            toast.error('Failed to analyze struggles');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleSuggestScaffolding = async () => {
        if (!currentClassId) return;
        setIsAnalyzing(true);
        try {
            // First analyze struggles for context if possible, or just call scaffolding directly
            const struggleResult = await analyzeStruggles(currentClassId);
            const scaffoldResult = await suggestScaffolding(currentClassId, struggleResult.summary);
            setInsightState({ type: 'scaffolding', tasks: scaffoldResult.suggestedTasks });
        } catch (error) {
            console.error('Error suggesting scaffolding:', error);
            toast.error('Failed to suggest scaffolding');
        } finally {
            setIsAnalyzing(false);
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

    // Help to check if a student was active within the last 45 minutes
    const isRecentlyActive = (student: LiveStudent): boolean => {
        if (!student.lastSeen) return true; // If no lastSeen, show them (new student)

        const now = Date.now();
        const INACTIVITY_LIMIT_MS = 45 * 60 * 1000; // 45 minutes

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

    // Fetch Active Tasks for the Class
    useEffect(() => {
        const user = auth.currentUser;
        if (!currentClassId || !user) return;

        const unsubscribe = subscribeToClassroomTasks(currentClassId, (taskData: Task[]) => {
            // Store all non-draft tasks in state, filter for display later
            setTasks(taskData.filter(task => task.status !== 'draft'));
        }, user.uid);

        return () => unsubscribe();
    }, [currentClassId]);

    // DERIVED STATE: Filter tasks to show only what's relevant for the "Shape of the Day"
    // 1. Tasks scheduled for TODAY
    // 2. Tasks actively being worked on by any live student (even if from past/future)
    const relevantTasks = React.useMemo(() => {
        const activeTaskIds = new Set<string>();

        // Collect all task IDs that students are interacting with
        students.forEach(s => {
            if (s.metrics?.activeTasks) {
                s.metrics.activeTasks.forEach(id => activeTaskIds.add(id));
            }
            if (s.taskStatuses) {
                Object.keys(s.taskStatuses).forEach(id => activeTaskIds.add(id));
            }
        });

        return tasks.filter(task => {
            const startDate = task.startDate || '';
            const endDate = task.endDate || task.startDate || '';
            const isScheduledForToday = today >= startDate && today <= endDate;
            const isActive = activeTaskIds.has(task.id);

            return isScheduledForToday || isActive;
        }).sort((a, b) => (a.presentationOrder || 0) - (b.presentationOrder || 0));
    }, [tasks, students, today]);

    // Auto-remove inactive students (45 minutes)
    useEffect(() => {
        if (!currentClassId || students.length === 0) return;

        const checkInactivity = async () => {
            const now = Date.now();
            const INACTIVITY_LIMIT_MS = 45 * 60 * 1000; // 45 minutes

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
            <div className="flex flex-col items-center justify-center h-64 text-brand-textSecondary">
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

    // Header content for PageLayout
    const headerContent = (
        <>
            {/* Left: Label + Class Name + Active Count */}
            <div className="flex items-center gap-3">
                <div className="flex items-baseline gap-3">
                    <span className="text-fluid-lg font-black text-brand-textPrimary">
                        Live View:
                    </span>
                    <span className="text-fluid-lg font-black text-brand-textPrimary underline decoration-brand-accent decoration-2 underline-offset-4">
                        {currentClass?.name || 'No Class Selected'}
                    </span>
                </div>
                {/* Active Count Badge */}
                <div className="flex items-center gap-2 px-3 py-1 bg-brand-accent/10 text-brand-accent rounded-full text-sm font-medium border border-brand-accent/20">
                    <span className="w-2 h-2 bg-brand-accent rounded-full animate-pulse shadow-[0_0_8px_var(--color-brand-accent)]" />
                    {activeStudents.length} Active
                </div>
            </div>

            {/* Right: AI Tools & View Toggle Buttons */}
            <div className="flex items-center gap-4 self-end">
                {/* AI Multi-Tool - Contextual to active view */}
                <div className="flex items-center gap-1.5 p-1 bg-[var(--color-bg-tile-alt)] rounded-xl border border-[var(--color-border-subtle)] shadow-layered-sm">
                    {internalView === 'students' ? (
                        <button
                            onClick={handleAnalyzeStruggles}
                            disabled={isAnalyzing}
                            title="Analyze Class Struggles"
                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all
                                text-brand-textSecondary hover:text-brand-textPrimary hover:bg-white/5 disabled:opacity-50"
                        >
                            {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4 text-purple-400" />}
                            <span className="hidden sm:inline">Struggles</span>
                        </button>
                    ) : (
                        <button
                            onClick={handleSuggestScaffolding}
                            disabled={isAnalyzing}
                            title="Suggest Scaffolding Tasks"
                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all
                                text-brand-textSecondary hover:text-brand-textPrimary hover:bg-white/5 disabled:opacity-50"
                        >
                            {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-brand-accent" />}
                            <span className="hidden sm:inline">Scaffold</span>
                        </button>
                    )}
                </div>

                <div className="flex gap-1.5 p-1 bg-[var(--color-bg-tile-alt)] rounded-xl border border-[var(--color-border-subtle)] shadow-layered-sm">
                    <Button
                        size="sm"
                        icon={ListChecks}
                        onClick={() => handleViewChange('tasks')}
                        active={internalView === 'tasks'}
                        className="!rounded-lg"
                    >
                        Tasks
                    </Button>
                    <Button
                        size="sm"
                        icon={Users}
                        onClick={() => handleViewChange('students')}
                        active={internalView === 'students'}
                        className="!rounded-lg"
                    >
                        Students
                    </Button>
                </div>
            </div>
        </>
    );

    return (
        <PageLayout header={headerContent}>
            {/* Content */}
            {activeStudents.length === 0 ? (
                /* ... QR code section ... */
                <EmptySessionView currentClass={currentClass} joinUrl={joinUrl} copied={copied} setCopied={setCopied} />
            ) : internalView === 'students' ? (
                <StudentListView
                    students={activeStudents}
                    tasks={relevantTasks}
                    onDelete={handleDeleteStudent}
                    onChat={handleOpenChat}
                />
            ) : (
                <TaskListView
                    tasks={relevantTasks}
                    students={activeStudents}
                    onChat={handleOpenChat}
                />
            )}

            {/* Chat Modal */}
            {chatSession && (
                <TeacherChatModal
                    taskId={chatSession.taskId}
                    studentId={chatSession.studentId}
                    studentName={chatSession.studentName}
                    taskTitle={chatSession.taskTitle}
                    onClose={() => setChatSession(null)}
                />
            )}
            {/* AI Insight Modal */}
            {insightState && (
                <AiInsightModal
                    classroomId={currentClassId}
                    type={insightState.type}
                    insight={insightState.data}
                    suggestedTasks={insightState.tasks}
                    onClose={() => setInsightState(null)}
                />
            )}
        </PageLayout>
    );
};

const EmptySessionView: React.FC<{
    currentClass: Classroom | undefined,
    joinUrl: string,
    copied: boolean,
    setCopied: (v: boolean) => void
}> = ({ currentClass, joinUrl, copied, setCopied }) => {
    return (
        <div className="text-center py-12 bg-(--color-bg-tile) tile-blur rounded-2xl border border-border-subtle shadow-layered lift-dynamic transition-float">
            <div className="w-16 h-16 bg-[var(--color-bg-tile-alt)] rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-brand-textSecondary" />
            </div>
            <h3 className="text-fluid-lg font-bold text-brand-textPrimary mb-1">Waiting for students...</h3>
            <p className="text-fluid-sm text-brand-textSecondary max-w-sm mx-auto mb-6">
                Share this code with your students to get started.
            </p>

            {/* Join Code Section */}
            {currentClass && (
                <div className="inline-flex flex-col items-center gap-4 p-6 bg-[var(--color-bg-tile-alt)] rounded-2xl border border-dashed border-border-subtle">
                    <div className="flex items-center gap-6">
                        {/* QR Code */}
                        <div className="bg-white p-2 rounded-lg shadow-sm border border-border-subtle">
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
                            <p className="text-xs font-bold text-brand-textSecondary uppercase tracking-wider mb-1">Join at</p>
                            <p className="text-fluid-sm font-medium text-brand-textPrimary mb-3">
                                shapeoftheday.app/join
                            </p>
                            <p className="text-xs font-bold text-brand-textSecondary uppercase tracking-wider mb-1">Class Code</p>
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
                                    className="p-1.5 rounded-lg hover:bg-(--color-bg-tile-hover) transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/30"
                                    title="Copy code"
                                >
                                    {copied ? (
                                        <Check className="w-4 h-4 text-brand-accent" />
                                    ) : (
                                        <Copy className="w-4 h-4 text-brand-textSecondary" />
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Sub-Components ---

const StudentListView: React.FC<{
    students: LiveStudent[],
    tasks: Task[],
    onDelete: (uid: string, name: string) => void,
    onChat: (student: LiveStudent, taskId?: string) => void
}> = ({ students, tasks, onDelete, onChat }) => {
    return (
        <div className="flex-1 min-h-0 bg-(--color-bg-tile) tile-blur rounded-2xl border border-border-subtle overflow-hidden shadow-layered lift-dynamic transition-float flex flex-col">
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <table className="w-full text-left">
                    <thead className="bg-[var(--color-bg-tile-alt)] border-b border-border-subtle sticky top-0 z-10">
                        <tr>
                            <th className="p-4 text-xs font-bold text-brand-textSecondary uppercase w-40 bg-[var(--color-bg-tile-alt)]">Student</th>
                            <th className="p-4 text-xs font-bold text-brand-textSecondary uppercase bg-[var(--color-bg-tile-alt)]">Task Progress</th>
                            <th className="p-4 text-xs font-bold text-brand-textSecondary uppercase bg-[var(--color-bg-tile-alt)]">Questions / Comments</th>
                            <th className="p-4 text-xs font-bold text-brand-textSecondary uppercase w-16 text-center bg-[var(--color-bg-tile-alt)]">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle">
                        {students.map(student => {
                            const needsHelp = student.currentStatus === 'help' || student.currentStatus === 'stuck' || student.currentStatus === 'question';

                            return (
                                <tr key={student.uid} className="hover:bg-(--color-bg-tile-hover) transition-colors">
                                    {/* Student Name */}
                                    <td className="p-4 font-bold text-brand-textPrimary">
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
                                            <button
                                                onClick={() => onChat(student)}
                                                className={`text-sm italic hover:underline text-left ${needsHelp ? 'text-[var(--color-status-stuck)]' : 'text-brand-textSecondary'}`}
                                                title="Click to chat"
                                            >
                                                "{student.currentMessage}"
                                            </button>
                                        ) : needsHelp ? (
                                            <button
                                                onClick={() => onChat(student)}
                                                className="flex items-center gap-1.5 px-2 py-1 bg-[var(--color-status-stuck)]/10 text-[var(--color-status-stuck)] text-xs font-bold rounded-lg border border-[var(--color-status-stuck)]/20 hover:bg-[var(--color-status-stuck)]/20 transition-colors"
                                            >
                                                <MessageCircle className="w-3 h-3" />
                                                Review Request
                                            </button>
                                        ) : (
                                            <span className="text-sm text-brand-textSecondary/60">—</span>
                                        )}
                                    </td>

                                    {/* Actions */}
                                    <td className="p-4 text-center">
                                        <button
                                            onClick={() => onDelete(student.uid, student.displayName)}
                                            className="p-2 rounded-lg text-brand-textSecondary hover:text-brand-accent hover:bg-brand-accent/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/30"
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
        </div>
    );
};

const TaskListView: React.FC<{
    tasks: Task[],
    students: LiveStudent[],
    onChat: (student: LiveStudent, taskId?: string) => void
}> = ({ tasks, students, onChat }) => {
    if (tasks.length === 0) {
        return (
            <div className="text-center py-12 text-brand-textSecondary bg-(--color-bg-tile) tile-blur rounded-2xl border border-dashed border-border-subtle shadow-layered-sm lift-dynamic transition-float">
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
                // Calculate stats for this task - include normalized 'help' statuses
                const helpStudents = students.filter(s => {
                    const status = s.taskStatuses?.[task.id] as string | undefined;
                    return status === 'help' || status === 'stuck' || status === 'question';
                });
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
                            shrink-0 w-72 snap-start flex flex-col h-full
                            bg-(--color-bg-tile) tile-blur
                            rounded-2xl border transition-float
                            ${hasHelp
                                ? 'border-[var(--color-status-stuck)] shadow-layered-lg shadow-brand-accent/10 scale-[1.01]'
                                : hasActivity
                                    ? 'border-brand-accent/50 shadow-layered lift-dynamic'
                                    : 'border-border-subtle opacity-60 shadow-layered-sm'}
                        `}
                    >
                        {/* Column Header */}
                        <div className={`p-4 border-b flex flex-col gap-3 ${hasHelp ? 'border-[var(--color-status-stuck)]/20 bg-[var(--color-status-stuck)]/5' : 'border-border-subtle'}`}>
                            <div className="flex items-center justify-between">
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded shadow-sm ${hasHelp ? 'bg-[var(--color-status-stuck)] text-brand-textPrimary' : 'bg-(--color-bg-tile-hover) text-brand-textSecondary'}`}>
                                    TASK {getHierarchicalNumber(task, tasks)}
                                </span>
                                {hasHelp && (
                                    <div className="flex items-center gap-1.5 text-[10px] font-black text-[var(--color-status-stuck)] uppercase tracking-widest">
                                        <span className="w-2 h-2 bg-[var(--color-status-stuck)] rounded-full animate-ping" />
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

                            <h3 className="font-black text-base text-brand-textPrimary line-clamp-2 leading-tight tracking-tight uppercase">
                                {task.title}
                            </h3>
                        </div>

                        {/* Student Buckets - Scrollable area */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar bg-[var(--color-bg-tile-alt)]/50">
                            {/* HELP BUCKET */}
                            <StudentBucketColumn
                                label="Needs Help"
                                students={helpStudents}
                                color="bg-[var(--color-status-stuck)]/5 border-[var(--color-status-stuck)]/10"
                                badgeColor="bg-[var(--color-status-stuck)] text-brand-textPrimary"
                                textColor="text-[var(--color-status-stuck)]"
                                taskId={task.id}
                                onChat={onChat}
                            />

                            {/* WORKING BUCKET */}
                            <StudentBucketColumn
                                label="Working"
                                students={inProgressStudents}
                                color="bg-[var(--color-status-progress)]/5 border-[var(--color-status-progress)]/10"
                                badgeColor="bg-[var(--color-status-progress)] text-brand-textPrimary"
                                textColor="text-[var(--color-status-progress)]"
                                taskId={task.id}
                                onChat={onChat}
                            />

                            {/* DONE BUCKET */}
                            <StudentBucketColumn
                                label="Done"
                                students={studentsCompleted}
                                color="bg-[var(--color-status-complete)]/5 border-[var(--color-status-complete)]/10"
                                badgeColor="bg-[var(--color-status-complete)] text-brand-textPrimary"
                                textColor="text-[var(--color-status-complete)]"
                                taskId={task.id}
                                onChat={onChat}
                            />

                            {!hasActivity && (
                                <div className="h-full flex flex-col items-center justify-center text-brand-textSecondary opacity-30 mt-12">
                                    <Activity size={40} className="mb-3" />
                                    <span className="text-xs font-black uppercase tracking-widest">Idle</span>
                                </div>
                            )}
                        </div>

                        {/* Footer Statistics */}
                        <div className="p-4 bg-[var(--color-bg-tile-alt)] rounded-b-xl border-t border-border-subtle space-y-4">
                            {/* Engagement Metric */}
                            <div className="space-y-1.5">
                                <div className="flex flex-col gap-0.5">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-black text-brand-textPrimary uppercase tracking-widest">Engagement</span>
                                        <span className="text-[10px] font-bold text-brand-textPrimary bg-(--color-bg-tile-hover) px-1.5 rounded border border-border-subtle">
                                            {Math.round((totalWorking / (students.length || 1)) * 100)}%
                                        </span>
                                    </div>
                                    <span className="text-[9px] text-brand-textSecondary leading-tight">Students who have started</span>
                                </div>
                                <div className="h-1 bg-border-subtle rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-brand-accent/60 transition-all duration-500 w-(--engagement-width)"
                                        style={{ '--engagement-width': `${(totalWorking / (students.length || 1)) * 100}%` } as React.CSSProperties}
                                    />
                                </div>
                            </div>

                            {/* Friction Metric */}
                            <div className="space-y-1.5">
                                <div className="flex flex-col gap-0.5">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-black text-brand-textPrimary uppercase tracking-widest">Friction</span>
                                        <span className="text-[10px] font-bold text-brand-textPrimary bg-(--color-bg-tile-hover) px-1.5 rounded border border-border-subtle">
                                            {totalWorking > 0 ? Math.round((helpStudents.length / (helpStudents.length + inProgressStudents.length || 1)) * 100) : 0}%
                                        </span>
                                    </div>
                                    <span className="text-[9px] text-brand-textSecondary leading-tight">Active students needing help</span>
                                </div>
                                <div className="h-1 bg-border-subtle rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-brand-accent/60 transition-all duration-500 w-(--friction-width)"
                                        style={{ '--friction-width': `${totalWorking > 0 ? (helpStudents.length / (helpStudents.length + inProgressStudents.length || 1)) * 100 : 0}%` } as React.CSSProperties}
                                    />
                                </div>
                            </div>

                            {/* Main Completion Progress */}
                            <div className="space-y-1.5">
                                <div className="flex flex-col gap-0.5">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-black text-brand-textPrimary uppercase tracking-widest">Completion</span>
                                        <span className="text-[10px] font-bold text-brand-textPrimary bg-(--color-bg-tile-hover) px-1.5 rounded border border-border-subtle">
                                            {Math.round((studentsCompleted.length / (students.length || 1)) * 100)}%
                                        </span>
                                    </div>
                                    <span className="text-[9px] text-brand-textSecondary leading-tight">Total finished for this task</span>
                                </div>
                                <div className="h-1 bg-border-subtle rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-brand-accent/60 transition-all duration-500 w-(--completion-width)"
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
    textColor: string,
    taskId: string,
    onChat: (student: LiveStudent, taskId?: string) => void
}> = ({ label, students, color, badgeColor, textColor, taskId, onChat }) => {
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
                    <button
                        key={s.uid}
                        onClick={() => onChat(s, taskId)}
                        className="w-full text-left bg-(--color-bg-tile) tile-blur p-2.5 rounded-lg border border-border-subtle shadow-layered-sm flex flex-col gap-1 hover:border-brand-accent/50 hover:shadow-layered transition-all active:scale-95"
                    >
                        <span className="text-sm font-bold text-brand-textPrimary">
                            {s.displayName}
                        </span>
                        {s.currentMessage && (
                            <span className="text-[10px] italic text-brand-textSecondary line-clamp-2 leading-tight">
                                "{s.currentMessage}"
                            </span>
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
};



export default LiveView;
