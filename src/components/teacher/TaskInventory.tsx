import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
    FolderOpen, 
    FileText, 
    ListChecks, 
    CheckSquare, 
    ChevronRight, 
    ChevronDown,
    Copy,
    Filter,
    Search,
    Loader
} from 'lucide-react';
import { Button } from '../shared/Button';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { Classroom, ItemType, Task } from '../../types';
import { useClassStore } from '../../store/classStore';
import { handleError, handleSuccess } from '../../utils/errorHandler';
import { toDateString } from '../../utils/dateHelpers';

// Get type-specific icon
const getTypeIcon = (type: ItemType) => {
    switch (type) {
        case 'project': return FolderOpen;
        case 'assignment': return FileText;
        case 'task': return ListChecks;
        case 'subtask': return CheckSquare;
    }
};

// Get type label
const getTypeLabel = (type: ItemType): string => {
    switch (type) {
        case 'project': return 'Project';
        case 'assignment': return 'Assignment';
        case 'task': return 'Task';
        case 'subtask': return 'Subtask';
    }
};

// Get type color classes
const getTypeColorClasses = (type: ItemType): string => {
    switch (type) {
        case 'project': return 'text-purple-500 bg-purple-500/10 border-purple-500/30';
        case 'assignment': return 'text-blue-500 bg-blue-500/10 border-blue-500/30';
        case 'task': return 'text-green-500 bg-green-500/10 border-green-500/30';
        case 'subtask': return 'text-orange-500 bg-orange-500/10 border-orange-500/30';
    }
};

interface TaskInventoryProps {
    onEditTask?: (task: Task) => void;
}

// Recursive tree item component
interface TreeItemProps {
    task: Task;
    allTasks: Task[];
    depth: number;
    expandedIds: Set<string>;
    onToggleExpand: (id: string) => void;
    onEdit: (task: Task) => void;
    onDuplicate: (task: Task) => void;
    getProgress: (parentId: string) => { completed: number; total: number };
}

