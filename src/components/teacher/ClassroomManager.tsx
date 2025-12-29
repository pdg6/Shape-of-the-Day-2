import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { Classroom, AnalyticsLog } from '../../types';
import { Plus, Calendar as CalendarIcon, Users, X, Check, ChevronLeft, ChevronRight, BarChart3, TrendingUp, AlertCircle, Clock, CheckCircle, BookOpen } from 'lucide-react';
import { Button } from '../shared/Button';
import { HelpButton } from '../shared/HelpButton';
import { handleError } from '../../utils/errorHandler';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, subDays } from 'date-fns';
import { useClassStore } from '../../store/appSettings';
import { ClassCard } from './ClassCard';

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
    onNavigate?: (tab: 'tasks' | 'shape' | 'live' | 'reports' | 'classrooms', subTab?: string) => void;
    onShowJoinCode?: (classId: string) => void;
}

const ClassroomManager: React.FC<ClassroomManagerProps> = ({ activeView = 'classes', onNavigate, onShowJoinCode }) => {
    const [internalTab, setInternalTab] = useState<'classes' | 'history' | 'analytics'>(activeView);

    useEffect(() => {
        setInternalTab(activeView);
    }, [activeView]);

    // Global Store
    const { classrooms, currentClassId, setCurrentClassId, setIsClassModalOpen } = useClassStore();

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
            const studentStat = studentStats[log.studentId];
            if (studentStat) studentStat.sessions++;

            log.taskPerformance.forEach(task => {
                totalTasksAttempted++;
                totalTasksCompleted++; // In this model, logged performance usually implies completion or end of session
                if (task.statusWasStuck) {
                    totalStuckEvents++;
                    if (studentStat) studentStat.stuckCount++;
                }

                // Task Difficulty Stats
                if (!taskStats[task.taskId]) {
                    taskStats[task.taskId] = { title: task.title, attempts: 0, stuckCount: 0, totalTime: 0 };
                }
                const taskStat = taskStats[task.taskId];
                if (taskStat) {
                    taskStat.attempts++;
                    if (task.statusWasStuck) taskStat.stuckCount++;
                    taskStat.totalTime += task.timeToComplete_ms;
                }
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

    // Calculate total tasks across all classrooms
    const totalTasks = classrooms.reduce((acc, cls) => acc + (cls.contentLibrary?.length || 0), 0);

    // Get current class name
    const currentClass = classrooms.find(c => c.id === currentClassId);

    return (
        <div className={`flex flex-col space-y-4 animate-in fade-in duration-500 ${internalTab === 'history' ? 'h-full' : ''}`}>
            {/* Content Header - hidden on mobile (TeacherDashboard provides mobile header) */}
            <div className="hidden lg:flex h-16 flex-shrink-0 items-center justify-between">
                {/* Left: Label + Current Class */}
                <div className="flex items-baseline gap-3">
                    <span className="text-fluid-lg font-black text-brand-textPrimary">
                        {internalTab === 'classes' ? 'Classrooms:' : 'Reports:'}
                    </span>
                    <span className="text-fluid-lg font-black text-brand-textPrimary underline decoration-brand-accent decoration-2 underline-offset-4">
                        {currentClass?.name || 'None Selected'}
                    </span>
                </div>

                {/* Right: View-specific buttons */}
                {internalTab === 'classes' ? (
                    <button
                        onClick={openCreateModal}
                        title="Create new class"
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-float self-end
                            bg-[var(--color-bg-tile)] border border-[var(--color-border-subtle)] text-brand-textPrimary
                            shadow-layered
                            hover:shadow-layered-lg
                            button-lift-dynamic hover:border-brand-accent/50"
                    >
                        <Plus className="w-5 h-5 text-brand-accent" />
                        <span>Create Class</span>
                    </button>
                ) : (
                    <div className="flex items-center gap-2 self-end">
                        <Button
                            variant="ghost"
                            size="md"
                            icon={CalendarIcon}
                            onClick={() => setInternalTab('history')}
                            className={internalTab === 'history' ? 'text-brand-accent' : 'text-brand-textSecondary'}
                        >
                            Calendar
                        </Button>
                        <Button
                            variant="ghost"
                            size="md"
                            icon={BarChart3}
                            onClick={() => setInternalTab('analytics')}
                            className={internalTab === 'analytics' ? 'text-brand-accent' : 'text-brand-textSecondary'}
                        >
                            Analytics
                        </Button>
                    </div>
                )}
            </div>

            {/* Content Area */}
            <div className={`${internalTab === 'history' ? 'flex-1 overflow-hidden' : ''}`}>
                {internalTab === 'classes' && (
                    <div className="">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-12">
                            {classrooms.map(cls => (
                                <ClassCard
                                    key={cls.id}
                                    classroom={cls}
                                    isSelected={cls.id === currentClassId}
                                    onEdit={openEditModal}
                                    onSelect={(id) => {
                                        setCurrentClassId(id);
                                        // Do not navigate away from classrooms tab
                                    }}
                                    onViewHistory={(id) => {
                                        setCurrentClassId(id);
                                        setInternalTab('history');
                                    }}
                                    onViewStudents={(id) => {
                                        setCurrentClassId(id);
                                        if (onNavigate) onNavigate('live', 'students');
                                    }}
                                    onViewTasks={(id) => {
                                        setCurrentClassId(id);
                                        if (onNavigate) onNavigate('live', 'tasks');
                                    }}
                                    onManageTasks={(id) => {
                                        setCurrentClassId(id);
                                        if (onNavigate) onNavigate('tasks');
                                    }}
                                    onViewShape={(id) => {
                                        setCurrentClassId(id);
                                        if (onNavigate) onNavigate('shape');
                                    }}
                                    onViewCalendar={(id) => {
                                        setCurrentClassId(id);
                                        if (onNavigate) onNavigate('reports', 'history');
                                    }}
                                    onViewData={(id) => {
                                        setCurrentClassId(id);
                                        if (onNavigate) onNavigate('reports', 'analytics');
                                    }}
                                    onShowJoinCode={(id) => {
                                        setCurrentClassId(id);
                                        if (onShowJoinCode) onShowJoinCode(id);
                                    }}
                                />
                            ))}

                            {/* Summary / Create Card - Moved to end */}
                            {/* Summary / Create Card - Glass Panel Effect */}
                            <div className="flex h-full rounded-2xl transition-float overflow-hidden min-h-[160px] bg-[var(--color-bg-tile)] backdrop-blur-md border border-[var(--color-border-subtle)] shadow-layered">
                                {/* Main Content (Left Side) */}
                                <div className="flex-1 flex flex-col min-w-0">
                                    {/* Header */}
                                    <div className="h-20 p-5 relative flex justify-between items-start border-b border-[var(--color-border-subtle)]">
                                        <div className="z-10 w-full min-w-0">
                                            <h3 className="text-xl font-bold text-brand-textPrimary leading-tight mb-1 truncate pr-2">
                                                Overview
                                            </h3>
                                            <p className="text-xs font-medium text-brand-textSecondary">
                                                Classroom Manager
                                            </p>
                                        </div>
                                        <div className="p-1.5 bg-[var(--color-bg-tile-alt)] rounded-lg text-brand-textMuted">
                                            <BookOpen className="w-4 h-4" />
                                        </div>
                                    </div>

                                    {/* Body Stats */}
                                    <div className="flex-1 p-5 flex flex-col justify-center gap-4">
                                        <div className="flex items-start gap-4">
                                            <div className="flex-1 text-left -m-2 p-2">
                                                <p className="text-[10px] font-bold text-brand-textSecondary uppercase tracking-wider mb-1">Classes</p>
                                                <div className="flex items-baseline gap-1.5">
                                                    <span className="text-2xl font-bold text-brand-textPrimary">
                                                        {classrooms.length}
                                                    </span>
                                                    <span className="text-xs font-medium text-brand-textSecondary">active</span>
                                                </div>
                                            </div>

                                            <div className="w-px bg-[var(--color-border-subtle)] self-stretch my-1" />

                                            <div className="flex-1 text-left -m-2 p-2">
                                                <p className="text-[10px] font-bold text-brand-textSecondary uppercase tracking-wider mb-1">Tasks</p>
                                                <div className="flex items-baseline gap-1.5">
                                                    <span className="text-2xl font-bold text-brand-textPrimary">
                                                        {totalTasks}
                                                    </span>
                                                    <span className="text-xs font-medium text-brand-textSecondary">total</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Sidebar Action */}
                                <div className="flex flex-col w-[72px] border-l-2 border-[var(--color-border-subtle)] bg-[var(--color-bg-tile-alt)]/20">
                                    <button
                                        onClick={openCreateModal}
                                        className="h-full w-full flex flex-col items-center justify-center gap-2 p-1 text-brand-accent hover:bg-brand-accent/10 hover:shadow-[0_0_15px_rgba(59,130,246,0.5)] transition-float focus:outline-none group/create"
                                        title="Create New Class"
                                    >
                                        <div className="p-2 transition-float group-hover/create:-translate-y-1 group-hover/create:scale-110">
                                            <Plus className="w-6 h-6" />
                                        </div>
                                        <span className="text-[10px] font-bold uppercase text-center leading-tight">Create<br />Class</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {internalTab === 'history' && (
                    <div className="h-full flex flex-col">
                        {/* History Toolbar */}
                        <div className="flex items-center justify-between mb-6 bg-[var(--color-bg-tile)] p-4 rounded-2xl border border-[var(--color-border-subtle)] shadow-layered transition-float">
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
                            <div className="grid grid-cols-7 border-b-2 border-[var(--color-border-subtle)] bg-[var(--color-bg-tile-alt)]">
                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                    <div key={day} className="p-3 text-center text-xs font-bold text-brand-textSecondary uppercase tracking-wider">
                                        {day}
                                    </div>
                                ))}
                            </div>
                            <div className="grid grid-cols-7 flex-1 auto-rows-fr">
                                {daysInMonth.map((day) => {
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
                                                border-b border-r border-[var(--color-border-subtle)] p-2 relative cursor-pointer transition-colors
                                                hover:bg-brand-accent/5
                                                focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-accent
                                                ${!isSameMonth(day, currentMonth) ? 'bg-[var(--color-bg-tile-alt)]/50 text-brand-textMuted' : ''}
                                                ${isSameDay(day, new Date()) ? 'bg-brand-accent/10' : ''}
                                            `}
                                        >
                                            <span className={`text-sm font-medium ${isSameDay(day, new Date()) ? 'text-brand-accent' : ''}`}>
                                                {format(day, 'd')}
                                            </span>

                                            {hasActivity && (
                                                <div className="mt-2 space-y-1">
                                                    <div className="flex items-center gap-1 text-xs text-brand-textSecondary">
                                                        <Users className="w-3 h-3" /> {uniqueStudents}
                                                    </div>
                                                    <div className="flex items-center gap-1 text-xs text-brand-textSecondary">
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
                    <div className="space-y-6">
                        {!analyticsData ? (
                            <div className="flex flex-col items-center justify-center h-full text-brand-textSecondary">
                                <BarChart3 className="w-16 h-16 mb-4 opacity-20" />
                                <p>No analytics data available yet.</p>
                            </div>
                        ) : (
                            <>
                                {/* KPI Tiles */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div className="p-6 rounded-2xl levitated-tile">
                                        <div className="flex items-center justify-between mb-4">
                                            <span className="text-xs font-bold text-brand-textSecondary uppercase tracking-wider">Avg. Session</span>
                                            <Clock className="w-5 h-5 text-brand-accent" />
                                        </div>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-3xl font-bold text-brand-textPrimary">{analyticsData.avgSessionDuration}</span>
                                            <span className="text-sm text-brand-textSecondary">mins</span>
                                        </div>
                                    </div>

                                    <div className="p-6 rounded-2xl levitated-tile">
                                        <div className="flex items-center justify-between mb-4">
                                            <span className="text-xs font-bold text-brand-textSecondary uppercase tracking-wider">Completion Rate</span>
                                            <CheckCircle className="w-5 h-5 text-green-500" />
                                        </div>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-3xl font-bold text-brand-textPrimary">{analyticsData.completionRate}%</span>
                                        </div>
                                    </div>

                                    <div className="p-6 rounded-2xl levitated-tile">
                                        <div className="flex items-center justify-between mb-4">
                                            <span className="text-xs font-bold text-brand-textSecondary uppercase tracking-wider">Stuck Rate</span>
                                            <AlertCircle className="w-5 h-5 text-amber-500" />
                                        </div>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-3xl font-bold text-brand-textPrimary">{analyticsData.stuckRate}%</span>
                                            <span className="text-sm text-brand-textSecondary">of tasks</span>
                                        </div>
                                    </div>

                                    <div className="p-6 rounded-2xl levitated-tile">
                                        <div className="flex items-center justify-between mb-4">
                                            <span className="text-xs font-bold text-brand-textSecondary uppercase tracking-wider">Active Students</span>
                                            <Users className="w-5 h-5 text-purple-500" />
                                        </div>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-3xl font-bold text-brand-textPrimary">{analyticsData.uniqueStudents}</span>
                                            <span className="text-sm text-brand-textSecondary">total</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Charts Row */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* Task Difficulty */}
                                    <div className="p-6 rounded-2xl levitated-tile">
                                        <h3 className="text-lg font-bold text-brand-textPrimary mb-6 flex items-center gap-2">
                                            <TrendingUp className="w-5 h-5 text-brand-accent" />
                                            Most Challenging Tasks
                                        </h3>
                                        <div className="space-y-4">
                                            {analyticsData.difficultTasks.map((task, i) => (
                                                <div key={i} className="space-y-2">
                                                    <div className="flex justify-between text-sm">
                                                        <span className="font-medium truncate max-w-[70%]">{task.title}</span>
                                                        <span className="text-brand-textSecondary">{task.avgTime}s avg</span>
                                                    </div>
                                                    <div className="h-2 bg-[var(--color-bg-tile-alt)] rounded-full overflow-hidden flex">
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
                                                <p className="text-brand-textSecondary text-sm italic">No data available.</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Engagement Trend */}
                                    <div className="p-6 flex flex-col rounded-2xl levitated-tile">
                                        <h3 className="text-lg font-bold text-brand-textPrimary mb-6 flex items-center gap-2">
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
                                                            className="w-full bg-brand-accent/10 rounded-t-lg relative group-hover:bg-brand-accent/20 transition-colors"
                                                            style={{ height: `${height}%` }}
                                                        >
                                                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[var(--color-bg-tile-alt)] text-brand-textPrimary text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-[var(--color-border-subtle)] shadow-layered-sm">
                                                                {day.count}
                                                            </div>
                                                        </div>
                                                        <span className="text-xs font-bold text-brand-textMuted">{day.day}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>

                                {/* Needs Support */}
                                <div className="p-6 rounded-2xl levitated-tile">
                                    <h3 className="text-lg font-bold text-brand-textPrimary mb-6 flex items-center gap-2">
                                        <AlertCircle className="w-5 h-5 text-red-500" />
                                        Students Needing Support
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {analyticsData.studentsNeedingSupport.map((student, i) => (
                                            <div key={i} className="flex items-center gap-4 p-4 bg-[var(--color-bg-tile-alt)] rounded-lg border border-[var(--color-border-subtle)]">
                                                <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 font-bold">
                                                    {student.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-brand-textPrimary">{student.name}</p>
                                                    <p className="text-xs text-brand-textMuted">{student.stuckCount} stuck events</p>
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
                    <div className="w-full max-w-4xl max-h-[90vh] rounded-2xl flex flex-col levitated-tile">
                        <div className="p-6 border-b border-[var(--color-border-subtle)] flex justify-between items-center bg-[var(--color-bg-tile-alt)] rounded-t-2xl">
                            <h3 className="text-2xl font-bold text-brand-textPrimary">
                                {classrooms.find(c => c.id === currentClassId)?.name || 'Class'}'s schedule for {format(selectedDate, 'EEEE, MMMM do, yyyy')}
                            </h3>
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
                                        <div className="p-4 bg-brand-accent/10 rounded-xl border-2 border-brand-accent/20">
                                            <span className="text-xs font-bold text-brand-accent uppercase">Students Present</span>
                                            <p className="text-2xl font-bold text-brand-accent">
                                                {new Set(getLogsForDate(selectedDate).map(l => l.studentId)).size}
                                            </p>
                                        </div>
                                        <div className="p-4 bg-green-500/10 rounded-xl border-2 border-green-500/20">
                                            <span className="text-xs font-bold text-green-500 uppercase">Tasks Completed</span>
                                            <p className="text-2xl font-bold text-green-500">
                                                {getLogsForDate(selectedDate).reduce((acc, l) => acc + l.taskPerformance.length, 0)}
                                            </p>
                                        </div>
                                        <div className="p-4 bg-amber-500/10 rounded-xl border-2 border-amber-500/20">
                                            <span className="text-xs font-bold text-amber-500 uppercase">Stuck Incidents</span>
                                            <p className="text-2xl font-bold text-amber-500">
                                                {getLogsForDate(selectedDate).reduce((acc, l) => acc + l.taskPerformance.filter(t => t.statusWasStuck).length, 0)}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Student List Table */}
                                    <div className="border border-[var(--color-border-subtle)] rounded-2xl overflow-hidden">
                                        <table className="w-full text-left">
                                            <thead className="bg-[var(--color-bg-tile-alt)] border-b border-[var(--color-border-subtle)]">
                                                <tr>
                                                    <th className="p-4 text-xs font-bold text-brand-textMuted uppercase">Student Name</th>
                                                    <th className="p-4 text-xs font-bold text-brand-textMuted uppercase">Session Duration</th>
                                                    <th className="p-4 text-xs font-bold text-brand-textMuted uppercase">Tasks</th>
                                                    <th className="p-4 text-xs font-bold text-brand-textMuted uppercase">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[var(--color-border-subtle)]">
                                                {getLogsForDate(selectedDate).map(log => (
                                                    <tr key={log.id} className="hover:bg-[var(--color-bg-tile-hover)]">
                                                        <td className="p-4 font-bold text-brand-textPrimary">
                                                            {log.studentName}
                                                        </td>
                                                        <td className="p-4 text-sm text-brand-textSecondary font-mono">
                                                            {Math.round(log.sessionDuration / 60000)} mins
                                                        </td>
                                                        <td className="p-4">
                                                            <div className="flex flex-wrap gap-2">
                                                                {log.taskPerformance.map((t, i) => (
                                                                    <span key={i} className="px-2 py-1 bg-[var(--color-bg-tile-alt)] rounded text-xs border border-[var(--color-border-subtle)]" title={t.title}>
                                                                        {t.title.substring(0, 15)}{t.title.length > 15 ? '...' : ''}
                                                                        {t.statusWasStuck && <span className="ml-1 text-amber-500">⚠️</span>}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </td>
                                                        <td className="p-4">
                                                            <span className="px-2 py-1 bg-green-500/10 text-green-500 rounded-full text-xs font-bold">
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
