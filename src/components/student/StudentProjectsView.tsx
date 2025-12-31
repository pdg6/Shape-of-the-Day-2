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
import { studentDataService } from '../../services/studentDataService';
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
        color: 'text-purple-500',
        bgColor: 'bg-purple-500/10'
    },
    assignment: {
        icon: FileText,
        label: 'Assignment',
        color: 'text-blue-500',
        bgColor: 'bg-blue-500/10'
    },
    task: {
        icon: CheckSquare,
        label: 'Task',
        color: 'text-emerald-500',
        bgColor: 'bg-emerald-500/10'
    },
    subtask: {
        icon: CheckSquare,
        label: 'Subtask',
        color: 'text-brand-textSecondary',
        bgColor: 'bg-tile-alt'
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

    // Fetch all tasks for this class via service
    useEffect(() => {
        if (!classId) {
            setIsLoading(false);
            return;
        }

        const unsubscribe = studentDataService.subscribeToTasks((tasks: Task[]) => {
            setAllTasks(tasks);
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
    const renderNode = (node: TreeNode, key: string, isNested: boolean = false) => {
        const { task, children, depth } = node;
        const config = TYPE_CONFIG[task.type || 'task'];
        const Icon = config.icon;
        const hasChildren = children.length > 0;
        const isExpanded = expandedNodes.has(task.id);
        const isImported = currentTaskIds.has(task.id);
        const canImport = task.type === 'task' || task.type === 'subtask';
        const isParentType = task.type === 'project' || task.type === 'assignment';

        // Accordion pattern: parent container wraps children when expanded
        return (
            <div
                key={key}
                className={`
                    select-none
                    ${!isNested ? 'mx-1 my-1' : ''}
                    ${isParentType && hasChildren ? `
                        rounded-xl overflow-hidden
                        ${isExpanded
                            ? 'border-2 border-border-subtle bg-tile-alt'
                            : 'border-2 border-transparent hover:border-brand-accent/30'}
                    ` : ''}
                    transition-all duration-200
                `}
            >
                {/* Node row */}
                <div
                    className={`
                        flex items-center gap-3 py-3 px-4
                        ${!isParentType || !hasChildren ? `
                            rounded-lg
                            ${isNested ? 'mx-2 my-1' : ''}
                            border-2 border-transparent
                            hover:border-brand-accent/30
                            hover:bg-tile-hover
                        ` : `
                            ${isExpanded ? 'bg-tile-hover' : ''}
                        `}
                        transition-all duration-200
                    `}
                    style={{ paddingLeft: `${(isNested ? depth * 16 : 0) + 16}px` }}
                >
                    {/* Expand/collapse button */}
                    {hasChildren ? (
                        <button
                            onClick={() => toggleExpand(task.id)}
                            className="p-1.5 rounded-lg hover:bg-tile-hover transition-all duration-200"
                            aria-label={isExpanded ? 'Collapse' : 'Expand'}
                        >
                            {isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-brand-textSecondary" />
                            ) : (
                                <ChevronRight className="w-4 h-4 text-brand-textSecondary" />
                            )}
                        </button>
                    ) : (
                        <div className="w-7" /> // Spacer
                    )}

                    {/* Type icon */}
                    <div className={`p-2 rounded-lg ${config.bgColor}`}>
                        <Icon className={`w-5 h-5 ${config.color}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-brand-textPrimary truncate">
                                {task.title}
                            </span>
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${config.bgColor} ${config.color}`}>
                                {config.label}
                            </span>
                        </div>
                        {/* Breadcrumb */}
                        {task.pathTitles && task.pathTitles.length > 0 && (
                            <div className="text-[10px] font-black text-brand-textMuted uppercase tracking-wider truncate mt-0.5">
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
                                    p-2 rounded-xl border transition-all duration-200 text-sm font-medium
                                    ${isImported
                                        ? 'border-border-subtle bg-tile-alt text-brand-textSecondary cursor-not-allowed'
                                        : 'border-transparent bg-tile-alt text-brand-accent hover:border-brand-accent/50 hover:bg-brand-accent/5'
                                    }
                                `}
                                title={isImported ? 'Already imported' : 'Add to today'}
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        )}

                        {/* Import all button for parents */}
                        {hasChildren && isParentType && (
                            <button
                                onClick={() => importAllChildren(node)}
                                className="px-3 py-1.5 text-[10px] font-black bg-brand-accent text-white rounded-xl border border-transparent hover:border-brand-accent/50 hover:shadow-layered transition-all duration-200 tracking-widest uppercase"
                                title="Import all tasks"
                            >
                                IMPORT ALL
                            </button>
                        )}
                    </div>
                </div>

                {/* Children - rendered inside parent card for accordion effect */}
                {hasChildren && isExpanded && (
                    <div className={`
                        ${isParentType
                            ? 'border-t border-border-subtle bg-tile-alt py-1'
                            : 'pl-6'}
                    `}>
                        {children.map((child, idx) => renderNode(child, `${key}-${idx}`, true))}
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
                <h3 className="text-xs font-bold text-brand-textSecondary uppercase tracking-wider mb-3 px-1">
                    {title}
                </h3>
                <div className="bg-tile rounded-2xl border border-border-subtle overflow-hidden shadow-layered p-1">
                    {nodes.map((node, idx) => renderNode(node, `${title}-${idx}`, false))}
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
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-textMuted" />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search projects, assignments, tasks..."
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-border-subtle bg-tile-alt text-brand-textPrimary placeholder-brand-textMuted focus:outline-none hover:border-brand-accent/50 focus:border-brand-accent/50 focus:ring-4 focus:ring-brand-accent/5 transition-all duration-200 shadow-layered-sm"
                />
            </div>

            {/* Empty State */}
            {isEmpty ? (
                <div className="text-center py-16 px-6 bg-tile rounded-2xl border border-dashed border-border-subtle shadow-layered-sm">
                    <Inbox className="w-14 h-14 mx-auto text-brand-textSecondary mb-4" />
                    <p className="text-brand-textSecondary text-base">
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