function TreeItem({ 
    task, 
    allTasks, 
    depth, 
    expandedIds, 
    onToggleExpand, 
    onEdit, 
    onDuplicate,
    getProgress 
}: TreeItemProps) {
    const TypeIcon = getTypeIcon(task.type);
    const children = allTasks.filter(t => t.parentId === task.id);
    const hasChildren = children.length > 0;
    const isExpanded = expandedIds.has(task.id);
    const progress = hasChildren ? getProgress(task.id) : null;

    return (
        <div>
            <div 
                className={`
                    group flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all
                    hover:bg-gray-50 dark:hover:bg-gray-800
                `}
                style={{ paddingLeft: `${depth * 20 + 8}px` }}
            >
                {/* Expand/Collapse Toggle */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleExpand(task.id);
                    }}
                    className={`p-1 rounded transition-all ${hasChildren ? 'hover:bg-gray-200 dark:hover:bg-gray-700' : 'opacity-0'}`}
                    disabled={!hasChildren}
                >
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>

                {/* Type Icon */}
                <span className={`flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center ${getTypeColorClasses(task.type)}`}>
                    <TypeIcon size={12} />
                </span>

                {/* Title & Info */}
                <div className="flex-1 min-w-0" onClick={() => onEdit(task)}>
                    <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-brand-textDarkPrimary dark:text-brand-textPrimary truncate">
                            {task.title}
                        </span>
                        {task.status === 'done' && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-green-500/10 text-green-500 font-medium">
                                Done
                            </span>
                        )}
                    </div>
                    
                    {/* Progress Bar for parents */}
                    {progress && progress.total > 0 && (
                        <div className="flex items-center gap-2 mt-1">
                            <div className="w-20 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-brand-accent rounded-full transition-all"
                                    style={{ width: `${(progress.completed / progress.total) * 100}%` }}
                                />
                            </div>
                            <span className="text-xs text-gray-400">
                                {progress.completed}/{progress.total}
                            </span>
                        </div>
                    )}
                </div>

                {/* Date Range */}
                {task.startDate && task.endDate && (
                    <span className="text-xs text-gray-400 hidden sm:block">
                        {new Date(task.startDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        {task.startDate !== task.endDate && (
                            <> - {new Date(task.endDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</>
                        )}
                    </span>
                )}

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDuplicate(task);
                        }}
                        className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-brand-accent transition-all"
                        title="Duplicate"
                    >
                        <Copy size={14} />
                    </button>
                </div>
            </div>

            {/* Children */}
            {isExpanded && hasChildren && (
                <div>
                    {children.map(child => (
                        <TreeItem
                            key={child.id}
                            task={child}
                            allTasks={allTasks}
                            depth={depth + 1}
                            expandedIds={expandedIds}
                            onToggleExpand={onToggleExpand}
                            onEdit={onEdit}
                            onDuplicate={onDuplicate}
                            getProgress={getProgress}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export default function TaskInventory({ onEditTask }: TaskInventoryProps) {
    // --- Store ---
    const { classrooms: storeClassrooms } = useClassStore();

    // --- State ---
    const [tasks, setTasks] = useState<Task[]>([]);
    const [rooms, setRooms] = useState<Classroom[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    
    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [filterClassroom, setFilterClassroom] = useState<string>('all');
    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed'>('all');

    // --- Effects ---

    // Fetch all tasks
    useEffect(() => {
        if (!auth.currentUser) return;

        const q = query(
            collection(db, 'tasks'),
            where('teacherId', '==', auth.currentUser.uid)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const taskData: Task[] = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                taskData.push({
                    id: doc.id,
                    ...data,
                    type: data.type || 'task',
                    parentId: data.parentId || null,
                    rootId: data.rootId || null,
                    path: data.path || [],
                    pathTitles: data.pathTitles || [],
                    childIds: data.childIds || [],
                    selectedRoomIds: data.selectedRoomIds || [],
                    status: data.status || 'todo',
                } as Task);
            });
            taskData.sort((a, b) => (a.presentationOrder || 0) - (b.presentationOrder || 0));
            setTasks(taskData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Use store classrooms or fetch
    useEffect(() => {
        if (storeClassrooms.length > 0) {
            setRooms(storeClassrooms);
        }
    }, [storeClassrooms]);

    // --- Helpers ---

    const getProgress = useCallback((parentId: string): { completed: number; total: number } => {
        const children = tasks.filter(t => t.parentId === parentId);
        const total = children.length;
        const completed = children.filter(t => t.status === 'done').length;
        return { completed, total };
    }, [tasks]);

    // Filter tasks
    const filteredTasks = useMemo(() => {
        return tasks.filter(task => {
            // Search filter
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const matchesTitle = task.title.toLowerCase().includes(query);
                const matchesDesc = task.description?.toLowerCase().includes(query);
                if (!matchesTitle && !matchesDesc) return false;
            }

            // Classroom filter
            if (filterClassroom !== 'all') {
                if (!task.selectedRoomIds?.includes(filterClassroom)) return false;
            }

            // Status filter
            if (filterStatus === 'active' && task.status === 'done') return false;
            if (filterStatus === 'completed' && task.status !== 'done') return false;

            return true;
        });
    }, [tasks, searchQuery, filterClassroom, filterStatus]);

    // Group tasks by type (only top-level items)
    const groupedTasks = useMemo(() => {
        const projects = filteredTasks.filter(t => t.type === 'project' && !t.parentId);
        const assignments = filteredTasks.filter(t => t.type === 'assignment' && !t.parentId);
        const standaloneTasks = filteredTasks.filter(t => 
            (t.type === 'task' || t.type === 'subtask') && !t.parentId
        );

        return { projects, assignments, standaloneTasks };
    }, [filteredTasks]);

    // --- Handlers ---

    const toggleExpand = useCallback((id: string) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    }, []);

    const expandAll = useCallback(() => {
        const allIds = tasks.filter(t => t.childIds?.length > 0).map(t => t.id);
        setExpandedIds(new Set(allIds));
    }, [tasks]);

    const collapseAll = useCallback(() => {
        setExpandedIds(new Set());
    }, []);

    const handleEdit = useCallback((task: Task) => {
        if (onEditTask) {
            onEditTask(task);
        }
    }, [onEditTask]);

    const handleDuplicate = useCallback(async (task: Task) => {
        if (!auth.currentUser) return;

        try {
            const maxOrder = tasks.length > 0 ? Math.max(...tasks.map(t => t.presentationOrder || 0)) : 0;

            // Create a copy with new dates
            await addDoc(collection(db, 'tasks'), {
                title: `${task.title} (Copy)`,
                description: task.description || '',
                type: task.type,
                parentId: null, // Duplicates are standalone by default
                rootId: null,
                path: [],
                pathTitles: [],
                linkURL: task.linkURL || '',
                startDate: toDateString(),
                endDate: toDateString(),
                selectedRoomIds: task.selectedRoomIds || [],
                teacherId: auth.currentUser.uid,
                presentationOrder: maxOrder + 1,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                imageURL: task.imageURL || '',
                status: 'todo',
                childIds: [],
            });

            handleSuccess(`${getTypeLabel(task.type)} duplicated!`);
        } catch (error) {
            console.error("Error duplicating:", error);
            handleError("Failed to duplicate item.");
        }
    }, [tasks]);

    // --- Render ---

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <Loader className="w-8 h-8 animate-spin text-brand-accent" />
            </div>
        );
    }

    return (
        <div className="flex-1 h-full flex flex-col overflow-hidden">
            {/* Header with Filters */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-brand-textDarkPrimary dark:text-brand-textPrimary">
                        Task Inventory
                    </h2>
                    <div className="flex gap-2">
                        <Button variant="tertiary" size="sm" onClick={expandAll}>
                            Expand All
                        </Button>
                        <Button variant="tertiary" size="sm" onClick={collapseAll}>
                            Collapse All
                        </Button>
                    </div>
                </div>

                {/* Search & Filters */}
                <div className="flex flex-wrap gap-3">
                    {/* Search */}
                    <div className="relative flex-1 min-w-[200px]">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Search tasks..."
                            className="w-full pl-9 pr-3 py-2 rounded-xl border-[3px] border-gray-200 dark:border-gray-700 bg-transparent text-sm font-medium text-brand-textDarkPrimary dark:text-brand-textPrimary placeholder-gray-400 hover:border-gray-300 dark:hover:border-gray-600 focus:outline-none focus:border-brand-accent transition-all"
                        />
                    </div>

                    {/* Classroom Filter */}
                    <div className="flex items-center gap-2">
                        <Filter size={16} className="text-gray-400" />
                        <select
                            value={filterClassroom}
                            onChange={e => setFilterClassroom(e.target.value)}
                            className="px-3 py-2 rounded-xl border-[3px] border-gray-200 dark:border-gray-700 bg-transparent text-sm font-medium text-brand-textDarkPrimary dark:text-brand-textPrimary hover:border-gray-300 dark:hover:border-gray-600 focus:outline-none focus:border-brand-accent transition-all"
                        >
                            <option value="all">All Classes</option>
                            {rooms.map(room => (
                                <option key={room.id} value={room.id}>{room.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Status Filter */}
                    <select
                        value={filterStatus}
                        onChange={e => setFilterStatus(e.target.value as 'all' | 'active' | 'completed')}
                        className="px-3 py-2 rounded-xl border-[3px] border-gray-200 dark:border-gray-700 bg-transparent text-sm font-medium text-brand-textDarkPrimary dark:text-brand-textPrimary hover:border-gray-300 dark:hover:border-gray-600 focus:outline-none focus:border-brand-accent transition-all"
                    >
                        <option value="all">All Status</option>
                        <option value="active">Active</option>
                        <option value="completed">Completed</option>
                    </select>
                </div>
            </div>

            {/* Content - Three Columns */}
            <div className="flex-1 overflow-y-auto p-4">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* Projects Column */}
                    <div className="card-base p-4">
                        <div className="flex items-center gap-2 mb-4">
                            <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${getTypeColorClasses('project')}`}>
                                <FolderOpen size={16} />
                            </span>
                            <h3 className="font-bold text-brand-textDarkPrimary dark:text-brand-textPrimary">
                                Projects
                            </h3>
                            <span className="ml-auto text-xs text-gray-400 font-medium">
                                {groupedTasks.projects.length}
                            </span>
                        </div>

                        {groupedTasks.projects.length === 0 ? (
                            <p className="text-center text-sm text-gray-400 py-8 italic">
                                No projects found
                            </p>
                        ) : (
                            <div className="space-y-1">
                                {groupedTasks.projects.map(project => (
                                    <TreeItem
                                        key={project.id}
                                        task={project}
                                        allTasks={filteredTasks}
                                        depth={0}
                                        expandedIds={expandedIds}
                                        onToggleExpand={toggleExpand}
                                        onEdit={handleEdit}
                                        onDuplicate={handleDuplicate}
                                        getProgress={getProgress}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Assignments Column */}
                    <div className="card-base p-4">
                        <div className="flex items-center gap-2 mb-4">
                            <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${getTypeColorClasses('assignment')}`}>
                                <FileText size={16} />
                            </span>
                            <h3 className="font-bold text-brand-textDarkPrimary dark:text-brand-textPrimary">
                                Assignments
                            </h3>
                            <span className="ml-auto text-xs text-gray-400 font-medium">
                                {groupedTasks.assignments.length}
                            </span>
                        </div>

                        {groupedTasks.assignments.length === 0 ? (
                            <p className="text-center text-sm text-gray-400 py-8 italic">
                                No standalone assignments
                            </p>
                        ) : (
                            <div className="space-y-1">
                                {groupedTasks.assignments.map(assignment => (
                                    <TreeItem
                                        key={assignment.id}
                                        task={assignment}
                                        allTasks={filteredTasks}
                                        depth={0}
                                        expandedIds={expandedIds}
                                        onToggleExpand={toggleExpand}
                                        onEdit={handleEdit}
                                        onDuplicate={handleDuplicate}
                                        getProgress={getProgress}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Standalone Tasks Column */}
                    <div className="card-base p-4">
                        <div className="flex items-center gap-2 mb-4">
                            <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${getTypeColorClasses('task')}`}>
                                <ListChecks size={16} />
                            </span>
                            <h3 className="font-bold text-brand-textDarkPrimary dark:text-brand-textPrimary">
                                Standalone Tasks
                            </h3>
                            <span className="ml-auto text-xs text-gray-400 font-medium">
                                {groupedTasks.standaloneTasks.length}
                            </span>
                        </div>

                        {groupedTasks.standaloneTasks.length === 0 ? (
                            <p className="text-center text-sm text-gray-400 py-8 italic">
                                No standalone tasks
                            </p>
                        ) : (
                            <div className="space-y-1">
                                {groupedTasks.standaloneTasks.map(task => (
                                    <TreeItem
                                        key={task.id}
                                        task={task}
                                        allTasks={filteredTasks}
                                        depth={0}
                                        expandedIds={expandedIds}
                                        onToggleExpand={toggleExpand}
                                        onEdit={handleEdit}
                                        onDuplicate={handleDuplicate}
                                        getProgress={getProgress}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
