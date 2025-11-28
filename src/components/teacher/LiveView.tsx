import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { useClassStore } from '../../store/classStore';
import { LiveStudent, Task } from '../../types';
import { CheckCircle, Activity, Users } from 'lucide-react';
import { StatusBadge } from '../shared/StatusBadge';

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
}

const LiveView: React.FC<LiveViewProps> = ({ activeView = 'tasks' }) => {
    const { currentClassId } = useClassStore();
    const [students, setStudents] = useState<LiveStudent[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);

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
        const q = query(collection(db, 'tasks'), where('classroomId', '==', currentClassId));
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
            {/* Header with Toggle */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-brand-textDarkPrimary dark:text-brand-textPrimary">Live Classroom</h2>
                    <p className="text-brand-textDarkSecondary dark:text-brand-textSecondary">Monitor student progress in real-time</p>
                </div>

                <div className="flex items-center gap-4">
                    {/* Active Count Badge */}
                    <div className="flex items-center gap-2 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-sm font-medium border border-green-200 dark:border-green-800">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                        {students.length} Active
                    </div>
                </div>
            </div>

            {/* Content */}
            {students.length === 0 ? (
                <div className="text-center py-16 bg-brand-lightSurface dark:bg-brand-darkSurface rounded-xl border-[3px] border-gray-300 dark:border-gray-700">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Users className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Waiting for students...</h3>
                    <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                        Students will appear here when they join using the class code.
                    </p>
                </div>
            ) : activeView === 'students' ? (
                <StudentListView students={students} totalTasks={tasks.length} tasks={tasks} />
            ) : (
                <TaskListView tasks={tasks} students={students} />
            )}
        </div>
    );
};

// --- Sub-Components ---

const StudentListView: React.FC<{ students: LiveStudent[], totalTasks: number, tasks: Task[] }> = ({ students, totalTasks, tasks }) => {
    return (
        <div className="bg-brand-lightSurface dark:bg-brand-darkSurface rounded-xl border-[3px] border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
            <table className="w-full text-left">
                <thead className="bg-gray-50 dark:bg-gray-800 border-b-[3px] border-gray-200 dark:border-gray-700">
                    <tr>
                        <th className="p-4 text-xs font-bold text-gray-500 uppercase">Student Name</th>
                        <th className="p-4 text-xs font-bold text-gray-500 uppercase">Status</th>
                        <th className="p-4 text-xs font-bold text-gray-500 uppercase">Current Task</th>
                        <th className="p-4 text-xs font-bold text-gray-500 uppercase w-1/3">Progress</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {students.map(student => {
                        const currentTask = tasks.find(t => t.id === student.currentTaskId);
                        const progress = totalTasks > 0 ? (student.metrics.tasksCompleted / totalTasks) * 100 : 0;

                        return (
                            <tr key={student.uid} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                <td className="p-4 font-bold text-brand-textDarkPrimary dark:text-brand-textPrimary">
                                    {student.displayName}
                                </td>
                                <td className="p-4">
                                    <StatusBadge status={student.currentStatus} />
                                </td>
                                <td className="p-4 text-sm text-gray-600 dark:text-gray-400">
                                    {currentTask ? currentTask.title : <span className="italic text-gray-400">Idle</span>}
                                </td>
                                <td className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1 h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-brand-accent transition-all duration-500 ease-out rounded-full"
                                                style={{ width: `${Math.min(progress, 100)}%` }}
                                            />
                                        </div>
                                        <span className="text-xs font-bold text-gray-500 w-12 text-right">
                                            {student.metrics.tasksCompleted} / {totalTasks}
                                        </span>
                                    </div>
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
                // Better completion check: check if task ID is in student's completed list (if we had one) or infer from history/metrics.
                // Assuming 'metrics.tasksCompleted' is a count, we can't know WHICH ones.
                // However, LiveStudent has 'taskHistory'. We can check if this task is in history with status 'done'.
                const studentsCompleted = students.filter(s => s.taskHistory?.some(h => h.id === task.id && h.status === 'done'));

                const stuckStudents = activeStudents.filter(s => s.currentStatus === 'stuck');
                const questionStudents = activeStudents.filter(s => s.currentStatus === 'question');
                const inProgressStudents = activeStudents.filter(s => s.currentStatus === 'in_progress');

                // Determine Card Styling
                let borderColor = 'border-gray-200 dark:border-gray-700';
                let bgColor = 'bg-brand-lightSurface dark:bg-brand-darkSurface';
                let opacity = 'opacity-100';

                if (stuckStudents.length > 0) {
                    borderColor = 'border-red-500';
                    bgColor = 'bg-red-50 dark:bg-red-900/10';
                } else if (questionStudents.length > 0) {
                    borderColor = 'border-amber-500';
                    bgColor = 'bg-amber-50 dark:bg-amber-900/10';
                } else if (activeStudents.length > 0) {
                    borderColor = 'border-brand-accent'; // In Progress
                } else if (studentsCompleted.length === students.length && students.length > 0) {
                    borderColor = 'border-blue-200 dark:border-blue-800';
                    bgColor = 'bg-blue-50/50 dark:bg-blue-900/20';
                    opacity = 'opacity-60 grayscale'; // Greyed out effect
                }

                return (
                    <div key={task.id} className={`rounded-xl border-[3px] shadow-sm p-5 transition-all duration-300 ${borderColor} ${bgColor} ${opacity}`}>
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="font-bold text-lg text-brand-textDarkPrimary dark:text-brand-textPrimary line-clamp-2">
                                {task.title}
                            </h3>
                            {studentsCompleted.length === students.length && students.length > 0 && (
                                <CheckCircle className="w-6 h-6 text-blue-500" />
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
                                    className="h-full bg-blue-500 rounded-full transition-all duration-500"
                                    style={{ width: `${(studentsCompleted.length / (students.length || 1)) * 100}%` }}
                                />
                            </div>
                        </div>

                        {/* Student Buckets */}
                        <div className="space-y-2">
                            <StudentBucket label="Stuck" count={stuckStudents.length} students={stuckStudents} color="text-red-600 bg-red-100" />
                            <StudentBucket label="Question" count={questionStudents.length} students={questionStudents} color="text-amber-600 bg-amber-100" />
                            <StudentBucket label="Working" count={inProgressStudents.length} students={inProgressStudents} color="text-brand-accent bg-brand-accent/10" />
                            <StudentBucket label="Done" count={studentsCompleted.length} students={studentsCompleted} color="text-blue-600 bg-blue-100" />
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
