import React, { useState, useEffect, useMemo } from 'react';
import { Calendar as CalendarIcon, Link as LinkIcon, Plus, Check, Upload, Loader, ChevronLeft, ChevronRight, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '../shared/Button';
import { handleError, handleSuccess } from '../../utils/errorHandler';
import { toDateString } from '../../utils/dateHelpers';
import { collection, addDoc, query, where, getDocs, serverTimestamp, doc, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { Classroom } from '../../types';

// --- Types ---

interface Task {
    id: string;
    title: string;
    description: string;
    linkURL: string;
    imageURL: string;
    startDate: string;
    endDate: string;
    selectedRoomIds: string[];
    presentationOrder: number;
    createdAt: any;
}

interface TaskFormData {
    title: string;
    description: string;
    linkURL: string;
    startDate: string;
    endDate: string;
    selectedRoomIds: string[];
}

const INITIAL_FORM_STATE: TaskFormData = {
    title: '',
    description: '',
    linkURL: '',
    startDate: toDateString(),
    endDate: toDateString(),
    selectedRoomIds: []
};

export default function TaskManager() {
    // --- State ---
    const [rooms, setRooms] = useState<Classroom[]>([]);
    const [loadingRooms, setLoadingRooms] = useState(true);

    // Task Data
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loadingTasks, setLoadingTasks] = useState(true);

    // UI State
    const [selectedDate, setSelectedDate] = useState<string>(toDateString());
    const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
    const [formData, setFormData] = useState<TaskFormData>(INITIAL_FORM_STATE);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUploading, setIsUploading] = useState(false); // Simple upload state for now

    // Calendar State
    const [calendarBaseDate, setCalendarBaseDate] = useState(new Date());

    // --- Effects ---

    // Fetch Classrooms
    useEffect(() => {
        const fetchClassrooms = async () => {
            if (!auth.currentUser) return;
            try {
                const q = query(collection(db, 'classrooms'), where('teacherId', '==', auth.currentUser.uid));
                const snapshot = await getDocs(q);
                const roomData: Classroom[] = [];
                snapshot.forEach(doc => {
                    roomData.push({ id: doc.id, ...doc.data() } as Classroom);
                });
                setRooms(roomData);
            } catch (error) {
                console.error("Failed to fetch classrooms:", error);
            } finally {
                setLoadingRooms(false);
            }
        };
        fetchClassrooms();
    }, []);

    // Fetch Tasks (Real-time)
    useEffect(() => {
        if (!auth.currentUser) return;

        // In a real app, we might filter by teacherId or rely on security rules
        // For now, let's assume we fetch all tasks created by this teacher
        // We need a 'teacherId' field on tasks or a subcollection structure.
        // Assuming 'tasks' collection exists.

        const q = query(
            collection(db, 'tasks'),
            where('teacherId', '==', auth.currentUser.uid)
            // We could order by presentationOrder here, but we do client-side filtering anyway
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const taskData: Task[] = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                taskData.push({
                    id: doc.id,
                    ...data,
                    selectedRoomIds: data.selectedRoomIds || [] // Ensure array exists
                } as Task);
            });
            // Sort by presentationOrder
            taskData.sort((a, b) => (a.presentationOrder || 0) - (b.presentationOrder || 0));
            setTasks(taskData);
            setLoadingTasks(false);
        }, (error) => {
            console.error("Error fetching tasks:", error);
            setLoadingTasks(false);
        });

        return () => unsubscribe();
    }, []);


    // --- Helpers ---

    const getWeekDays = (baseDate: Date) => {
        const days = [];
        // Start from Monday of the current week
        const day = baseDate.getDay();
        const diff = baseDate.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
        const monday = new Date(baseDate);
        monday.setDate(diff);

        for (let i = 0; i < 5; i++) {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            days.push(d);
        }
        return days;
    };

    const weekDays = useMemo(() => getWeekDays(calendarBaseDate), [calendarBaseDate]);

    const filteredTasks = useMemo(() => {
        return tasks.filter(task => {
            return selectedDate >= task.startDate && selectedDate <= task.endDate;
        });
    }, [tasks, selectedDate]);

    const resetForm = () => {
        setFormData(INITIAL_FORM_STATE);
        setEditingTaskId(null);
        setIsUploading(false);
    };

    // --- Handlers ---

    const handleInputChange = (field: keyof TaskFormData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleRoomToggle = (roomId: string) => {
        setFormData(prev => {
            const current = prev.selectedRoomIds;
            const updated = current.includes(roomId)
                ? current.filter(id => id !== roomId)
                : [...current, roomId];
            return { ...prev, selectedRoomIds: updated };
        });
    };

    const handleSave = async () => {
        if (!auth.currentUser) return;
        if (!formData.title.trim()) {
            handleError("Please enter a task title.");
            return;
        }
        if (formData.selectedRoomIds.length === 0) {
            handleError("Please assign at least one class.");
            return;
        }

        setIsSubmitting(true);
        try {
            const taskData = {
                ...formData,
                teacherId: auth.currentUser.uid,
                updatedAt: serverTimestamp()
            };

            if (editingTaskId) {
                // Update
                await updateDoc(doc(db, 'tasks', editingTaskId), taskData);
                handleSuccess("Task updated successfully!");
            } else {
                // Create
                // Find max order for new task
                const maxOrder = tasks.length > 0 ? Math.max(...tasks.map(t => t.presentationOrder || 0)) : 0;

                await addDoc(collection(db, 'tasks'), {
                    ...taskData,
                    presentationOrder: maxOrder + 1,
                    createdAt: serverTimestamp(),
                    imageURL: '' // TODO: Handle actual file upload
                });
                handleSuccess("Task created successfully!");
            }
            resetForm();
        } catch (error) {
            console.error("Error saving task:", error);
            handleError("Failed to save task.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!editingTaskId) return;
        if (!window.confirm("Are you sure you want to delete this task?")) return;

        setIsSubmitting(true);
        try {
            await deleteDoc(doc(db, 'tasks', editingTaskId));
            handleSuccess("Task deleted.");
            resetForm();
        } catch (error) {
            console.error("Error deleting task:", error);
            handleError("Failed to delete task.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditClick = (task: Task) => {
        setEditingTaskId(task.id);
        setFormData({
            title: task.title,
            description: task.description,
            linkURL: task.linkURL,
            startDate: task.startDate,
            endDate: task.endDate,
            selectedRoomIds: task.selectedRoomIds
        });
    };

    const handleReorder = async (taskId: string, direction: 'up' | 'down') => {
        const currentIndex = filteredTasks.findIndex(t => t.id === taskId);
        if (currentIndex === -1) return;

        const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
        if (targetIndex < 0 || targetIndex >= filteredTasks.length) return;

        const currentTask = filteredTasks[currentIndex];
        const targetTask = filteredTasks[targetIndex];

        if (!currentTask || !targetTask) return;

        // Swap orders
        // Note: This is a simplified reorder. In a real app with shared lists, 
        // we might need a more robust ranking system (e.g. Lexorank).
        // Here we just swap the 'presentationOrder' values.

        try {
            const currentOrder = currentTask.presentationOrder || 0;
            const targetOrder = targetTask.presentationOrder || 0;

            await updateDoc(doc(db, 'tasks', currentTask.id), { presentationOrder: targetOrder });
            await updateDoc(doc(db, 'tasks', targetTask.id), { presentationOrder: currentOrder });
        } catch (error) {
            console.error("Failed to reorder:", error);
        }
    };

    const handleWeekNav = (direction: 'prev' | 'next') => {
        const newDate = new Date(calendarBaseDate);
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
        setCalendarBaseDate(newDate);
    };

    // --- Render ---

    return (
        <div className="flex-1 h-full overflow-y-auto lg:overflow-hidden">
            <div className="min-h-full lg:h-full grid grid-cols-1 lg:grid-cols-4 gap-6">

                {/* LEFT PANEL: Task Editor */}
                <div className="lg:col-span-3 flex flex-col h-auto lg:h-full lg:overflow-y-auto custom-scrollbar p-4 lg:pl-6 lg:py-6 lg:pr-0">
                    <div className="card-base p-6 space-y-6">
                        <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-800 pb-4">
                            <h2 className="text-xl font-bold text-brand-textDarkPrimary dark:text-brand-textPrimary">
                                {editingTaskId ? 'Edit Task' : 'Create New Task'}
                            </h2>
                            {/* Mobile/Header New Task Button (optional, keeping for flexibility) */}
                            {editingTaskId && (
                                <Button variant="tertiary" size="sm" onClick={resetForm} icon={Plus} className="lg:hidden">
                                    New Task
                                </Button>
                            )}
                        </div>

                        {/* Title */}
                        <div>
                            <label className="block text-xs font-bold text-brand-textDarkSecondary dark:text-brand-textSecondary uppercase mb-1">Title</label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={e => handleInputChange('title', e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl border-[3px] transition-all duration-200 bg-transparent text-brand-textDarkPrimary dark:text-brand-textPrimary border-gray-200 dark:border-gray-700 placeholder-gray-400 dark:placeholder-gray-500 font-medium hover:border-gray-400 dark:hover:border-gray-100 focus:outline-none focus:border-gray-300 dark:focus:border-gray-100"
                                placeholder="e.g. Read Chapter 4"
                            />
                        </div>

                        {/* Dates */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-brand-textDarkSecondary dark:text-brand-textSecondary uppercase mb-1">Start Date</label>
                                <input
                                    type="date"
                                    value={formData.startDate}
                                    onChange={e => handleInputChange('startDate', e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl border-[3px] transition-all duration-200 bg-transparent text-brand-textDarkPrimary dark:text-brand-textPrimary border-gray-200 dark:border-gray-700 placeholder-gray-400 dark:placeholder-gray-500 font-medium text-sm hover:border-gray-400 dark:hover:border-gray-100 focus:outline-none focus:border-gray-300 dark:focus:border-gray-100"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-brand-textDarkSecondary dark:text-brand-textSecondary uppercase mb-1">Due Date</label>
                                <input
                                    type="date"
                                    value={formData.endDate}
                                    onChange={e => handleInputChange('endDate', e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl border-[3px] transition-all duration-200 bg-transparent text-brand-textDarkPrimary dark:text-brand-textPrimary border-gray-200 dark:border-gray-700 placeholder-gray-400 dark:placeholder-gray-500 font-medium text-sm hover:border-gray-400 dark:hover:border-gray-100 focus:outline-none focus:border-gray-300 dark:focus:border-gray-100"
                                />
                            </div>
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-xs font-bold text-brand-textDarkSecondary dark:text-brand-textSecondary uppercase mb-1">Description</label>
                            <textarea
                                value={formData.description}
                                onChange={e => handleInputChange('description', e.target.value)}
                                className="w-full h-32 px-4 py-2.5 rounded-xl border-[3px] transition-all duration-200 bg-transparent text-brand-textDarkPrimary dark:text-brand-textPrimary border-gray-200 dark:border-gray-700 placeholder-gray-400 dark:placeholder-gray-500 text-sm resize-none hover:border-gray-400 dark:hover:border-gray-100 focus:outline-none focus:border-gray-300 dark:focus:border-gray-100"
                                placeholder="Instructions..."
                            />
                        </div>

                        {/* Attachments & Link */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* File Upload Stub */}
                            <div className="relative border-[3px] border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-brand-lightSurface dark:bg-brand-darkSurface hover:border-gray-400 dark:hover:border-gray-100 focus-within:border-gray-300 dark:focus-within:border-gray-100 transition-all text-center group cursor-pointer">
                                <input
                                    type="file"
                                    disabled // Disabled for UI demo
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-not-allowed z-10"
                                />
                                <div className="flex flex-col items-center justify-center gap-2 text-gray-400 group-hover:text-brand-accent transition-colors">
                                    <Upload size={20} />
                                    <span className="text-xs font-bold">Upload File (Stub)</span>
                                </div>
                            </div>

                            {/* Link Input */}
                            <div className="relative border-[3px] border-gray-200 dark:border-gray-700 rounded-xl p-1 flex items-center bg-brand-lightSurface dark:bg-brand-darkSurface hover:border-gray-400 dark:hover:border-gray-100 focus-within:border-gray-300 dark:focus-within:border-gray-100 transition-colors">
                                <div className="pl-3 text-gray-400">
                                    <LinkIcon size={16} />
                                </div>
                                <input
                                    type="url"
                                    value={formData.linkURL}
                                    onChange={e => handleInputChange('linkURL', e.target.value)}
                                    className="w-full p-2 bg-transparent outline-none text-sm text-brand-textDarkPrimary dark:text-brand-textPrimary placeholder-gray-400 font-medium"
                                    placeholder="Paste URL..."
                                />
                            </div>
                        </div>

                        {/* Class Assignment & Actions */}
                        <div className="pt-4 border-t-[3px] border-gray-200 dark:border-gray-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">

                            {/* Class Selector */}
                            <div className="flex-1">
                                <label className="block text-xs font-bold text-brand-textDarkSecondary dark:text-brand-textSecondary uppercase mb-2">Assign to Classes</label>
                                {loadingRooms ? (
                                    <Loader className="w-4 h-4 animate-spin text-gray-400" />
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        {rooms.map(room => {
                                            const isSelected = formData.selectedRoomIds.includes(room.id);
                                            return (
                                                <button
                                                    key={room.id}
                                                    onClick={() => handleRoomToggle(room.id)}
                                                    style={{
                                                        borderColor: isSelected ? (room.color || '') : '',
                                                        color: isSelected ? (room.color || '') : ''
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        if (!isSelected && room.color) {
                                                            e.currentTarget.style.borderColor = room.color;
                                                            e.currentTarget.style.color = room.color;
                                                        }
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        if (!isSelected) {
                                                            e.currentTarget.style.borderColor = '';
                                                            e.currentTarget.style.color = '';
                                                        }
                                                    }}
                                                    className={`
                                                        flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all border-[3px]
                                                        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-accent
                                                        ${isSelected
                                                            ? 'bg-brand-lightSurface dark:bg-brand-darkSurface pr-2 shadow-md'
                                                            : 'bg-brand-lightSurface dark:bg-brand-darkSurface text-brand-textDarkPrimary dark:text-brand-textPrimary border-gray-200 dark:border-gray-700'}
                                                    `}
                                                >
                                                    {isSelected && <Check size={12} />}
                                                    {room.name}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-3 w-full md:w-auto">
                                {editingTaskId ? (
                                    <>
                                        <Button
                                            variant="primary"
                                            onClick={handleDelete}
                                            disabled={isSubmitting}
                                            className="flex-1 md:flex-none bg-red-500 hover:bg-red-600 focus:ring-red-500/20"
                                        >
                                            Delete
                                        </Button>
                                        <Button
                                            variant="primary"
                                            onClick={handleSave}
                                            disabled={isSubmitting}
                                            className="flex-1 md:flex-none"
                                        >
                                            {isSubmitting ? 'Updating...' : 'Update Task'}
                                        </Button>
                                    </>
                                ) : (
                                    <Button
                                        variant="primary"
                                        onClick={handleSave}
                                        disabled={isSubmitting}
                                        className="w-full md:w-auto"
                                    >
                                        {isSubmitting ? 'Creating...' : 'Create Task'}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT PANEL: Calendar & List */}
                <div className="lg:col-span-1 flex flex-col h-auto lg:h-full lg:overflow-hidden p-4 lg:pr-6 lg:py-6 lg:pl-0">
                    <div className="card-base h-auto lg:h-full flex flex-col overflow-hidden">

                        {/* Calendar Header */}
                        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-brand-textDarkPrimary dark:text-brand-textPrimary flex items-center gap-2">
                                    <CalendarIcon size={18} className="text-brand-accent" />
                                    {calendarBaseDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                                </h3>
                                <div className="flex gap-1">
                                    <button onClick={() => handleWeekNav('prev')} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                                        <ChevronLeft size={20} />
                                    </button>
                                    <button onClick={() => handleWeekNav('next')} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                                        <ChevronRight size={20} />
                                    </button>
                                </div>
                            </div>

                            {/* Week Strip (Desktop: 5 days, Mobile: 1 day logic handled by CSS/Container queries if needed, but here we stick to 5 for simplicity as requested "5 days per week on widescreen") */}
                            <div className="grid grid-cols-5 gap-1">
                                {weekDays.map(date => {
                                    const dateStr = toDateString(date);
                                    const isSelected = selectedDate === dateStr;
                                    const isToday = dateStr === toDateString(new Date());

                                    return (
                                        <button
                                            key={dateStr}
                                            onClick={() => setSelectedDate(dateStr)}
                                            className={`
                                                flex flex-col items-center justify-center p-2 rounded-lg transition-all
                                                ${isSelected
                                                    ? 'bg-brand-accent/10 dark:bg-brand-accent/20'
                                                    : 'hover:bg-gray-50 dark:hover:bg-gray-800'}
                                            `}
                                        >
                                            <span className={`text-xs font-medium ${isToday ? 'text-brand-accent' : 'text-gray-500'}`}>
                                                {date.toLocaleDateString('en-US', { weekday: 'short' })}
                                            </span>
                                            <span className={`
                                                text-sm font-bold mt-1 px-2 py-0.5 rounded-full border-b-2
                                                ${isSelected
                                                    ? 'text-brand-accent border-brand-accent'
                                                    : 'text-brand-textDarkPrimary dark:text-brand-textPrimary border-transparent'}
                                            `}>
                                                {date.getDate()}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Task List */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar min-h-[300px] lg:min-h-0">
                            <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">
                                Tasks for {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </h4>

                            {filteredTasks.length === 0 ? (
                                <div className="text-center py-8 text-gray-400 italic text-sm">
                                    No tasks scheduled.
                                </div>
                            ) : (
                                filteredTasks.map((task, index) => (
                                    <div
                                        key={task.id}
                                        onClick={() => handleEditClick(task)}
                                        className={`
                                            group relative p-3 rounded-xl border-[3px] transition-all cursor-pointer
                                            ${editingTaskId === task.id
                                                ? 'border-brand-accent bg-brand-accent/5'
                                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-brand-lightSurface dark:bg-brand-darkSurface'}
                                        `}
                                    >
                                        <div className="flex justify-between items-start gap-2">
                                            <h5 className="font-bold text-sm text-brand-textDarkPrimary dark:text-brand-textPrimary line-clamp-2">
                                                {task.title}
                                            </h5>

                                            {/* Reorder Controls */}
                                            <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                                                <button
                                                    onClick={() => handleReorder(task.id, 'up')}
                                                    disabled={index === 0}
                                                    className="p-0.5 hover:text-brand-accent disabled:opacity-30"
                                                >
                                                    <ArrowUp size={12} />
                                                </button>
                                                <button
                                                    onClick={() => handleReorder(task.id, 'down')}
                                                    disabled={index === filteredTasks.length - 1}
                                                    className="p-0.5 hover:text-brand-accent disabled:opacity-30"
                                                >
                                                    <ArrowDown size={12} />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-1 mt-2">
                                            {task.selectedRoomIds?.map(roomId => {
                                                const room = rooms.find(r => r.id === roomId);
                                                if (!room) return null;
                                                return (
                                                    <span
                                                        key={roomId}
                                                        className="text-[10px] px-1.5 py-0.5 rounded-md font-medium border"
                                                        style={{
                                                            borderColor: room.color,
                                                            color: room.color,
                                                            backgroundColor: `${room.color}15` // 10% opacity hex
                                                        }}
                                                    >
                                                        {room.name}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Footer with Create New Task Button */}
                        <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex justify-end">
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={resetForm}
                                icon={Plus}
                                disabled={!editingTaskId} // Optional: disable if already in create mode, or just let it reset
                                className={!editingTaskId ? 'opacity-50 cursor-not-allowed' : ''}
                            >
                                Create New Task
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
