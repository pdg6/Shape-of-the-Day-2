import React, { useState, useEffect } from 'react';
import { Calendar, Link as LinkIcon, Image as ImageIcon, Plus, Check, Upload, Loader, Trash2, AlertCircle } from 'lucide-react';
import { validateFile, sanitizeTaskData, isValidURL } from '../../utils/validation';
import { handleError, handleSuccess } from '../../utils/errorHandler';
import { toDateString } from '../../utils/dateHelpers';
import { collection, addDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { Classroom } from '../../types';

interface TaskDraft {
    id: number;
    title: string;
    description: string;
    linkURL: string;
    imageURL: string;
    startDate: string;
    endDate: string;
    selectedRoomIds: string[];
    isUploading: false;
}

export default function TaskManager() {
    const [rooms, setRooms] = useState<Classroom[]>([]);
    const [loadingRooms, setLoadingRooms] = useState(true);

    // State for the list of tasks being created
    const [tasks, setTasks] = useState<TaskDraft[]>([{
        id: Date.now(),
        title: '',
        description: '',
        linkURL: '',
        imageURL: '',
        startDate: toDateString(),
        endDate: toDateString(),
        selectedRoomIds: [],
        isUploading: false
    }]);

    const [isSubmitting, setIsSubmitting] = useState(false);

    // Fetch classrooms on mount
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
                // Fallback for demo if no classes found
                if (auth.currentUser.email === 'demo@teacher.com' || true) { // Always show demo class for now
                    setRooms([{
                        id: 'demo-class-123',
                        name: 'Period 1 - Demo',
                        teacherId: auth.currentUser.uid,
                        joinCode: '123456',
                        subject: 'Demo',
                        gradeLevel: '10',
                        color: '#3B82F6',
                        presentationSettings: { defaultView: 'grid', showTimeEstimates: true, allowStudentSorting: false }
                    }]);
                }
            } finally {
                setLoadingRooms(false);
            }
        };

        fetchClassrooms();
    }, []);

    // --- Task Management ---

    const addNewTask = () => {
        setTasks(prev => [...prev, {
            id: Date.now(),
            title: '',
            description: '',
            linkURL: '',
            imageURL: '',
            startDate: toDateString(),
            endDate: toDateString(),
            selectedRoomIds: [],
            isUploading: false
        }]);
    };

    const removeTask = (taskId: number) => {
        if (tasks.length === 1) return; // Prevent removing the last card
        setTasks(prev => prev.filter(t => t.id !== taskId));
    };

    const updateTask = (taskId: number, field: keyof TaskDraft, value: any) => {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, [field]: value } : t));
    };

    const toggleRoomForTask = (taskId: number, roomId: string) => {
        setTasks(prev => prev.map(t => {
            if (t.id !== taskId) return t;
            const currentRooms = t.selectedRoomIds;
            const newRooms = currentRooms.includes(roomId)
                ? currentRooms.filter(id => id !== roomId)
                : [...currentRooms, roomId];
            return { ...t, selectedRoomIds: newRooms };
        }));
    };

    // --- File Upload Logic ---

    const convertFileToDataUrl = (file: File): Promise<string> => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });

    const handleFileUpload = async (taskId: number, file: File) => {
        if (!file) return;

        // Validate file before upload
        const validation = validateFile(file);
        if (!validation.valid) {
            handleError(new Error(validation.errors[0]), validation.errors.join(', '));
            return;
        }

        updateTask(taskId, 'isUploading', true);

        try {
            const dataUrl = await convertFileToDataUrl(file);
            if (file.type.startsWith('image/')) {
                updateTask(taskId, 'imageURL', dataUrl);
            } else {
                updateTask(taskId, 'linkURL', dataUrl);
            }
            handleSuccess('Attachment added successfully!');
        } catch (error) {
            handleError(error, 'Unable to read file. Please try again.');
        } finally {
            updateTask(taskId, 'isUploading', false);
        }
    };

    const handlePaste = (e: React.ClipboardEvent, taskId: number) => {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const blob = items[i].getAsFile();
                if (blob) handleFileUpload(taskId, blob);
                e.preventDefault();
            }
        }
    };

    // --- Submission Logic ---

    const handleDistributeAll = async () => {
        if (!auth.currentUser) {
            handleError(new Error("Not authenticated"));
            return;
        }

        // Validation
        const invalidTasks = tasks.filter(t => !t.title.trim() || t.selectedRoomIds.length === 0);
        if (invalidTasks.length > 0) {
            handleError(new Error('Validation failed'), 'Please ensure all tasks have a title and at least one assigned class.');
            return;
        }

        // Validate URLs
        for (const task of tasks) {
            if (task.linkURL && !isValidURL(task.linkURL)) {
                handleError(new Error('Invalid URL'), `Invalid link URL in task: ${task.title || 'Untitled'}`);
                return;
            }
            if (task.imageURL && !isValidURL(task.imageURL)) {
                handleError(new Error('Invalid URL'), `Invalid image URL in task: ${task.title || 'Untitled'}`);
                return;
            }
        }

        setIsSubmitting(true);
        try {
            const batchPromises = tasks.flatMap(task => {
                const sanitizedTask = sanitizeTaskData(task);

                // Create a task document for each assigned room (or one shared task if preferred, but separate allows per-class customization later)
                // For this implementation, we'll create separate tasks to keep it simple and robust.
                return task.selectedRoomIds.map(roomId => {
                    return addDoc(collection(db, 'tasks'), {
                        teacherId: auth.currentUser!.uid,
                        classroomId: roomId, // Explicitly link to classroom
                        title: sanitizedTask.title,
                        description: sanitizedTask.description,
                        linkURL: sanitizedTask.linkURL,
                        imageURL: sanitizedTask.imageURL,
                        startDate: task.startDate,
                        endDate: task.endDate,
                        type: 'assignment', // Default type
                        createdAt: serverTimestamp(),
                        status: 'published'
                    });
                });
            });

            await Promise.all(batchPromises);

            setTasks([{
                id: Date.now(),
                title: '',
                description: '',
                linkURL: '',
                imageURL: '',
                startDate: toDateString(),
                endDate: toDateString(),
                selectedRoomIds: [],
                isUploading: false
            }]);

            handleSuccess('All tasks distributed successfully!');
        } catch (error) {
            handleError(error, 'Failed to distribute tasks. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="h-full flex flex-col md:flex-row gap-6 overflow-hidden animate-in fade-in duration-500">

            {/* LEFT: Task Builder Area */}
            <div className="flex-1 flex flex-col overflow-hidden">
                <div className="mb-6 shrink-0">
                    <h2 className="text-2xl font-bold text-brand-textDarkPrimary dark:text-brand-textPrimary">Task Builder</h2>
                    <p className="text-brand-textDarkSecondary dark:text-brand-textSecondary">Create multiple tasks and assign them to specific classes.</p>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 space-y-6 pb-20 custom-scrollbar">
                    {tasks.map((task, index) => (
                        <div
                            key={task.id}
                            className="bg-brand-lightSurface dark:bg-brand-darkSurface rounded-xl shadow-sm border-[3px] border-gray-200 dark:border-gray-700 overflow-hidden transition-colors"
                            onPaste={(e) => handlePaste(e, task.id)}
                        >
                            {/* Card Header */}
                            <div className="bg-gray-50 dark:bg-gray-800 px-6 py-3 border-b-[3px] border-gray-200 dark:border-gray-700 flex justify-between items-center">
                                <span className="font-bold text-brand-textDarkSecondary dark:text-brand-textSecondary text-sm uppercase tracking-wider">Task {index + 1}</span>
                                {tasks.length > 1 && (
                                    <button
                                        onClick={() => removeTask(task.id)}
                                        className="text-gray-400 hover:text-red-500 transition-colors"
                                        title="Remove Task"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                )}
                            </div>

                            <div className="p-6 space-y-6">
                                {/* Title & Description */}
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-brand-textDarkSecondary dark:text-brand-textSecondary uppercase mb-1">Title</label>
                                        <input
                                            type="text"
                                            value={task.title}
                                            onChange={e => updateTask(task.id, 'title', e.target.value)}
                                            className="w-full p-2 bg-gray-50 dark:bg-gray-900 border-[3px] border-gray-200 dark:border-gray-700 rounded-lg focus:border-brand-accent outline-none font-medium text-brand-textDarkPrimary dark:text-brand-textPrimary placeholder-gray-400 transition-colors"
                                            placeholder="e.g. Read Chapter 4"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-brand-textDarkSecondary dark:text-brand-textSecondary uppercase mb-1">Description</label>
                                        <textarea
                                            value={task.description}
                                            onChange={e => updateTask(task.id, 'description', e.target.value)}
                                            className="w-full p-2 bg-gray-50 dark:bg-gray-900 border-[3px] border-gray-200 dark:border-gray-700 rounded-lg focus:border-brand-accent outline-none h-20 text-sm text-brand-textDarkPrimary dark:text-brand-textPrimary placeholder-gray-400 transition-colors"
                                            placeholder="Instructions... (Paste image to upload)"
                                        />
                                    </div>
                                </div>

                                {/* Media & Dates Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Media Inputs */}
                                    <div className="space-y-3">
                                        <label className="block text-xs font-bold text-brand-textDarkSecondary dark:text-brand-textSecondary uppercase">Attachments</label>

                                        {/* File Upload Box */}
                                        <div className="relative border-[3px] border-dashed border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-brand-accent transition-colors text-center group">
                                            <input
                                                type="file"
                                                onChange={(e) => e.target.files && handleFileUpload(task.id, e.target.files[0])}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            />
                                            <div className="flex items-center justify-center gap-2 text-gray-400 group-hover:text-brand-accent transition-colors">
                                                {task.isUploading ? <Loader size={16} className="animate-spin" /> : <Upload size={16} />}
                                                <span className="text-xs font-medium">{task.isUploading ? 'Uploading...' : 'Upload File / Image'}</span>
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            <div className="flex-1 relative">
                                                <LinkIcon size={14} className="absolute left-2.5 top-3 text-gray-400" />
                                                <input
                                                    type="url"
                                                    value={task.linkURL}
                                                    onChange={e => updateTask(task.id, 'linkURL', e.target.value)}
                                                    className="w-full pl-8 p-2 text-xs bg-gray-50 dark:bg-gray-900 border-[3px] border-gray-200 dark:border-gray-700 rounded-lg text-brand-textDarkPrimary dark:text-brand-textPrimary placeholder-gray-400 focus:border-brand-accent outline-none transition-colors"
                                                    placeholder="Link URL"
                                                />
                                            </div>
                                            <div className="flex-1 relative">
                                                <ImageIcon size={14} className="absolute left-2.5 top-3 text-gray-400" />
                                                <input
                                                    type="url"
                                                    value={task.imageURL}
                                                    onChange={e => updateTask(task.id, 'imageURL', e.target.value)}
                                                    className="w-full pl-8 p-2 text-xs bg-gray-50 dark:bg-gray-900 border-[3px] border-gray-200 dark:border-gray-700 rounded-lg text-brand-textDarkPrimary dark:text-brand-textPrimary placeholder-gray-400 focus:border-brand-accent outline-none transition-colors"
                                                    placeholder="Image URL"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Date Inputs */}
                                    <div className="space-y-3">
                                        <label className="block text-xs font-bold text-brand-textDarkSecondary dark:text-brand-textSecondary uppercase">Schedule</label>
                                        <div className="flex gap-2">
                                            <div className="flex-1">
                                                <span className="text-[10px] text-gray-400 block mb-1">Start</span>
                                                <input
                                                    type="date"
                                                    value={task.startDate}
                                                    onChange={e => updateTask(task.id, 'startDate', e.target.value)}
                                                    className="w-full p-1.5 text-sm bg-gray-50 dark:bg-gray-900 border-[3px] border-gray-200 dark:border-gray-700 rounded-lg text-brand-textDarkPrimary dark:text-brand-textPrimary focus:border-brand-accent outline-none transition-colors"
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <span className="text-[10px] text-gray-400 block mb-1">End</span>
                                                <input
                                                    type="date"
                                                    value={task.endDate}
                                                    onChange={e => updateTask(task.id, 'endDate', e.target.value)}
                                                    className="w-full p-1.5 text-sm bg-gray-50 dark:bg-gray-900 border-[3px] border-gray-200 dark:border-gray-700 rounded-lg text-brand-textDarkPrimary dark:text-brand-textPrimary focus:border-brand-accent outline-none transition-colors"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Class Assignment Dropdown */}
                                <div className="pt-4 border-t-[3px] border-gray-200 dark:border-gray-700">
                                    <label className="block text-xs font-bold text-brand-textDarkSecondary dark:text-brand-textSecondary uppercase mb-2">Assign to Classes</label>

                                    {loadingRooms ? (
                                        <div className="flex items-center gap-2 text-sm text-gray-400">
                                            <Loader className="w-4 h-4 animate-spin" /> Loading classes...
                                        </div>
                                    ) : rooms.length === 0 ? (
                                        <p className="text-sm text-red-500 italic">No classes available.</p>
                                    ) : (
                                        <div className="flex flex-wrap gap-2">
                                            {rooms.map(room => {
                                                const isSelected = task.selectedRoomIds.includes(room.id);
                                                return (
                                                    <button
                                                        key={room.id}
                                                        onClick={() => toggleRoomForTask(task.id, room.id)}
                                                        className={`
                              flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all border-[3px]
                              ${isSelected
                                                                ? 'bg-brand-accent text-white border-brand-accent pr-2 shadow-md'
                                                                : 'bg-gray-50 dark:bg-gray-800 text-brand-textDarkPrimary dark:text-brand-textPrimary border-gray-200 dark:border-gray-700 hover:border-brand-accent hover:text-brand-accent'}
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
                            </div>
                        </div>
                    ))}

                    {/* Add Task Button */}
                    <button
                        onClick={addNewTask}
                        className="w-full py-4 border-[3px] border-gray-300 dark:border-gray-700 rounded-xl text-gray-400 font-bold hover:border-brand-accent hover:text-brand-accent hover:bg-brand-accent/5 transition-all flex items-center justify-center gap-2"
                    >
                        <Plus size={20} /> Add Another Task
                    </button>
                </div>
            </div>

            {/* RIGHT: Summary Sidebar */}
            <div className="w-full md:w-80 shrink-0 flex flex-col h-full">
                <div className="bg-brand-lightSurface dark:bg-brand-darkSurface rounded-xl shadow-sm border-[3px] border-gray-200 dark:border-gray-700 flex flex-col h-full overflow-hidden">
                    <div className="p-4 border-b-[3px] border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                        <h3 className="font-bold text-brand-textDarkPrimary dark:text-brand-textPrimary flex items-center gap-2">
                            <Calendar size={18} className="text-brand-accent" />
                            Summary
                        </h3>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                        {tasks.map((task, i) => (
                            <div key={task.id} className="text-sm border-b border-gray-200 dark:border-gray-700 last:border-0 pb-3 last:pb-0">
                                <div className="flex justify-between items-start mb-1">
                                    <span className="font-bold text-brand-textDarkPrimary dark:text-brand-textPrimary truncate w-3/4 block">
                                        {task.title || <span className="text-gray-400 italic">Untitled Task</span>}
                                    </span>
                                    <span className="text-xs font-mono text-gray-400">#{i + 1}</span>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                    {task.selectedRoomIds.length === 0 && (
                                        <span className="text-[10px] text-red-500 flex items-center gap-1">
                                            <AlertCircle size={10} /> No classes
                                        </span>
                                    )}
                                    {task.selectedRoomIds.map(rid => {
                                        const r = rooms.find(room => room.id === rid);
                                        return r ? (
                                            <span key={rid} className="text-[10px] bg-gray-100 dark:bg-gray-800 text-brand-textDarkPrimary dark:text-brand-textPrimary px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700">
                                                {r.name}
                                            </span>
                                        ) : null;
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="p-4 border-t-[3px] border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                        <button
                            onClick={handleDistributeAll}
                            disabled={isSubmitting}
                            className="w-full bg-brand-accent text-white py-3 rounded-lg font-bold border-2 border-brand-accent hover:bg-blue-600 hover:shadow-lg hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-300 ease-in-out flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader size={18} className="animate-spin" /> Distributing...
                                </>
                            ) : (
                                <>
                                    <Check size={18} /> Distribute All ({tasks.length})
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

        </div>
    );
}
