import React, { useState, useEffect, useMemo } from 'react';
import { collection, deleteDoc, doc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { Classroom, AnalyticsLog } from '../../types';
import { Plus, Trash2, Edit2, Calendar as CalendarIcon, Users, BookOpen, X, Check, RefreshCw, ChevronLeft, ChevronRight, BarChart3, TrendingUp, AlertCircle, Clock, CheckCircle } from 'lucide-react';
import { Button } from '../shared/Button';
import { handleError, handleSuccess } from '../../utils/errorHandler';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, subDays } from 'date-fns';
import { useClassStore } from '../../store/classStore';

/**
 * ClassroomManager Component
 * 
 * Allows teachers to:
 * 1. Create, Edit, Delete Classrooms.
 * 2. View historical analytics (Calendar view).
 * 3. View deep dive analytics (Dashboards & KPIs).
 */
interface ClassroomManagerProps {
    activeView?: 'classes' | 'history' | 'analytics';
}

const ClassroomManager: React.FC<ClassroomManagerProps> = ({ activeView = 'classes' }) => {
    const [internalTab, setInternalTab] = useState<'classes' | 'history' | 'analytics'>(activeView);

    useEffect(() => {
        setInternalTab(activeView);
    }, [activeView]);

    // Global Store
    const { classrooms, setClassrooms, currentClassId, setCurrentClassId, setIsClassModalOpen } = useClassStore();

    // --- State for History/Analytics ---
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [logs, setLogs] = useState<AnalyticsLog[]>([]);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [showDaySummary, setShowDaySummary] = useState(false);

    // Fetch Logs for Calendar/Analytics (when class changes)
    useEffect(() => {
        const fetchLogs = async () => {
            if (!currentClassId) return;
            try {
                // In a real app, we'd query by date range. For now, fetch all for the class and filter client-side.
                const q = query(collection(db, 'analytics_logs'), where('classroomId', '==', currentClassId));
                const snapshot = await getDocs(q);
                const data: AnalyticsLog[] = [];
                snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() } as AnalyticsLog));
                setLogs(data);
            } catch (error) {
                handleError(error, 'fetching history');
            }
        };
        if (internalTab === 'history' || internalTab === 'analytics') {
            fetchLogs();
        }
    }, [currentClassId, internalTab]);

    // --- Analytics Calculations ---
    const analyticsData = useMemo(() => {
        if (logs.length === 0) return null;

        const totalSessions = logs.length;
        const uniqueStudents = new Set(logs.map(l => l.studentId)).size;

        // Avg Session Duration
        const totalDuration = logs.reduce((acc, log) => acc + log.sessionDuration, 0);
        const avgSessionDuration = Math.round((totalDuration / totalSessions) / 60000); // in minutes

        // Task Stats
        let totalTasksAttempted = 0;
        let totalTasksCompleted = 0; // Assuming all logged tasks are completed for now, or check status
        let totalStuckEvents = 0;
        const taskStats: Record<string, { title: string, attempts: number, stuckCount: number, totalTime: number }> = {};
        const studentStats: Record<string, { name: string, stuckCount: number, sessions: number }> = {};

        logs.forEach(log => {
            // Student Stats
            if (!studentStats[log.studentId]) {
                studentStats[log.studentId] = { name: log.studentName, stuckCount: 0, sessions: 0 };
            }
            studentStats[log.studentId].sessions++;

            log.taskPerformance.forEach(task => {
                totalTasksAttempted++;
                totalTasksCompleted++; // In this model, logged performance usually implies completion or end of session
                if (task.statusWasStuck) {
                    totalStuckEvents++;
                    studentStats[log.studentId].stuckCount++;
                }

                // Task Difficulty Stats
                if (!taskStats[task.taskId]) {
                    taskStats[task.taskId] = { title: task.title, attempts: 0, stuckCount: 0, totalTime: 0 };
                }
                taskStats[task.taskId].attempts++;
                if (task.statusWasStuck) taskStats[task.taskId].stuckCount++;
                taskStats[task.taskId].totalTime += task.timeToComplete_ms;
            });
        });

        const completionRate = Math.round((totalTasksCompleted / totalTasksAttempted) * 100) || 0;
        const stuckRate = Math.round((totalStuckEvents / totalTasksAttempted) * 100) || 0;

        // Top Difficult Tasks (by stuck rate + avg time)
        const difficultTasks = Object.values(taskStats)
            .map(t => ({
                ...t,
                avgTime: Math.round(t.totalTime / t.attempts / 1000), // seconds
                stuckRate: (t.stuckCount / t.attempts)
            }))
            .sort((a, b) => (b.stuckRate * 100 + b.avgTime) - (a.stuckRate * 100 + a.avgTime))
            .slice(0, 5);

        // Students Needing Support
        const studentsNeedingSupport = Object.values(studentStats)
            .sort((a, b) => b.stuckCount - a.stuckCount)
            .slice(0, 5);

        // Engagement Trend (Last 7 Days)
        const last7Days = eachDayOfInterval({ start: subDays(new Date(), 6), end: new Date() });
        const trendData = last7Days.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const dayLogs = logs.filter(l => l.date === dateStr);
            return {
                day: format(day, 'EEE'),
                count: dayLogs.length
            };
        });

        return {
            avgSessionDuration,
            completionRate,
            stuckRate,
            uniqueStudents,
            difficultTasks,
            studentsNeedingSupport,
            trendData
        };
    }, [logs]);


    // --- CRUD Handlers ---

    const handleDeleteClass = async (id: string) => {
        if (!confirm('Are you sure? This will delete the class and all associated data.')) return;
        try {
            await deleteDoc(doc(db, 'classrooms', id));
            const updatedClassrooms = classrooms.filter(c => c.id !== id);
            setClassrooms(updatedClassrooms);

            // If deleted class was selected, select another one
            if (currentClassId === id) {
                setCurrentClassId(updatedClassrooms.length > 0 ? updatedClassrooms[0].id : null);
            }

            handleSuccess('Class deleted');
        } catch (error) {
            handleError(error, 'deleting class');
        }
    };

    const openEditModal = (cls: Classroom) => {
        setIsClassModalOpen(true, cls);
    };

    const openCreateModal = () => {
        setIsClassModalOpen(true, null);
    };

    // --- Calendar Helpers ---
    const daysInMonth = eachDayOfInterval({
        start: startOfMonth(currentMonth),
        end: endOfMonth(currentMonth)
    });

    const getLogsForDate = (date: Date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        return logs.filter(log => log.date === dateStr);
    };

    const handleDayClick = (date: Date) => {
        setSelectedDate(date);
        setShowDaySummary(true);
    };

    return (
        <div className="h-full flex flex-col space-y-6 animate-in fade-in duration-500">
            {/* Content Area */}
            <div className="flex-1 overflow-hidden">
                {internalTab === 'classes' && (
                    <div className="h-full overflow-y-auto pr-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {/* Add New Card */}
                            <button
                                onClick={openCreateModal}
                                className="flex flex-col items-center justify-center h-64 border-[3px] border-dashed border-gray-300 dark:border-gray-700 rounded-xl hover:border-brand-accent hover:bg-brand-accent/5 transition-all group focus:outline-none focus:ring-4 focus:ring-brand-accent/20"
                                aria-label="Create New Class"
                            >
                                <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <Plus className="w-8 h-8 text-gray-400 group-hover:text-brand-accent" />
                                </div>
                                <span className="font-bold text-gray-500 group-hover:text-brand-accent">Create New Class</span>
                            </button>

                            {/* Class Cards */}
                            {classrooms.map(cls => (
                                <div key={cls.id} className="card-base overflow-hidden flex flex-col">
                                    <div className="h-2" style={{ backgroundColor: cls.color || '#3B82F6' }} />
                                    <div className="p-6 flex-1">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h3 className="text-xl font-bold text-brand-textDarkPrimary dark:text-brand-textPrimary">{cls.name}</h3>
                                                <p className="text-sm text-gray-500">{cls.subject} • {cls.gradeLevel}</p>
                                            </div>
                                            <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                                                <BookOpen className="w-5 h-5 text-gray-500" />
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border-[3px] border-gray-200 dark:border-gray-700">
                                                <span className="text-xs font-bold text-gray-400 uppercase">Join Code</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono font-bold text-lg tracking-widest">{cls.joinCode}</span>
                                                    <button className="text-gray-400 hover:text-brand-accent" title="Regenerate">
                                                        <RefreshCw className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-4 border-t-[3px] border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex justify-between">
                                        <Button
                                            variant="tertiary"
                                            size="sm"
                                            onClick={() => { setCurrentClassId(cls.id); setInternalTab('history'); }}
                                        >
                                            View History
                                        </Button>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="icon"
                                                size="sm"
                                                onClick={() => openEditModal(cls)}
                                                className="hover:bg-white dark:hover:bg-gray-700"
                                                icon={Edit2}
                                            />
                                            <Button
                                                variant="icon"
                                                size="sm"
                                                onClick={() => handleDeleteClass(cls.id)}
                                                className="hover:text-red-500 hover:bg-white dark:hover:bg-gray-700"
                                                icon={Trash2}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {internalTab === 'history' && (
                    <div className="h-full flex flex-col">
                        {/* History Toolbar */}
                        <div className="flex items-center justify-between mb-6 bg-brand-lightSurface dark:bg-brand-darkSurface p-4 rounded-xl border-[3px] border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="icon"
                                        size="sm"
                                        onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                                        icon={ChevronLeft}
                                    />
                                    <span className="font-bold text-lg w-32 text-center">{format(currentMonth, 'MMMM yyyy')}</span>
                                    <Button
                                        variant="icon"
                                        size="sm"
                                        onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                                        icon={ChevronRight}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Calendar Grid */}
                        <div className="flex-1 card-base overflow-hidden flex flex-col">
                            <div className="grid grid-cols-7 border-b-[3px] border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                    <div key={day} className="p-3 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">
                                        {day}
                                    </div>
                                ))}
                            </div>
                            <div className="grid grid-cols-7 flex-1 auto-rows-fr">
                                {daysInMonth.map((day, idx) => {
                                    const dayLogs = getLogsForDate(day);
                                    const hasActivity = dayLogs.length > 0;
                                    const uniqueStudents = new Set(dayLogs.map(l => l.studentId)).size;

                                    return (
                                        <div
                                            key={day.toISOString()}
                                            onClick={() => handleDayClick(day)}
                                            tabIndex={0}
                                            role="button"
                                            aria-label={`View details for ${format(day, 'MMMM d, yyyy')}`}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    e.preventDefault();
                                                    handleDayClick(day);
                                                }
                                            }}
                                            className={`
                                                border-b border-r border-gray-200 dark:border-gray-700 p-2 relative cursor-pointer transition-colors
                                                hover:bg-brand-accent/5
                                                focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-accent
                                                ${!isSameMonth(day, currentMonth) ? 'bg-gray-50/50 dark:bg-gray-900/50 text-gray-400' : ''}
                                                ${isSameDay(day, new Date()) ? 'bg-blue-50 dark:bg-blue-900/10' : ''}
                                            `}
                                        >
                                            <span className={`text-sm font-medium ${isSameDay(day, new Date()) ? 'text-brand-accent' : ''}`}>
                                                {format(day, 'd')}
                                            </span>

                                            {hasActivity && (
                                                <div className="mt-2 space-y-1">
                                                    <div className="flex items-center gap-1 text-xs text-brand-textDarkSecondary dark:text-brand-textSecondary">
                                                        <Users className="w-3 h-3" /> {uniqueStudents}
                                                    </div>
                                                    <div className="flex items-center gap-1 text-xs text-brand-textDarkSecondary dark:text-brand-textSecondary">
                                                        <Check className="w-3 h-3" /> {dayLogs.reduce((acc, log) => acc + log.taskPerformance.length, 0)} Tasks
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {internalTab === 'analytics' && (
                    <div className="h-full overflow-y-auto pr-2 space-y-6">
                        {!analyticsData ? (
                            <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                <BarChart3 className="w-16 h-16 mb-4 opacity-20" />
                                <p>No analytics data available yet.</p>
                            </div>
                        ) : (
                            <>
                                {/* KPI Tiles */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div className="card-base p-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Avg. Session</span>
                                            <Clock className="w-5 h-5 text-brand-accent" />
                                        </div>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-3xl font-bold text-brand-textDarkPrimary dark:text-brand-textPrimary">{analyticsData.avgSessionDuration}</span>
                                            <span className="text-sm text-gray-500">mins</span>
                                        </div>
                                    </div>

                                    <div className="card-base p-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Completion Rate</span>
                                            <CheckCircle className="w-5 h-5 text-green-500" />
                                        </div>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-3xl font-bold text-brand-textDarkPrimary dark:text-brand-textPrimary">{analyticsData.completionRate}%</span>
                                        </div>
                                    </div>

                                    <div className="card-base p-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Stuck Rate</span>
                                            <AlertCircle className="w-5 h-5 text-amber-500" />
                                        </div>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-3xl font-bold text-brand-textDarkPrimary dark:text-brand-textPrimary">{analyticsData.stuckRate}%</span>
                                            <span className="text-sm text-gray-500">of tasks</span>
                                        </div>
                                    </div>

                                    <div className="card-base p-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Active Students</span>
                                            <Users className="w-5 h-5 text-purple-500" />
                                        </div>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-3xl font-bold text-brand-textDarkPrimary dark:text-brand-textPrimary">{analyticsData.uniqueStudents}</span>
                                            <span className="text-sm text-gray-500">total</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Charts Row */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* Task Difficulty */}
                                    <div className="card-base p-6">
                                        <h3 className="text-lg font-bold text-brand-textDarkPrimary dark:text-brand-textPrimary mb-6 flex items-center gap-2">
                                            <TrendingUp className="w-5 h-5 text-brand-accent" />
                                            Most Challenging Tasks
                                        </h3>
                                        <div className="space-y-4">
                                            {analyticsData.difficultTasks.map((task, i) => (
                                                <div key={i} className="space-y-2">
                                                    <div className="flex justify-between text-sm">
                                                        <span className="font-medium truncate max-w-[70%]">{task.title}</span>
                                                        <span className="text-gray-500">{task.avgTime}s avg</span>
                                                    </div>
                                                    <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden flex">
                                                        <div
                                                            className="bg-amber-500 h-full"
                                                            style={{ width: `${task.stuckRate * 100}%` }}
                                                            title={`Stuck Rate: ${Math.round(task.stuckRate * 100)}%`}
                                                        />
                                                        <div
                                                            className="bg-brand-accent h-full"
                                                            style={{ width: `${100 - (task.stuckRate * 100)}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                            {analyticsData.difficultTasks.length === 0 && (
                                                <p className="text-gray-400 text-sm italic">No data available.</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Engagement Trend */}
                                    <div className="card-base p-6 flex flex-col">
                                        <h3 className="text-lg font-bold text-brand-textDarkPrimary dark:text-brand-textPrimary mb-6 flex items-center gap-2">
                                            <BarChart3 className="w-5 h-5 text-brand-accent" />
                                            Activity (Last 7 Days)
                                        </h3>
                                        <div className="flex-1 flex items-end justify-between gap-2 min-h-[200px]">
                                            {analyticsData.trendData.map((day, i) => {
                                                const maxVal = Math.max(...analyticsData.trendData.map(d => d.count), 1);
                                                const height = (day.count / maxVal) * 100;
                                                return (
                                                    <div key={i} className="flex flex-col items-center gap-2 flex-1 group">
                                                        <div
                                                            className="w-full bg-brand-accent/20 dark:bg-brand-accent/10 rounded-t-lg relative group-hover:bg-brand-accent/40 transition-colors"
                                                            style={{ height: `${height}%` }}
                                                        >
                                                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                                                {day.count}
                                                            </div>
                                                        </div>
                                                        <span className="text-xs font-bold text-gray-400">{day.day}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>

                                {/* Needs Support */}
                                <div className="card-base p-6">
                                    <h3 className="text-lg font-bold text-brand-textDarkPrimary dark:text-brand-textPrimary mb-6 flex items-center gap-2">
                                        <AlertCircle className="w-5 h-5 text-red-500" />
                                        Students Needing Support
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {analyticsData.studentsNeedingSupport.map((student, i) => (
                                            <div key={i} className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-800">
                                                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center text-red-600 font-bold">
                                                    {student.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-brand-textDarkPrimary dark:text-brand-textPrimary">{student.name}</p>
                                                    <p className="text-xs text-gray-500">{student.stuckCount} stuck events</p>
                                                </div>
                                            </div>
                                        ))}
                                        {analyticsData.studentsNeedingSupport.length === 0 && (
                                            <p className="text-gray-400 text-sm italic col-span-full">No students flagged for support.</p>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Daily Summary Modal */}
            {showDaySummary && selectedDate && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-brand-lightSurface dark:bg-brand-darkSurface w-full max-w-4xl max-h-[90vh] rounded-xl shadow-2xl border-[3px] border-gray-200 dark:border-gray-700 flex flex-col animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b-[3px] border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800 rounded-t-xl">
                            <div>
                                <h3 className="text-2xl font-bold text-brand-textDarkPrimary dark:text-brand-textPrimary">
                                    {format(selectedDate, 'EEEE, MMMM do, yyyy')}
                                </h3>
                                <p className="text-gray-500">Daily Summary</p>
                            </div>
                            <Button
                                variant="icon"
                                onClick={() => setShowDaySummary(false)}
                                className="rounded-full"
                                icon={X}
                            />
                        </div>

                        <div className="p-6 overflow-y-auto custom-scrollbar">
                            {getLogsForDate(selectedDate).length === 0 ? (
                                <div className="text-center py-12 text-gray-500">
                                    <CalendarIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                    <p>No activity recorded for this day.</p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {/* Stats Cards */}
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border-[3px] border-blue-100 dark:border-blue-800">
                                            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase">Students Present</span>
                                            <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                                                {new Set(getLogsForDate(selectedDate).map(l => l.studentId)).size}
                                            </p>
                                        </div>
                                        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border-[3px] border-green-100 dark:border-green-800">
                                            <span className="text-xs font-bold text-green-600 dark:text-green-400 uppercase">Tasks Completed</span>
                                            <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                                                {getLogsForDate(selectedDate).reduce((acc, l) => acc + l.taskPerformance.length, 0)}
                                            </p>
                                        </div>
                                        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border-[3px] border-amber-100 dark:border-amber-800">
                                            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase">Stuck Incidents</span>
                                            <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                                                {getLogsForDate(selectedDate).reduce((acc, l) => acc + l.taskPerformance.filter(t => t.statusWasStuck).length, 0)}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Student List Table */}
                                    <div className="border-[3px] border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                                        <table className="w-full text-left">
                                            <thead className="bg-gray-100 dark:bg-gray-800 border-b-[3px] border-gray-200 dark:border-gray-700">
                                                <tr>
                                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase">Student Name</th>
                                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase">Session Duration</th>
                                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase">Tasks</th>
                                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                                {getLogsForDate(selectedDate).map(log => (
                                                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                                        <td className="p-4 font-bold text-brand-textDarkPrimary dark:text-brand-textPrimary">
                                                            {log.studentName}
                                                        </td>
                                                        <td className="p-4 text-sm text-gray-600 dark:text-gray-400 font-mono">
                                                            {Math.round(log.sessionDuration / 60000)} mins
                                                        </td>
                                                        <td className="p-4">
                                                            <div className="flex flex-wrap gap-2">
                                                                {log.taskPerformance.map((t, i) => (
                                                                    <span key={i} className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs border-[3px] border-gray-200 dark:border-gray-700" title={t.title}>
                                                                        {t.title.substring(0, 15)}{t.title.length > 15 ? '...' : ''}
                                                                        {t.statusWasStuck && <span className="ml-1 text-amber-500">⚠️</span>}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </td>
                                                        <td className="p-4">
                                                            <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-bold">
                                                                Completed
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClassroomManager;
