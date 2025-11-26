import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { Classroom, AnalyticsLog } from '../../types';
import { Plus, Trash2, Edit2, Calendar as CalendarIcon, Users, BookOpen, Settings, X, Check, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { handleError, handleSuccess } from '../../utils/errorHandler';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';

/**
 * ClassroomManager Component
 * 
 * Allows teachers to:
 * 1. Create, Edit, Delete Classrooms.
 * 2. View historical analytics (Calendar view).
 * 3. Drill down into daily summaries with persistent student names.
 */
interface ClassroomManagerProps {
    activeView?: 'classes' | 'history';
}

const ClassroomManager: React.FC<ClassroomManagerProps> = ({ activeView = 'classes' }) => {
    // We can still keep local state if we want internal navigation, but for now let's sync with prop
    // Actually, if we want the sidebar to control it, we should rely on the prop.
    // However, to avoid breaking internal links (like "View History" on a card), we might need an internal override or callback.
    // For simplicity, let's just use the prop as the source of truth for the tab, but we need to handle "View History" click.
    // If "View History" is clicked, we can't easily update the parent state without a callback.
    // BUT, the user requirement was "instead of having it as a floating button", implying the sidebar is the primary nav.
    // Let's use a local state that initializes from prop, but updates when prop changes.

    const [internalTab, setInternalTab] = useState<'classes' | 'history'>(activeView);

    useEffect(() => {
        setInternalTab(activeView);
    }, [activeView]);

    const [classrooms, setClassrooms] = useState<Classroom[]>([]);
    const [loading, setLoading] = useState(true);

    // --- State for Class CRUD ---
    const [showClassModal, setShowClassModal] = useState(false);
    const [editingClass, setEditingClass] = useState<Classroom | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        subject: '',
        gradeLevel: '',
        color: '#3B82F6'
    });

    // --- State for History/Calendar ---
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [logs, setLogs] = useState<AnalyticsLog[]>([]);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [showDaySummary, setShowDaySummary] = useState(false);

    // Fetch Classrooms
    useEffect(() => {
        const fetchClassrooms = async () => {
            if (!auth.currentUser) return;
            try {
                const q = query(collection(db, 'classrooms'), where('teacherId', '==', auth.currentUser.uid));
                const snapshot = await getDocs(q);
                const data: Classroom[] = [];
                snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() } as Classroom));
                setClassrooms(data);
                if (data.length > 0 && !selectedClassId) {
                    setSelectedClassId(data[0].id);
                }
            } catch (error) {
                handleError(error, 'fetching classrooms');
            } finally {
                setLoading(false);
            }
        };
        fetchClassrooms();
    }, []);

    // Fetch Logs for Calendar (when class or month changes)
    useEffect(() => {
        const fetchLogs = async () => {
            if (!selectedClassId) return;
            try {
                // In a real app, we'd query by date range. For now, fetch all for the class and filter client-side.
                const q = query(collection(db, 'analytics_logs'), where('classroomId', '==', selectedClassId));
                const snapshot = await getDocs(q);
                const data: AnalyticsLog[] = [];
                snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() } as AnalyticsLog));
                setLogs(data);
            } catch (error) {
                handleError(error, 'fetching history');
            }
        };
        if (internalTab === 'history') {
            fetchLogs();
        }
    }, [selectedClassId, internalTab]);

    // --- CRUD Handlers ---

    const handleSaveClass = async () => {
        if (!formData.name) return handleError(new Error('Class name is required'));
        if (!auth.currentUser) return;

        try {
            if (editingClass) {
                // Update
                await updateDoc(doc(db, 'classrooms', editingClass.id), {
                    name: formData.name,
                    subject: formData.subject,
                    gradeLevel: formData.gradeLevel,
                    color: formData.color
                });
                setClassrooms(prev => prev.map(c => c.id === editingClass.id ? { ...c, ...formData } : c));
                handleSuccess('Class updated successfully');
            } else {
                // Create
                const newClass = {
                    teacherId: auth.currentUser.uid,
                    joinCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
                    name: formData.name,
                    subject: formData.subject,
                    gradeLevel: formData.gradeLevel,
                    color: formData.color,
                    presentationSettings: { defaultView: 'grid', showTimeEstimates: true, allowStudentSorting: false },
                    contentLibrary: []
                };
                const ref = await addDoc(collection(db, 'classrooms'), newClass);
                setClassrooms(prev => [...prev, { id: ref.id, ...newClass } as Classroom]);
                handleSuccess('Class created successfully');
            }
            setShowClassModal(false);
            setEditingClass(null);
            setFormData({ name: '', subject: '', gradeLevel: '', color: '#3B82F6' });
        } catch (error) {
            handleError(error, 'saving class');
        }
    };

    const handleDeleteClass = async (id: string) => {
        if (!confirm('Are you sure? This will delete the class and all associated data.')) return;
        try {
            await deleteDoc(doc(db, 'classrooms', id));
            setClassrooms(prev => prev.filter(c => c.id !== id));
            handleSuccess('Class deleted');
        } catch (error) {
            handleError(error, 'deleting class');
        }
    };

    const openEditModal = (cls: Classroom) => {
        setEditingClass(cls);
        setFormData({
            name: cls.name,
            subject: cls.subject || '',
            gradeLevel: cls.gradeLevel || '',
            color: cls.color || '#3B82F6'
        });
        setShowClassModal(true);
    };

    const openCreateModal = () => {
        setEditingClass(null);
        setFormData({ name: '', subject: '', gradeLevel: '', color: '#3B82F6' });
        setShowClassModal(true);
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
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-brand-textDarkPrimary dark:text-brand-textPrimary">Classroom Manager</h2>
                    <p className="text-brand-textDarkSecondary dark:text-brand-textSecondary">Configure classes and view attendance history.</p>
                </div>
                {/* Toggle buttons removed as per request - controlled by sidebar now */}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden">
                {internalTab === 'classes' ? (
                    <div className="h-full overflow-y-auto pr-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {/* Add New Card */}
                            <button
                                onClick={openCreateModal}
                                className="flex flex-col items-center justify-center h-64 border-[3px] border-gray-300 dark:border-gray-700 rounded-xl hover:border-brand-accent hover:bg-brand-accent/5 transition-all group"
                            >
                                <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <Plus className="w-8 h-8 text-gray-400 group-hover:text-brand-accent" />
                                </div>
                                <span className="font-bold text-gray-500 group-hover:text-brand-accent">Create New Class</span>
                            </button>

                            {/* Class Cards */}
                            {classrooms.map(cls => (
                                <div key={cls.id} className="bg-brand-lightSurface dark:bg-brand-darkSurface rounded-xl shadow-sm border-[3px] border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
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
                                        <button
                                            onClick={() => { setSelectedClassId(cls.id); setInternalTab('history'); }}
                                            className="text-sm font-bold text-brand-accent hover:underline"
                                        >
                                            View History
                                        </button>
                                        <div className="flex gap-2">
                                            <button onClick={() => openEditModal(cls)} className="p-2 text-gray-500 hover:text-brand-accent hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-colors">
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDeleteClass(cls.id)} className="p-2 text-gray-500 hover:text-red-500 hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-colors">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col">
                        {/* History Toolbar */}
                        <div className="flex items-center justify-between mb-6 bg-brand-lightSurface dark:bg-brand-darkSurface p-4 rounded-xl border-[3px] border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-4">
                                <select
                                    value={selectedClassId}
                                    onChange={(e) => setSelectedClassId(e.target.value)}
                                    className="p-2 bg-gray-50 dark:bg-gray-900 border-[3px] border-gray-200 dark:border-gray-700 rounded-lg font-bold text-brand-textDarkPrimary dark:text-brand-textPrimary focus:border-brand-accent outline-none"
                                >
                                    {classrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                                <div className="h-8 w-[3px] bg-gray-200 dark:bg-gray-700" />
                                <div className="flex items-center gap-2">
                                    <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
                                        <ChevronLeft className="w-5 h-5" />
                                    </button>
                                    <span className="font-bold text-lg w-32 text-center">{format(currentMonth, 'MMMM yyyy')}</span>
                                    <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
                                        <ChevronRight className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Calendar Grid */}
                        <div className="flex-1 bg-brand-lightSurface dark:bg-brand-darkSurface rounded-xl border-[3px] border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
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
                                            className={`
                                                border-b border-r border-gray-200 dark:border-gray-700 p-2 relative cursor-pointer transition-colors
                                                hover:bg-brand-accent/5
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
            </div>

            {/* Create/Edit Class Modal */}
            {showClassModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-brand-lightSurface dark:bg-brand-darkSurface w-full max-w-md rounded-xl shadow-2xl border-[3px] border-gray-200 dark:border-gray-700 p-6 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold">{editingClass ? 'Edit Class' : 'Create New Class'}</h3>
                            <button onClick={() => setShowClassModal(false)}><X className="w-6 h-6" /></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold mb-1">Class Name</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full p-2 border-[3px] border-gray-200 dark:border-gray-700 rounded-lg bg-transparent"
                                    placeholder="e.g. Period 1 - Math"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1">Subject</label>
                                <input
                                    type="text"
                                    value={formData.subject}
                                    onChange={e => setFormData({ ...formData, subject: e.target.value })}
                                    className="w-full p-2 border-[3px] border-gray-200 dark:border-gray-700 rounded-lg bg-transparent"
                                    placeholder="e.g. Mathematics"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1">Grade Level</label>
                                <input
                                    type="text"
                                    value={formData.gradeLevel}
                                    onChange={e => setFormData({ ...formData, gradeLevel: e.target.value })}
                                    className="w-full p-2 border-[3px] border-gray-200 dark:border-gray-700 rounded-lg bg-transparent"
                                    placeholder="e.g. 10th Grade"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1">Theme Color</label>
                                <div className="flex gap-2">
                                    {['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'].map(color => (
                                        <button
                                            key={color}
                                            onClick={() => setFormData({ ...formData, color })}
                                            className={`w-8 h-8 rounded-full border-2 ${formData.color === color ? 'border-brand-textDarkPrimary dark:border-white scale-110' : 'border-transparent'}`}
                                            style={{ backgroundColor: color }}
                                        />
                                    ))}
                                </div>
                            </div>
                            <button
                                onClick={handleSaveClass}
                                className="w-full py-3 bg-brand-accent text-white font-bold rounded-lg mt-4 hover:bg-blue-600 transition-colors"
                            >
                                {editingClass ? 'Save Changes' : 'Create Class'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
                            <button onClick={() => setShowDaySummary(false)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full">
                                <X className="w-6 h-6" />
                            </button>
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
                                                            {log.taskPerformance.some(t => t.statusWasStuck) ? (
                                                                <span className="text-xs font-bold text-amber-600 bg-amber-100 px-2 py-1 rounded-full">Needs Help</span>
                                                            ) : (
                                                                <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded-full">On Track</span>
                                                            )}
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
