import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useClassStore } from '../../store/classStore';
import { useAuth } from '../../context/AuthContext';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { toDateString } from '../../utils/dateHelpers';
import { QRCodeSVG } from 'qrcode.react';
import {
    Users, ExternalLink, FolderOpen, FileText, ListChecks, CheckSquare,
    ChevronDown, ChevronUp, Calendar, ChevronLeft, ChevronRight, X,
    File, FileImage, FileVideo, FileAudio, FileSpreadsheet, Presentation, Link2, Image as ImageIcon
} from 'lucide-react';
import { ItemType, Attachment } from '../../types';
import { DayPicker, getDefaultClassNames } from 'react-day-picker';
import { format, parse, isValid } from 'date-fns';
import { createPortal } from 'react-dom';
import 'react-day-picker/style.css';

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
    status?: 'draft' | 'published' | 'done';
    // Hierarchy fields
    type: ItemType;
    parentId: string | null;
    rootId: string | null;
    path: string[];
    pathTitles: string[];
    childIds: string[];
    // Attachments
    attachments?: Attachment[];
}

// Get file icon based on MIME type
const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return FileImage;
    if (mimeType.startsWith('video/')) return FileVideo;
    if (mimeType.startsWith('audio/')) return FileAudio;
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType === 'text/csv') return FileSpreadsheet;
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return Presentation;
    if (mimeType === 'application/pdf') return FileText;
    return File;
};

// Get file icon color based on MIME type
const getFileIconColor = (mimeType: string): string => {
    if (mimeType.startsWith('image/')) return 'text-pink-500';
    if (mimeType.startsWith('video/')) return 'text-purple-500';
    if (mimeType.startsWith('audio/')) return 'text-cyan-500';
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType === 'text/csv') return 'text-green-500';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'text-orange-500';
    if (mimeType === 'application/pdf') return 'text-red-500';
    return 'text-gray-500';
};

// Extract domain from URL for display
const getUrlDomain = (url: string): string => {
    try {
        const hostname = new URL(url).hostname.replace('www.', '');
        // Special handling for known domains
        if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) return 'YouTube';
        if (hostname.includes('google.com')) return 'Google';
        if (hostname.includes('docs.google.com')) return 'Google Docs';
        if (hostname.includes('drive.google.com')) return 'Google Drive';
        if (hostname.includes('github.com')) return 'GitHub';
        if (hostname.includes('notion.')) return 'Notion';
        if (hostname.includes('canva.com')) return 'Canva';
        return hostname;
    } catch {
        return 'Link';
    }
};

// Check if description contains HTML
const containsHtml = (str: string): boolean => {
    return /<[a-z][\s\S]*>/i.test(str);
};

// Get type-specific icon
const getTypeIcon = (type: ItemType) => {
    switch (type) {
        case 'project': return FolderOpen;
        case 'assignment': return FileText;
        case 'task': return ListChecks;
        case 'subtask': return CheckSquare;
    }
};

// Get type color classes
const getTypeColorClasses = (type: ItemType): string => {
    switch (type) {
        case 'project': return 'text-purple-500 bg-purple-500/10 border-purple-500';
        case 'assignment': return 'text-blue-500 bg-blue-500/10 border-blue-500';
        case 'task': return 'text-green-500 bg-green-500/10 border-green-500';
        case 'subtask': return 'text-orange-500 bg-orange-500/10 border-orange-500';
    }
};

// Build a tree structure from flat tasks
interface TaskNode {
    task: Task;
    children: TaskNode[];
    depth: number;
}

const buildTaskTree = (tasks: Task[]): TaskNode[] => {
    const taskMap = new Map<string, TaskNode>();
    const roots: TaskNode[] = [];

    // First pass: create nodes
    tasks.forEach(task => {
        taskMap.set(task.id, { task, children: [], depth: 0 });
    });

    // Second pass: build hierarchy
    tasks.forEach(task => {
        const node = taskMap.get(task.id)!;
        if (task.parentId && taskMap.has(task.parentId)) {
            const parent = taskMap.get(task.parentId)!;
            parent.children.push(node);
            node.depth = parent.depth + 1;
        } else {
            roots.push(node);
        }
    });

    // Sort children by presentation order
    const sortNodes = (nodes: TaskNode[]) => {
        nodes.sort((a, b) => (a.task.presentationOrder || 0) - (b.task.presentationOrder || 0));
        nodes.forEach(node => sortNodes(node.children));
    };
    sortNodes(roots);

    return roots;
};

