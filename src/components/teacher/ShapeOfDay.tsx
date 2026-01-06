import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useClassStore } from '../../store/appSettings';
import { useAuth } from '../../context/auth-context';
import { subscribeToClassroomTasks } from '../../services/firestoreService';
import { toDateString } from '../../utils/dateHelpers';
import { QRCodeSVG } from 'qrcode.react';
import {
    Users, ExternalLink, FileText, ChevronDown, ChevronUp,
    File, FileImage, FileVideo, FileAudio, FileSpreadsheet, Presentation,
    Maximize2, Minimize2, Pencil
} from 'lucide-react';
import {
    getFileIcon,
    getFileIconColor,
    getUrlDomain,
    containsHtml,
    getTypeBorderColor
} from '../../utils/uiHelpers';
import { ItemType, Task, TaskStatus } from '../../types';
import { format, parse, isValid } from 'date-fns';
import { CodeBlockRenderer } from '../shared/CodeBlockRenderer';
import { DatePicker } from '../shared/DatePicker';
import { getHierarchicalNumber } from '../../utils/taskHierarchy';


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


// Task card component with indentation and hierarchy info
interface TaskCardProps {
    task: Task;
    depth: number;
    allTasks: Task[];
    today: string;
    onEdit?: (taskId: string) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, depth, allTasks, today, onEdit }) => {
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
    const [showEditButton, setShowEditButton] = useState(false);
    const editButtonTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const hierarchicalNumber = getHierarchicalNumber(task, allTasks, today);
    const indent = depth * 32; // Increased from 24 for better hierarchy visualization

    // Handle hover enter on number/title area
    const handleHoverEnter = () => {
        if (editButtonTimeoutRef.current) {
            clearTimeout(editButtonTimeoutRef.current);
            editButtonTimeoutRef.current = null;
        }
        setShowEditButton(true);
    };

    // Handle hover leave - keep visible for 3 seconds
    const handleHoverLeave = () => {
        editButtonTimeoutRef.current = setTimeout(() => {
            setShowEditButton(false);
        }, 3000);
    };

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (editButtonTimeoutRef.current) {
                clearTimeout(editButtonTimeoutRef.current);
            }
        };
    }, []);

    const typeBorderColor = getTypeBorderColor(task.type || 'task');

    // Separate image attachments from other files
    const imageAttachments = task.attachments?.filter(a => a.mimeType.startsWith('image/')) || [];
    const fileAttachments = task.attachments?.filter(a => !a.mimeType.startsWith('image/')) || [];
    const hasMedia = imageAttachments.length > 0 || fileAttachments.length > 0 || task.linkURL || task.imageURL || (task.links && task.links.length > 0);

    // Calculate child tasks for progress bar
    const childTasks = allTasks.filter(t => t.parentId === task.id);
    const completedChildren = childTasks.filter(t => t.status === 'done').length;
    const hasChildren = childTasks.length > 0;

    return (
        <div
            className={`group bg-(--color-bg-tile) tile-blur
                border border-border-subtle rounded-2xl p-5
                border-l-4 ${typeBorderColor}
                transition-float shadow-layered
                hover:border-brand-accent hover:shadow-layered-lg
                relative select-none
                ${task.status === 'done' ? 'opacity-60 shadow-layered-sm' : ''}`}
            style={{
                marginLeft: `${indent}px`,
                width: `calc(100% - ${indent}px)`
            }}
            onDoubleClick={(e) => {
                // Only toggle expand if not clicking on interactive elements
                const target = e.target as HTMLElement;
                const isInteractive = target.closest('a, button, input, [role="button"]');
                if (!isInteractive) {
                    e.preventDefault(); // Prevent text selection
                    setIsDescriptionExpanded(!isDescriptionExpanded);
                }
            }}
            role="article"
            aria-label={`Task: ${task.title}`}
        >
            {/* Expand/Collapse Toggle - Top Right */}
            {((task.description && task.description.length > 150) || hasMedia) && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsDescriptionExpanded(!isDescriptionExpanded);
                    }}
                    className="absolute top-3 right-3 p-1.5 rounded-lg z-20
                        text-brand-textSecondary hover:text-brand-accent hover:bg-brand-accent/10
                        transition-colors opacity-0 group-hover:opacity-100"
                    style={{ opacity: isDescriptionExpanded ? 1 : undefined }}
                    title={isDescriptionExpanded ? 'Collapse' : 'Expand'}
                >
                    {isDescriptionExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                </button>
            )}

            {/* Horizontal Layout: Number + Title + Date */}
            <div className="flex gap-4">
                {/* Number with Edit Button below - hover triggers edit button */}
                <div
                    className="flex flex-col items-center gap-1 cursor-pointer"
                    onMouseEnter={handleHoverEnter}
                    onMouseLeave={handleHoverLeave}
                >
                    <span className={`text-xl font-black text-brand-textPrimary leading-tight
                        underline decoration-2 underline-offset-4
                        ${task.type === 'project' ? 'decoration-[var(--type-project-color)]' : ''}
                        ${task.type === 'assignment' ? 'decoration-[var(--type-assignment-color)]' : ''}
                        ${task.type === 'task' || !task.type ? 'decoration-[var(--type-task-color)]' : ''}
                        ${task.type === 'subtask' ? 'decoration-brand-accent' : ''}
                    `}>
                        {hierarchicalNumber}
                    </span>
                    {/* Edit button - shows on hover for 3 seconds */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onEdit?.(task.id);
                        }}
                        className={`p-1 rounded-md text-brand-textSecondary hover:text-brand-accent hover:bg-brand-accent/10 
                            transition-all duration-200 ${showEditButton ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                        title="Edit task"
                    >
                        <Pencil size={14} />
                    </button>
                </div>

                {/* Title + Description + Resources */}
                <div className="flex-1 min-w-0">
                    {/* Title + Due Date Row */}
                    <div className="flex items-baseline gap-3">
                        <h3 className={`text-xl font-black text-brand-textPrimary leading-tight
                            ${task.status === 'done' ? 'line-through decoration-2 decoration-brand-textSecondary' : ''}`}>
                            {task.title}
                        </h3>
                        {task.endDate && (
                            <span className="text-sm text-brand-textSecondary font-medium shrink-0">
                                {task.endDate === today
                                    ? 'Due Today'
                                    : `Due ${new Date(task.endDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`
                                }
                            </span>
                        )}
                    </div>

                    {/* Progress Bar for Parent Tasks */}
                    {hasChildren && (
                        <div className="mt-2">
                            <div className="flex items-center gap-2 text-xs text-brand-textSecondary">
                                <span className="font-medium">{completedChildren}/{childTasks.length} complete</span>
                            </div>
                            <div className="mt-1 h-1.5 bg-tile-alt rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-brand-accent rounded-full transition-all duration-300"
                                    style={{ width: `${childTasks.length > 0 ? (completedChildren / childTasks.length) * 100 : 0}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Description - text selectable */}
                    {task.description && (
                        <div className="mt-2 select-text overflow-hidden min-w-0 w-full">
                            {/* Description - supports HTML or plain text */}
                            {containsHtml(task.description) ? (
                                <CodeBlockRenderer
                                    key={`desc-${task.id}-${isDescriptionExpanded}`}
                                    html={task.description}
                                    isExpanded={isDescriptionExpanded}
                                />
                            ) : (
                                <div className={`text-base text-brand-textSecondary whitespace-pre-wrap ${isDescriptionExpanded ? '' : 'line-clamp-3'}`}>
                                    {task.description}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Resources Row - Below Description, only shown when expanded */}
                    {hasMedia && isDescriptionExpanded && (
                        <div className="mt-4">
                            <div className="flex flex-wrap items-center gap-3">
                                {/* Image Thumbnails - Larger */}
                                {task.imageURL && (
                                    <a
                                        href={task.imageURL}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block"
                                        onClick={(e) => e.stopPropagation()}
                                        title="View image"
                                    >
                                        <img
                                            src={task.imageURL}
                                            alt=""
                                            className="w-20 h-20 object-cover rounded-lg border-2 border-border-subtle hover:border-brand-accent transition-colors"
                                            loading="lazy"
                                        />
                                    </a>
                                )}
                                {imageAttachments.map((img) => (
                                    <a
                                        key={img.id}
                                        href={img.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block"
                                        title={img.filename}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <img
                                            src={img.url}
                                            alt={img.filename}
                                            className="w-20 h-20 object-cover rounded-lg border-2 border-border-subtle hover:border-brand-accent transition-colors"
                                            loading="lazy"
                                        />
                                    </a>
                                ))}

                                {/* Resource Links - Multiple links support */}
                                {(task.links && task.links.length > 0) ? (
                                    task.links.map((link) => (
                                        <a
                                            key={link.id}
                                            href={link.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 px-3 py-2 rounded-lg
                                                bg-brand-accent/5 border border-brand-accent/20
                                                hover:bg-brand-accent/10 transition-colors"
                                            title={link.url}
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <ExternalLink size={16} className="text-brand-accent shrink-0" />
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-sm font-medium text-brand-textPrimary truncate">
                                                    {link.title || getUrlDomain(link.url)}
                                                </span>
                                                {link.title && (
                                                    <span className="text-xs text-brand-textSecondary">
                                                        {getUrlDomain(link.url)}
                                                    </span>
                                                )}
                                            </div>
                                        </a>
                                    ))
                                ) : task.linkURL && (
                                    /* Legacy single link fallback */
                                    <a
                                        href={task.linkURL}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 px-3 py-2 rounded-lg
                                            bg-brand-accent/5 border border-brand-accent/20
                                            hover:bg-brand-accent/10 transition-colors"
                                        title={task.linkURL}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <ExternalLink size={16} className="text-brand-accent shrink-0" />
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-sm font-medium text-brand-textPrimary truncate">
                                                {task.linkTitle || getUrlDomain(task.linkURL)}
                                            </span>
                                            {task.linkTitle && (
                                                <span className="text-xs text-brand-textSecondary">
                                                    {getUrlDomain(task.linkURL)}
                                                </span>
                                            )}
                                        </div>
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
                                            className="flex items-center gap-2 px-3 py-2 rounded-lg
                                                bg-(--color-bg-tile-hover) border-2 border-border-subtle
                                                text-sm font-medium hover:border-brand-accent hover:shadow-lg transition-all"
                                            title={`${attachment.filename} (${(attachment.size / 1024).toFixed(1)} KB)`}
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <FileIcon size={16} className={`shrink-0 ${iconColor}`} />
                                            <span className="truncate max-w-[150px] text-brand-textPrimary">{attachment.filename}</span>
                                        </a>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};


interface ShapeOfDayProps {
    onNavigate?: (tab: 'tasks' | 'shape' | 'live' | 'reports' | 'classrooms', subTab?: string) => void;
    selectedDate?: string;
    onDateChange?: (date: string) => void;
}

const ShapeOfDay: React.FC<ShapeOfDayProps> = ({ onNavigate, selectedDate: propSelectedDate, onDateChange }) => {
    const { currentClassId, classrooms, activeStudentCount } = useClassStore();
    const { user } = useAuth();

    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);

    // Selected date for viewing - use prop if provided, otherwise internal state
    const today = toDateString();
    const [internalSelectedDate, setInternalSelectedDate] = useState(today);
    const selectedDate = propSelectedDate ?? internalSelectedDate;
    const setSelectedDate = onDateChange ?? setInternalSelectedDate;


    // Presentation mode state
    const [isFullscreen, setIsFullscreen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Parse selected date for display
    const parsedDate = parse(selectedDate, 'yyyy-MM-dd', new Date());


    // Toggle fullscreen mode
    const toggleFullscreen = useCallback(() => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen().catch(err => {
                console.warn('Could not enter fullscreen:', err);
            });
        } else {
            document.exitFullscreen();
        }
    }, []);

    // Track fullscreen state changes
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // Note: Keyboard navigation useEffect is defined after displayTasks

    // --- Data Fetching ---
    useEffect(() => {
        if (!currentClassId || !user) {
            setTasks([]);
            setLoading(false);
            return;
        }

        const unsubscribe = subscribeToClassroomTasks(currentClassId, (tasks) => {
            const taskData: Task[] = [];
            tasks.forEach(data => {
                // Tightened Filter: Must have both dates, and within range
                const startDate = data.startDate || '';
                const endDate = data.endDate || '';

                const isInRange = selectedDate >= startDate && selectedDate <= endDate;
                const isPublished = data.status !== 'draft';

                if (startDate && endDate && isInRange && isPublished) {
                    taskData.push({
                        ...data,
                        type: data.type || 'task',
                        parentId: data.parentId || null,
                        rootId: data.rootId || null,
                        path: data.path || [],
                        pathTitles: data.pathTitles || [],
                        childIds: data.childIds || [],
                        status: (data.status as TaskStatus) || 'todo',
                        attachments: data.attachments || [],
                    } as Task);
                }
            });

            // Sorting is now handled by the service (orderBy presentationOrder)
            setTasks(taskData);
            setLoading(false);
        }, user.uid);

        return () => unsubscribe();
    }, [currentClassId, user, selectedDate]);

    // Build hierarchical structure
    const taskTree = useMemo(() => buildTaskTree(tasks), [tasks]);

    // Flatten for display - sort all root tasks by presentation order, always show all children (no collapse)
    const displayTasks = useMemo(() => {
        // Sort all root nodes by presentation order strictly
        const sortedRoots = [...taskTree].sort((a, b) => (a.task.presentationOrder || 0) - (b.task.presentationOrder || 0));

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
        return flatten(sortedRoots);
    }, [taskTree, selectedDate]);

    // Keyboard shortcuts for presentation mode
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.target as HTMLElement).tagName === 'INPUT') return;

            switch (e.key) {
                case 'Escape':
                    if (isFullscreen) {
                        document.exitFullscreen();
                    }
                    break;
                case 'f':
                    // Toggle fullscreen with 'f' key
                    if (!e.ctrlKey && !e.metaKey) {
                        e.preventDefault();
                        toggleFullscreen();
                    }
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isFullscreen, toggleFullscreen]);

    const currentClass = classrooms.find(c => c.id === currentClassId);

    if (!currentClass) {
        return (
            <div className="flex items-center justify-center h-full text-brand-textSecondary">
                Please select a class to view the Shape of the Day.
            </div>
        );
    }

    const joinUrl = 'https://shape-of-the-day.web.app/join';

    return (
        <div
            ref={containerRef}
            className={`h-full flex flex-col space-y-3 custom-scrollbar px-4 pt-4 pb-4 overflow-y-auto
                ${isFullscreen ? 'bg-transparent p-6' : ''}`}
        >

            {/* --- HEADER (Free-floating) - Hidden on mobile, custom header handles it --- */}
            <div className="hidden md:flex flex-col md:flex-row justify-between items-center gap-6 shrink-0 px-2">

                {/* Left: Class Identity */}
                <div className="flex-1 flex flex-col justify-center">
                    <div className="flex items-center gap-3 mb-1">
                        <DatePicker
                            value={selectedDate}
                            onChange={(value) => {
                                if (value instanceof Date) {
                                    setSelectedDate(format(value, 'yyyy-MM-dd'));
                                } else {
                                    setSelectedDate(value || toDateString());
                                }
                            }}
                            iconOnly={true}
                            iconColor="var(--color-brand-accent)"
                            className="z-10"
                        />
                        <span className="text-fluid-base font-bold whitespace-nowrap">
                            <span className="text-brand-textPrimary underline decoration-brand-accent">
                                {isValid(parsedDate) ? format(parsedDate, 'MMM d') : selectedDate}
                            </span>
                            <span className="text-brand-textPrimary">{' '}Shape of the Day</span>
                        </span>
                        <button
                            onClick={() => onNavigate?.('live', 'students')}
                            className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-[var(--color-status-progress)]/10 text-[var(--color-status-progress)] text-fluid-md font-bold border border-[var(--color-status-progress)]/20 hover:bg-[var(--color-status-progress)]/20 transition-all cursor-pointer glow-emerald/10 hover:glow-emerald/20 shadow-layered-sm"
                        >
                            <Users size={12} />
                            <span>{activeStudentCount} Active</span>
                        </button>

                        {/* Fullscreen Toggle Button */}
                        <button
                            onClick={toggleFullscreen}
                            className="p-1.5 rounded-lg text-brand-textSecondary hover:text-brand-accent hover:bg-brand-accent/10 transition-colors"
                            title={isFullscreen ? 'Exit Fullscreen (F or Esc)' : 'Enter Fullscreen (F)'}
                        >
                            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                        </button>
                    </div>
                    <h1 className="text-fluid-3xl font-black text-brand-textPrimary tracking-tight leading-tight">
                        {currentClass.name}
                    </h1>
                </div>

                {/* Right: Connection Info (Compact) */}
                <div className="shrink-0 flex items-center gap-4">
                    <div className="text-right">
                        <p className="text-xs font-bold text-brand-textPrimary uppercase tracking-wider mb-0.5">Join at</p>
                        <p className="text-base font-medium text-brand-textPrimary mb-2 flex items-center justify-end gap-1">
                            shape-of-the-day.web.app/join
                        </p>

                        <p className="text-xs font-bold text-brand-textPrimary uppercase tracking-wider mb-0.5">Class Code</p>
                        <div className="text-3xl font-mono font-black text-brand-accent tracking-widest leading-none">
                            {currentClass.joinCode}
                        </div>
                    </div>

                    {/* QR Code */}
                    <div className="bg-white p-1.5 rounded-lg shadow-sm border border-border-subtle">
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

            {/* --- TASK STREAM (Hierarchical) --- */}
            <div className="space-y-3 pb-4">
                {loading ? (
                    <div className="text-center py-12 text-brand-textSecondary">Loading schedule...</div>
                ) : displayTasks.length === 0 ? (
                    <div className="text-center py-12 text-brand-textSecondary bg-(--color-bg-tile) rounded-2xl border border-dashed border-border-subtle">
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
                                onEdit={(taskId) => onNavigate?.('tasks', taskId)}
                            />
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default ShapeOfDay;
