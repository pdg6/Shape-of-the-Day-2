import React, { useState, useEffect, useMemo } from 'react';
import { 
    FolderOpen, 
    FileText, 
    CheckSquare, 
    ChevronRight, 
    ChevronDown,
    Search,
    Plus,
    Inbox
} from 'lucide-react';
import { Task, ItemType } from '../../types';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import toast from 'react-hot-toast';

interface StudentProjectsViewProps {
    classId: string;
    onImportTask: (task: Task) => void;
    currentTaskIds: Set<string>;
}

interface TreeNode {
    task: Task;
    children: TreeNode[];
    depth: number;
}

const TYPE_CONFIG: Record<ItemType, { 
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    color: string;
    bgColor: string;
}> = {
    project: { 
        icon: FolderOpen, 
        label: 'Project',
        color: 'text-purple-600 dark:text-purple-400',
        bgColor: 'bg-purple-100 dark:bg-purple-900/30'
    },
    assignment: { 
        icon: FileText, 
        label: 'Assignment',
        color: 'text-blue-600 dark:text-blue-400',
        bgColor: 'bg-blue-100 dark:bg-blue-900/30'
    },
    task: { 
        icon: CheckSquare, 
        label: 'Task',
        color: 'text-green-600 dark:text-green-400',
        bgColor: 'bg-green-100 dark:bg-green-900/30'
    },
    subtask: { 
        icon: CheckSquare, 
        label: 'Subtask',
        color: 'text-gray-600 dark:text-gray-400',
        bgColor: 'bg-gray-100 dark:bg-gray-700/30'
    },
};

/**
 * StudentProjectsView - Tree view for students to browse all projects and assignments
 * 
 * Features:
 * 1. Hierarchical tree view: Projects → Tasks → Subtasks and Assignments → Tasks → Subtasks
 * 2. Search/filter functionality
 * 3. Import individual tasks or entire projects to today's tasks
 * 4. Breadcrumb display for context
 * 5. Expand/collapse nodes
 */
