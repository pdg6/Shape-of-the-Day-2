import { useState, useEffect, useMemo } from 'react';
import { useClassStore } from '../../store/classStore';
import { useAuth } from '../../context/AuthContext';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { toDateString } from '../../utils/dateHelpers';
import { QRCodeSVG } from 'qrcode.react';
import { Users, ExternalLink, FolderOpen, FileText, ListChecks, CheckSquare, ChevronDown, ChevronRight, ChevronUp } from 'lucide-react';
import { ItemType } from '../../types';

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
    status?: 'draft' | 'published' | 'done'; // Task status
    // Hierarchy fields
    type: ItemType;
    parentId: string | null;
    rootId: string | null;
    path: string[];
    pathTitles: string[];
    childIds: string[];
}

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

    return (
        <div
            className="group bg-brand-lightSurface dark:bg-brand-darkSurface 
                border-2 border-gray-200 dark:border-gray-700 rounded-xl p-3 
                transition-all hover:border-brand-accent/50"
            style={{
                marginLeft: `${indent}px`,
                width: `calc(100% - ${indent}px)`
            }}
        >
            <div className="flex items-start gap-3">
                {/* Number Badge on LEFT - aligned to end like summary */}
                <div className="flex flex-col items-end gap-1 flex-shrink-0 w-8">
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

                {/* Task Content - Title/Due Date on left, Description on right */}
                <div className="flex-1 min-w-0 flex items-start gap-4">
                    {/* Left: Title + Due Date */}
                    <div className="flex-shrink-0 min-w-[200px] max-w-[300px]">
                        <h3 className="text-lg font-bold text-brand-textDarkPrimary dark:text-brand-textPrimary leading-tight truncate">
                            {task.title}
                        </h3>
                        {/* Due Date - larger */}
                        {task.endDate && (
                            <p className="text-sm text-gray-500 mt-0.5 font-medium">
                                {new Date(task.endDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                            </p>
                        )}
                    </div>

                    {/* Right: Description */}
                    {task.description && (
                        <div className="flex-1 min-w-0">
                            <div className={`text-sm text-brand-textDarkSecondary dark:text-brand-textSecondary ${isDescriptionExpanded ? '' : 'line-clamp-2'}`}>
                                {task.description}
                            </div>
                            {task.description.length > 100 && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsDescriptionExpanded(!isDescriptionExpanded);
                                    }}
                                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-brand-accent mt-1 transition-colors"
                                >
                                    {isDescriptionExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                    {isDescriptionExpanded ? 'Less' : 'More'}
                                </button>
                            )}
                        </div>
                    )}

                    {/* Link icon */}
                    {task.linkURL && (
                        <a
                            href={task.linkURL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-brand-accent hover:text-brand-accent/80 transition-colors flex-shrink-0"
                            title="Open Resource"
                        >
                            <ExternalLink size={16} />
                        </a>
                    )}
                </div>
            </div>
        </div>
    );
};

const ShapeOfDay: React.FC = () => {
    const { currentClassId, classrooms, activeStudentCount } = useClassStore();
    const { user } = useAuth();

    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);

    const currentClass = classrooms.find(c => c.id === currentClassId);
    const today = toDateString();

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
                // Filter by date range and exclude drafts
                if (today >= (data.startDate || '') && today <= (data.endDate || today) && data.status !== 'draft') {
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
    }, [currentClassId, user, today]);

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

    if (!currentClass) {
        return (
            <div className="flex items-center justify-center h-full text-gray-500">
                Please select a class to view the Shape of the Day.
            </div>
        );
    }

    const joinUrl = `${window.location.origin}/join`;

    return (
        <div className="h-full flex flex-col gap-4 overflow-y-auto custom-scrollbar p-1">

            {/* --- HEADER CARD (Compact) --- */}
            <div className="w-full bg-brand-lightSurface dark:bg-brand-darkSurface rounded-xl px-4 md:px-6 flex-shrink-0">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6">

                    {/* Left: Class Identity */}
                    <div className="flex-1 flex flex-col justify-center">
                        <div className="flex items-center gap-3 mb-1">
                            <span className="px-2 py-0.5 rounded-full bg-brand-accent/10 text-brand-accent text-xs font-bold uppercase tracking-wider border border-brand-accent/20">
                                Current Session
                            </span>
                            <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                                <Users size={16} />
                                <span className="font-bold text-sm">{activeStudentCount} Active</span>
                            </div>
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
                        No tasks scheduled for today.
                    </div>
                ) : (
                    displayTasks.map((node) => {
                        return (
                            <TaskCard
                                key={node.task.id}
                                task={node.task}
                                depth={node.depth}
                                allTasks={tasks}
                                today={today}
                            />
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default ShapeOfDay;