// Flatten tree for display (preserving depth info)
const flattenTree = (nodes: TaskNode[], depth = 0): TaskNode[] => {
    const result: TaskNode[] = [];
    nodes.forEach(node => {
        result.push({ ...node, depth });
        result.push(...flattenTree(node.children, depth + 1));
    });
    return result;
};

// Get hierarchical number like "1.2.1" for nested tasks
const getHierarchicalNumber = (task: Task, allTasks: Task[], forDate?: string): string => {
    // For root tasks with date filter, only count siblings on the same day
    const siblings = task.parentId
        ? allTasks.filter(t => t.parentId === task.parentId)
        : forDate
            ? allTasks.filter(t => !t.parentId && t.endDate === forDate)
            : allTasks.filter(t => !t.parentId);

    // Sort by presentation order
    siblings.sort((a, b) => (a.presentationOrder || 0) - (b.presentationOrder || 0));
    const myIndex = siblings.findIndex(t => t.id === task.id) + 1;

    if (!task.parentId) return String(myIndex);

    const parent = allTasks.find(t => t.id === task.parentId);
    if (!parent) return String(myIndex);

    return `${getHierarchicalNumber(parent, allTasks, forDate)}.${myIndex}`;
};

// Task card component with indentation and hierarchy info
interface TaskCardProps {
    task: Task;
    depth: number;
    allTasks: Task[];
    today: string;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, depth, allTasks, today }) => {
    const TypeIcon = getTypeIcon(task.type || 'task');
    const typeColors = getTypeColorClasses(task.type || 'task');
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
    const hierarchicalNumber = getHierarchicalNumber(task, allTasks, today);
    const indent = depth * 24;

    // Separate image attachments from other files
    const imageAttachments = task.attachments?.filter(a => a.mimeType.startsWith('image/')) || [];
    const fileAttachments = task.attachments?.filter(a => !a.mimeType.startsWith('image/')) || [];
    const hasMedia = imageAttachments.length > 0 || fileAttachments.length > 0 || task.linkURL || task.imageURL;

    return (
        <div
            className="group bg-brand-lightSurface dark:bg-brand-darkSurface 
                border-2 border-gray-200 dark:border-gray-700 rounded-xl p-4 
                transition-all hover:border-brand-accent/50"
            style={{
                marginLeft: `${indent}px`,
                width: `calc(100% - ${indent}px)`
            }}
        >
            {/* Three-Column Layout */}
            <div className="flex gap-4">
                {/* Column 1: Number + Icon + Title */}
                <div className="flex-shrink-0 flex gap-3">
                    {/* Number Badge + Type Icon */}
                    <div className="flex flex-col items-end gap-1 w-8">
                        <span className="text-xs font-bold text-gray-400">
                            {hierarchicalNumber}
                        </span>
                        <div className={`
                            w-8 h-8 rounded-md border-2 
                            flex items-center justify-center
                            ${typeColors}
                        `}>
                            <TypeIcon size={14} />
                        </div>
                    </div>

                    {/* Title + Due Date */}
                    <div className="min-w-[180px] max-w-[250px]">
                        <h3 className="text-lg font-bold text-brand-textDarkPrimary dark:text-brand-textPrimary leading-tight">
                            {task.title}
                        </h3>
                        {task.endDate && (
                            <p className="text-sm text-gray-500 mt-0.5 font-medium">
                                {new Date(task.endDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                            </p>
                        )}
                    </div>
                </div>

                {/* Column 2: Description (fills available space) */}
                <div className="flex-1 min-w-0">
                    {task.description && (
                        <div className="space-y-2">
                            {/* Description - supports HTML or plain text */}
                            {containsHtml(task.description) ? (
                                <div
                                    className={`text-sm text-brand-textDarkSecondary dark:text-brand-textSecondary prose prose-sm dark:prose-invert max-w-none ${isDescriptionExpanded ? '' : 'line-clamp-3'}`}
                                    dangerouslySetInnerHTML={{ __html: task.description }}
                                />
                            ) : (
                                <div className={`text-sm text-brand-textDarkSecondary dark:text-brand-textSecondary whitespace-pre-wrap ${isDescriptionExpanded ? '' : 'line-clamp-3'}`}>
                                    {task.description}
                                </div>
                            )}
                            {task.description.length > 150 && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsDescriptionExpanded(!isDescriptionExpanded);
                                    }}
                                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-brand-accent transition-colors"
                                >
                                    {isDescriptionExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                    {isDescriptionExpanded ? 'Show less' : 'Show more'}
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Column 3: Resources (only shown if media exists) */}
                {hasMedia && (
                    <div className="flex-shrink-0 w-48 space-y-2">
                        {/* Image Thumbnails */}
                        {(imageAttachments.length > 0 || task.imageURL) && (
                            <div className="flex flex-wrap gap-1">
                                {/* Legacy imageURL */}
                                {task.imageURL && (
                                    <a
                                        href={task.imageURL}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block"
                                    >
                                        <img
                                            src={task.imageURL}
                                            alt=""
                                            className="w-12 h-12 object-cover rounded-lg border border-gray-200 dark:border-gray-700 hover:border-brand-accent transition-colors"
                                            loading="lazy"
                                        />
                                    </a>
                                )}
                                {/* Image attachments */}
                                {imageAttachments.map((img) => (
                                    <a
                                        key={img.id}
                                        href={img.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block"
                                        title={img.filename}
                                    >
                                        <img
                                            src={img.url}
                                            alt={img.filename}
                                            className="w-12 h-12 object-cover rounded-lg border border-gray-200 dark:border-gray-700 hover:border-brand-accent transition-colors"
                                            loading="lazy"
                                        />
                                    </a>
                                ))}
                            </div>
                        )}

                        {/* Resource Link */}
                        {task.linkURL && (
                            <a
                                href={task.linkURL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 px-2 py-1 rounded-lg
                                    bg-brand-accent/10 text-brand-accent border border-brand-accent/20
                                    text-xs font-medium hover:bg-brand-accent/20 transition-colors w-full"
                                title={task.linkURL}
                            >
                                <ExternalLink size={12} className="flex-shrink-0" />
                                <span className="truncate">{getUrlDomain(task.linkURL)}</span>
                            </a>
                        )}

                        {/* File Attachments */}
                        {fileAttachments.map((attachment) => {
                            const FileIcon = getFileIcon(attachment.mimeType);
                            const iconColor = getFileIconColor(attachment.mimeType);
                            return (
                                <a
                                    key={attachment.id}
                                    href={attachment.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`flex items-center gap-1.5 px-2 py-1 rounded-lg
                                        bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700
                                        text-xs font-medium hover:border-brand-accent transition-colors w-full`}
                                    title={`${attachment.filename} (${(attachment.size / 1024).toFixed(1)} KB)`}
                                >
                                    <FileIcon size={12} className={`flex-shrink-0 ${iconColor}`} />
                                    <span className="truncate text-gray-700 dark:text-gray-300">{attachment.filename}</span>
                                </a>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

interface ShapeOfDayProps {
    onNavigate?: (tab: 'tasks' | 'shape' | 'live' | 'reports' | 'classrooms', subTab?: string) => void;
}

const ShapeOfDay: React.FC<ShapeOfDayProps> = ({ onNavigate }) => {
    const { currentClassId, classrooms, activeStudentCount } = useClassStore();
    const { user } = useAuth();

    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);

    // Selected date for viewing - defaults to today
    const today = toDateString();
    const [selectedDate, setSelectedDate] = useState(today);

    // Date picker popover state
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [datePickerPosition, setDatePickerPosition] = useState({ top: 0, left: 0 });
    const dateButtonRef = useRef<HTMLButtonElement>(null);
    const datePopoverRef = useRef<HTMLDivElement>(null);

    // Parse selected date for display
    const parsedDate = parse(selectedDate, 'yyyy-MM-dd', new Date());
    const displayDateText = isValid(parsedDate) ? format(parsedDate, 'MMM d, yyyy') : selectedDate;

    // Update date picker position
    const updateDatePickerPosition = useCallback(() => {
        if (dateButtonRef.current) {
            const rect = dateButtonRef.current.getBoundingClientRect();
            setDatePickerPosition({
                top: rect.bottom + window.scrollY + 4,
                left: rect.left + window.scrollX
            });
        }
    }, []);

    // Handle click outside date picker
    useEffect(() => {
        if (!isDatePickerOpen) return;

        const handleClickOutside = (e: MouseEvent) => {
            if (
                datePopoverRef.current &&
                !datePopoverRef.current.contains(e.target as Node) &&
                dateButtonRef.current &&
                !dateButtonRef.current.contains(e.target as Node)
            ) {
                setIsDatePickerOpen(false);
            }
        };

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsDatePickerOpen(false);
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isDatePickerOpen]);

    // Handle date selection
    const handleDateSelect = (date: Date | undefined) => {
        if (date) {
            setSelectedDate(format(date, 'yyyy-MM-dd'));
            setIsDatePickerOpen(false);
        }
    };

    // --- Data Fetching ---
    useEffect(() => {
        if (!currentClassId || !user) {
            setTasks([]);
            setLoading(false);
            return;
        }

        const q = query(
            collection(db, 'tasks'),
            where('selectedRoomIds', 'array-contains', currentClassId)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const taskData: Task[] = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                // Filter by selected date range and exclude drafts
                if (selectedDate >= (data.startDate || '') && selectedDate <= (data.endDate || selectedDate) && data.status !== 'draft') {
                    taskData.push({
                        id: doc.id,
                        ...data,
                        type: data.type || 'task',
                        parentId: data.parentId || null,
                        rootId: data.rootId || null,
                        path: data.path || [],
                        pathTitles: data.pathTitles || [],
                        childIds: data.childIds || [],
                        status: data.status,
                        attachments: data.attachments || [],
                    } as Task);
                }
            });

            taskData.sort((a, b) => (a.presentationOrder || 0) - (b.presentationOrder || 0));

            setTasks(taskData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching tasks for Shape of the Day:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [currentClassId, user, selectedDate]);

    // Build hierarchical structure
    const taskTree = useMemo(() => buildTaskTree(tasks), [tasks]);

    // Flatten for display - always show all children (no collapse)
    const displayTasks = useMemo(() => {
        const flatten = (nodes: TaskNode[], depth = 0): TaskNode[] => {
            const result: TaskNode[] = [];
            nodes.forEach(node => {
                result.push({ ...node, depth });
                // Always include children (no collapse)
                if (node.children.length > 0) {
                    result.push(...flatten(node.children, depth + 1));
                }
            });
            return result;
        };
        return flatten(taskTree);
    }, [taskTree]);

    const currentClass = classrooms.find(c => c.id === currentClassId);

    if (!currentClass) {
        return (
            <div className="flex items-center justify-center h-full text-gray-500">
                Please select a class to view the Shape of the Day.
            </div>
        );
    }

    const joinUrl = `${window.location.origin}/join`;

    return (
        <div className="h-full flex flex-col space-y-3 overflow-y-auto custom-scrollbar p-1 pt-4">

            {/* --- HEADER CARD (Compact) --- */}
            <div className="w-full bg-brand-lightSurface dark:bg-brand-darkSurface rounded-xl flex-shrink-0">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6">

                    {/* Left: Class Identity */}
                    <div className="flex-1 flex flex-col justify-center">
                        <div className="flex items-center gap-3 mb-1">
                            {/* Date Picker Button - accent styled */}
                            <button
                                ref={dateButtonRef}
                                onClick={() => {
                                    updateDatePickerPosition();
                                    setIsDatePickerOpen(!isDatePickerOpen);
                                }}
                                className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-brand-accent/10 text-brand-accent text-fluid-md font-bold uppercase tracking-wider border border-brand-accent/20 hover:bg-brand-accent/20 transition-colors cursor-pointer"
                            >
                                <Calendar size={12} />
                                {displayDateText}
                            </button>

                            {/* Date Picker Popover */}
                            {typeof document !== 'undefined' && isDatePickerOpen && createPortal(
                                <div
                                    ref={datePopoverRef}
                                    className="fixed z-[9999] bg-brand-lightSurface dark:bg-brand-darkSurface border-2 border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-3 animate-fade-in"
                                    style={{
                                        top: datePickerPosition.top,
                                        left: datePickerPosition.left,
                                    }}
                                >
                                    {/* Today Button */}
                                    <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedDate(format(new Date(), 'yyyy-MM-dd'));
                                                setIsDatePickerOpen(false);
                                            }}
                                            className="text-xs font-medium text-brand-accent hover:text-brand-accent/80 transition-colors"
                                        >
                                            Today
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setIsDatePickerOpen(false)}
                                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>

                                    {/* Calendar */}
                                    <DayPicker
                                        mode="single"
                                        selected={isValid(parsedDate) ? parsedDate : undefined}
                                        onSelect={handleDateSelect}
                                        defaultMonth={isValid(parsedDate) ? parsedDate : new Date()}
                                        components={{
                                            Chevron: ({ orientation }) =>
                                                orientation === 'left'
                                                    ? <ChevronLeft size={16} />
                                                    : <ChevronRight size={16} />,
                                        }}
                                        classNames={{
                                            ...getDefaultClassNames(),
                                            root: `${getDefaultClassNames().root} rdp-custom`,
                                            disabled: 'text-gray-300 dark:text-gray-600 cursor-not-allowed',
                                            outside: 'text-gray-300 dark:text-gray-600 opacity-50',
                                            chevron: 'fill-gray-500 dark:fill-gray-400',
                                        }}
                                    />
                                </div>,
                                document.body
                            )}
                            <button
                                onClick={() => onNavigate?.('live', 'students')}
                                className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-fluid-md font-bold border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors cursor-pointer"
                            >
                                <Users size={12} />
                                <span>{activeStudentCount} Active</span>
                            </button>
                        </div>
                        <h1 className="text-fluid-3xl font-black text-brand-textDarkPrimary dark:text-brand-textPrimary tracking-tight leading-tight">
                            {currentClass.name}
                        </h1>
                    </div>

                    {/* Right: Connection Info (Compact) */}
                    <div className="flex-shrink-0 flex items-center gap-4">
                        <div className="text-right">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">Join at</p>
                            <p className="text-base font-medium text-brand-textDarkPrimary dark:text-brand-textPrimary mb-2 flex items-center justify-end gap-1">
                                shapeoftheday.app/join
                            </p>

                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">Class Code</p>
                            <div className="text-3xl font-mono font-black text-brand-accent tracking-widest leading-none">
                                {currentClass.joinCode}
                            </div>
                        </div>

                        {/* QR Code */}
                        <div className="bg-white p-1.5 rounded-lg shadow-sm border border-gray-100">
                            <QRCodeSVG
                                value={`${joinUrl}?code=${currentClass.joinCode}`}
                                size={80}
                                level="H"
                                fgColor="#000000"
                                bgColor="#ffffff"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* --- TASK STREAM (Hierarchical) --- */}
            <div className="space-y-3 pb-4">
                {loading ? (
                    <div className="text-center py-12 text-gray-400">Loading schedule...</div>
                ) : displayTasks.length === 0 ? (
                    <div className="text-center py-12 text-gray-400 italic bg-brand-lightSurface dark:bg-brand-darkSurface rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                        No tasks scheduled for this date.
                    </div>
                ) : (
                    displayTasks.map((node) => {
                        return (
                            <TaskCard
                                key={node.task.id}
                                task={node.task}
                                depth={node.depth}
                                allTasks={tasks}
                                today={selectedDate}
                            />
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default ShapeOfDay;