const StudentProjectsView: React.FC<StudentProjectsViewProps> = ({
    classId,
    onImportTask,
    currentTaskIds,
}) => {
    const [allTasks, setAllTasks] = useState<Task[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(true);

    // Fetch all tasks for this class
    useEffect(() => {
        if (!classId) {
            setIsLoading(false);
            return;
        }

        const tasksRef = collection(db, 'tasks');
        const q = query(
            tasksRef,
            where('assignedRooms', 'array-contains', classId),
            orderBy('title', 'asc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const tasks = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Task[];
            setAllTasks(tasks);
            setIsLoading(false);
        }, (error) => {
            console.error('Error fetching tasks:', error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [classId]);

    // Build tree structure from flat tasks
    const buildTree = useMemo(() => {
        const taskMap = new Map<string, Task>();
        const childrenMap = new Map<string, Task[]>();
        
        // Index all tasks
        allTasks.forEach(task => {
            taskMap.set(task.id, task);
            
            const parentId = task.parentId || 'root';
            if (!childrenMap.has(parentId)) {
                childrenMap.set(parentId, []);
            }
            childrenMap.get(parentId)!.push(task);
        });

        // Recursive tree builder
        const buildNode = (task: Task, depth: number): TreeNode => {
            const children = childrenMap.get(task.id) || [];
            return {
                task,
                children: children.map(child => buildNode(child, depth + 1)),
                depth,
            };
        };

        // Get root-level items (projects and standalone tasks)
        const rootTasks = childrenMap.get('root') || [];
        
        // Separate into projects/assignments and standalone tasks
        const projects = rootTasks.filter(t => t.type === 'project');
        const assignments = rootTasks.filter(t => t.type === 'assignment' && !t.parentId);
        const standaloneTasks = rootTasks.filter(t => t.type === 'task' && !t.parentId);

        return {
            projects: projects.map(t => buildNode(t, 0)),
            assignments: assignments.map(t => buildNode(t, 0)),
            standaloneTasks: standaloneTasks.map(t => buildNode(t, 0)),
        };
    }, [allTasks]);

    // Filter tree based on search
    const filteredTree = useMemo(() => {
        if (!searchQuery.trim()) return buildTree;

        const lowerQuery = searchQuery.toLowerCase();
        
        const filterNode = (node: TreeNode): TreeNode | null => {
            const matchesSelf = node.task.title.toLowerCase().includes(lowerQuery) ||
                               node.task.description?.toLowerCase().includes(lowerQuery);
            
            const filteredChildren = node.children
                .map(child => filterNode(child))
                .filter((child): child is TreeNode => child !== null);

            if (matchesSelf || filteredChildren.length > 0) {
                return {
                    ...node,
                    children: filteredChildren,
                };
            }
            return null;
        };

        return {
            projects: buildTree.projects
                .map(node => filterNode(node))
                .filter((node): node is TreeNode => node !== null),
            assignments: buildTree.assignments
                .map(node => filterNode(node))
                .filter((node): node is TreeNode => node !== null),
            standaloneTasks: buildTree.standaloneTasks
                .map(node => filterNode(node))
                .filter((node): node is TreeNode => node !== null),
        };
    }, [buildTree, searchQuery]);

    // Toggle expand/collapse
    const toggleExpand = (taskId: string) => {
        setExpandedNodes(prev => {
            const next = new Set(prev);
            if (next.has(taskId)) {
                next.delete(taskId);
            } else {
                next.add(taskId);
            }
            return next;
        });
    };

    // Import a single task
    const handleImport = (task: Task) => {
        if (currentTaskIds.has(task.id)) {
            toast.error('Task already in your list!');
            return;
        }
        onImportTask(task);
        toast.success(`Added "${task.title}" to today's tasks`);
    };

    // Import all children of a node recursively
    const importAllChildren = (node: TreeNode) => {
        let importCount = 0;
        
        const importRecursive = (n: TreeNode) => {
            // Only import tasks and subtasks (not projects/assignments themselves)
            if ((n.task.type === 'task' || n.task.type === 'subtask') && !currentTaskIds.has(n.task.id)) {
                onImportTask(n.task);
                importCount++;
            }
            n.children.forEach(child => importRecursive(child));
        };

        importRecursive(node);

        if (importCount > 0) {
            toast.success(`Added ${importCount} task${importCount !== 1 ? 's' : ''} to today's list`);
        } else {
            toast.error('All tasks already in your list!');
        }
    };

    // Render a single tree node
    const renderNode = (node: TreeNode, key: string) => {
        const { task, children, depth } = node;
        const config = TYPE_CONFIG[task.type || 'task'];
        const Icon = config.icon;
        const hasChildren = children.length > 0;
        const isExpanded = expandedNodes.has(task.id);
        const isImported = currentTaskIds.has(task.id);
        const canImport = task.type === 'task' || task.type === 'subtask';

        return (
            <div key={key} className="select-none">
                {/* Node row */}
                <div
                    className={`
                        flex items-center gap-2 py-2 px-3 rounded-lg
                        hover:bg-gray-100 dark:hover:bg-gray-800/50
                        transition-colors duration-150
                    `}
                    style={{ paddingLeft: `${depth * 24 + 12}px` }}
                >
                    {/* Expand/collapse button */}
                    {hasChildren ? (
                        <button
                            onClick={() => toggleExpand(task.id)}
                            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                            aria-label={isExpanded ? 'Collapse' : 'Expand'}
                        >
                            {isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-gray-500" />
                            ) : (
                                <ChevronRight className="w-4 h-4 text-gray-500" />
                            )}
                        </button>
                    ) : (
                        <div className="w-6" /> // Spacer
                    )}

                    {/* Type icon */}
                    <div className={`p-1.5 rounded ${config.bgColor}`}>
                        <Icon className={`w-4 h-4 ${config.color}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="font-medium text-brand-textDarkPrimary dark:text-brand-textPrimary truncate">
                                {task.title}
                            </span>
                            <span className={`text-xs px-1.5 py-0.5 rounded ${config.bgColor} ${config.color}`}>
                                {config.label}
                            </span>
                        </div>
                        {/* Breadcrumb */}
                        {task.pathTitles && task.pathTitles.length > 0 && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {task.pathTitles.join(' → ')}
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                        {/* Import single task button */}
                        {canImport && (
                            <button
                                onClick={() => handleImport(task)}
                                disabled={isImported}
                                className={`
                                    p-1.5 rounded-lg transition-colors text-sm font-medium
                                    ${isImported
                                        ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                                        : 'bg-brand-accent text-white hover:bg-brand-accent/90'
                                    }
                                `}
                                title={isImported ? 'Already imported' : 'Add to today'}
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        )}
                        
                        {/* Import all button for parents */}
                        {hasChildren && (task.type === 'project' || task.type === 'assignment') && (
                            <button
                                onClick={() => importAllChildren(node)}
                                className="px-2 py-1 text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-800/30 transition-colors"
                                title="Import all tasks"
                            >
                                Import All
                            </button>
                        )}
                    </div>
                </div>

                {/* Children */}
                {hasChildren && isExpanded && (
                    <div className="border-l-2 border-gray-200 dark:border-gray-700 ml-6">
                        {children.map((child, idx) => renderNode(child, `${key}-${idx}`))}
                    </div>
                )}
            </div>
        );
    };

    // Render a section
    const renderSection = (title: string, nodes: TreeNode[], _emptyMessage: string) => {
        if (nodes.length === 0) {
            return null;
        }

        return (
            <div className="mb-6">
                <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                    {title}
                </h3>
                <div className="bg-white dark:bg-gray-800/50 rounded-xl border-2 border-gray-200 dark:border-gray-700">
                    {nodes.map((node, idx) => renderNode(node, `${title}-${idx}`))}
                </div>
            </div>
        );
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-brand-accent"></div>
            </div>
        );
    }

    const isEmpty = filteredTree.projects.length === 0 && 
                    filteredTree.assignments.length === 0 && 
                    filteredTree.standaloneTasks.length === 0;

    return (
        <div className="space-y-6">
            {/* Search Bar */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search projects, assignments, tasks..."
                    className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-brand-textDarkPrimary dark:text-brand-textPrimary placeholder-gray-400 focus:outline-none focus:border-brand-accent transition-colors"
                />
            </div>

            {/* Empty State */}
            {isEmpty ? (
                <div className="text-center py-12 bg-white dark:bg-gray-800/50 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600">
                    <Inbox className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                    <p className="text-brand-textDarkSecondary dark:text-brand-textSecondary">
                        {searchQuery 
                            ? 'No results found for your search.'
                            : 'No projects or assignments available yet.'}
                    </p>
                </div>
            ) : (
                <>
                    {renderSection('Projects', filteredTree.projects, 'No projects available')}
                    {renderSection('Assignments', filteredTree.assignments, 'No assignments available')}
                    {renderSection('Tasks', filteredTree.standaloneTasks, 'No standalone tasks available')}
                </>
            )}
        </div>
    );
};

export default StudentProjectsView;
