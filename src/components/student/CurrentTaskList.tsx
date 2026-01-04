import React, { useState, useEffect, useRef, useCallback } from 'react';
import { HelpCircle, Play, CheckCircle, RotateCcw, X, LucideIcon, Send, MessageCircle, ExternalLink, File, FileText, FileImage, FileVideo, FileAudio, FileSpreadsheet, Presentation, ChevronDown, ChevronUp, AlertTriangle, Sparkles, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { sanitizeComment, filterProfanity } from '../../utils/security';
import { sanitizeHelpRequest } from '../../utils/textSanitizer';
import { addQuestionToTask, subscribeToTaskQuestions } from '../../services/firestoreService';
import { Task, TaskStatus, QuestionEntry } from '../../types';
import { auth } from '../../firebase';
import toast from 'react-hot-toast';

import { CelebrationModal, ProgressCelebration } from '../shared/Celebration';
import { CelebrationModal, ProgressCelebration } from '../shared/Celebration';
import { CodeBlockRenderer } from '../shared/CodeBlockRenderer';
import { formatMessageToHtml } from '../../utils/markdownFormatter';

/**
 * Configuration for the different task status actions.
 * Reduced to 3 actions: Help, In Progress, Complete
 */
interface StatusAction {
    id: TaskStatus;
    label: string;
    icon: LucideIcon;
    activeColor: string;
    underlineColor: string;
    hover: string;
    borderColor: string;
}

const STATUS_ACTIONS: StatusAction[] = [
    {
        id: 'todo',
        label: 'To Do',
        icon: RotateCcw,
        activeColor: 'text-brand-textSecondary',
        underlineColor: 'decoration-brand-textMuted',
        hover: 'hover:text-brand-textPrimary hover:bg-tile-hover',
        borderColor: 'border-border-subtle'
    },
    {
        id: 'help',
        label: 'Help',
        icon: HelpCircle,
        activeColor: 'text-status-stuck',
        underlineColor: 'decoration-status-stuck',
        hover: 'hover:text-status-stuck hover:bg-status-stuck/10',
        borderColor: 'border-status-stuck'
    },
    {
        id: 'in_progress',
        label: 'In Progress',
        icon: Play,
        activeColor: 'text-status-progress',
        underlineColor: 'decoration-status-progress',
        hover: 'hover:text-status-progress hover:bg-status-progress/10',
        borderColor: 'border-status-progress'
    },
    {
        id: 'done',
        label: 'Done',
        icon: CheckCircle,
        activeColor: 'text-status-complete',
        underlineColor: 'decoration-status-complete',
        hover: 'hover:text-status-complete hover:bg-status-complete/10',
        borderColor: 'border-status-complete'
    }
];



/**
 * Props for the HelpModal component.
 */
interface HelpModalProps {
    task: Task;
    onClose: () => void;
    onUpdateComment: (taskId: string, comment: string) => void;
    studentName: string;
    classroomId: string;
}

/**
 * HelpModal Component (formerly QuestionOverlay)
 *
 * A modal overlay that appears when a student clicks "Help".
 * Provides pre-defined options + custom text input.
 */
const HelpModal: React.FC<HelpModalProps> = ({ task, onClose, onUpdateComment, studentName, classroomId }) => {
    const [comment, setComment] = useState(task.comment || '');
    const [isSubmitting, setIsSubmitting] = useState(false);
    // const [submittedQuestions, setSubmittedQuestions] = useState<string[]>([]); // Cleaned up as unnecessary
    const maxChars = 200;
    const overlayRef = useRef<HTMLDivElement>(null);
    const closeButtonRef = useRef<HTMLButtonElement>(null);
    const previousFocusRef = useRef<HTMLElement | null>(null);

    /**
     * Handles comment input with Unicode normalization, sanitization, and profanity filtering.
     */
    const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const raw = e.target.value.slice(0, maxChars);
        // Apply Unicode normalization and control character removal
        const normalized = sanitizeHelpRequest(raw);
        // Apply profanity filter
        const filtered = filterProfanity(normalized);
        setComment(filtered);
    };



    /**
     * Submit the help request to the task's question history
     */
    const handleSubmitHelp = async () => {
        if (!comment.trim() || !auth.currentUser) return;

        setIsSubmitting(true);
        try {
            const sanitized = sanitizeComment(comment, maxChars);

            // Save to questions subcollection (Sanitized/Escaped for DB/Teacher Safety)
            await addQuestionToTask(task.id, {
                studentId: auth.currentUser.uid,
                studentName: studentName,
                classroomId: classroomId,
                question: sanitized,
            });

            // Update local state (Use processed but UN-ESCAPED text for the UI so it doesn't show &#39;)
            // We want the text to remain editable and readable in the textarea.
            onUpdateComment(task.id, comment);

            // Track submitted question (Legacy local state - subscription handles the real list now)
            // setSubmittedQuestions(prev => [...prev, sanitized]);

            toast.success('Help request sent to teacher!');
            setComment('');
        } catch (error) {
            console.error('Error submitting help request:', error);
            toast.error('Failed to send help request');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Focus management
    useEffect(() => {
        previousFocusRef.current = document.activeElement as HTMLElement;
        return () => {
            previousFocusRef.current?.focus();
        };
    }, []);

    // Handle Escape key
    const handleKeyDown = useCallback((event: KeyboardEvent) => {
        if (event.key === 'Escape') {
            onClose();
        }
    }, [onClose]);

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    // Subscribe to real-time questions
    const [questions, setQuestions] = useState<QuestionEntry[]>([]);

    useEffect(() => {
        const studentId = auth.currentUser?.uid;
        if (!studentId) return;

        const unsubscribe = subscribeToTaskQuestions(
            task.id,
            (fetchedQuestions) => {
                setQuestions(fetchedQuestions);
            },
            classroomId,
            studentId // Pass studentId to filter query and satisfy security rules
        );

        return () => unsubscribe();
    }, [task.id, classroomId]);

    // Use the subscribed questions + legacy history if any (merged deduped)
    // Actually, let's just use the new system. Legacy questions are "archived" unless migrated.
    // For "Shape of the Day", we just use the new live questions.
    const displayQuestions = questions;

    return (
        <div
            className="fixed inset-0 z-overlay flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm transition-all duration-300"
            onClick={onClose}
        >
            <div
                ref={overlayRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="help-modal-title"
                aria-labelledby="help-modal-title"
                className="bg-(--color-bg-tile) w-full max-w-md rounded-2xl border transition-all duration-300 max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border-border-subtle shadow-layered-lg"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-start justify-between p-4 border-b border-border-subtle">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <div className="p-2 rounded-full bg-status-question/10 text-status-question">
                                <HelpCircle className="w-5 h-5" />
                            </div>
                            <h2 id="help-modal-title" className="font-bold text-lg text-brand-textPrimary line-clamp-1" title={task.title}>
                                {task.title}
                            </h2>
                        </div>
                    </div>
                    <button
                        ref={closeButtonRef}
                        onClick={onClose}
                        className="p-1 text-brand-textMuted hover:text-brand-textPrimary transition-colors"
                        aria-label="Close"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Previous Requests (Threaded Chat) */}
                {(displayQuestions.length > 0) && (
                    <div className="flex-1 min-h-0 bg-[var(--color-bg-tile-alt)]/30 border-b border-border-subtle flex flex-col">
                        {/* Chat Content */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar flex flex-col-reverse">
                            {/* Reverse mapping so newest is at bottom visually if we unreversed? No, Firestore order is DESC (Newest first).
                                For a chat log, we usually want Oldest at top, Newest at bottom.
                                Firestore returns Newest First. So we should reverse the array for display.
                            */}
                            {[...displayQuestions].map((q, idx) => (
                                <div key={q.id || idx} className="flex flex-col gap-2">
                                    {/* Student Bubble (Right) */}
                                    <div className="self-end max-w-[85%] flex flex-col items-end gap-1">
                                        <div className="bg-brand-accent/10 border border-[var(--color-brand-accent)] text-brand-textPrimary rounded-2xl rounded-tr-sm px-4 py-2 text-sm shadow-sm w-full">
                                            <CodeBlockRenderer
                                                html={formatMessageToHtml(q.question)}
                                                className="prose-p:my-0 prose-pre:my-2"
                                            />
                                        </div>
                                        <span className="text-[9px] text-brand-textSecondary font-medium px-1">
                                            {q.askedAt?.toDate ? format(q.askedAt.toDate(), 'h:mm a') : 'Just now'}
                                        </span>
                                    </div>

                                    {/* Teacher Response Bubble (Left) */}
                                    {q.resolved && q.teacherResponse && (
                                        <div className="self-start max-w-[85%] flex flex-col items-start gap-1 animate-in slide-in-from-left-2">
                                            <div className="bg-[var(--color-bg-tile)] border border-[var(--color-border-subtle)] text-brand-textPrimary rounded-2xl rounded-tl-sm px-4 py-2 text-sm shadow-md w-full">
                                                <span className="block text-[10px] font-black text-brand-accent uppercase mb-1">Teacher</span>
                                                <CodeBlockRenderer
                                                    html={formatMessageToHtml(q.teacherResponse)}
                                                    className="prose-p:my-0 prose-pre:my-2"
                                                />
                                            </div>
                                            <span className="text-[9px] text-brand-textSecondary font-medium px-1">
                                                {q.resolvedAt?.toDate ? format(q.resolvedAt.toDate(), 'h:mm a') : 'Responded'}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Content */}
                <div className="p-4 flex-1 overflow-y-auto flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                        <textarea
                            value={comment}
                            onChange={handleCommentChange}
                            placeholder={questions.length > 0 ? "Type a reply..." : "Describe what you need help with..."}
                            maxLength={maxChars}
                            autoComplete="off"
                            spellCheck={true}
                            className="w-full h-32 p-3 rounded-xl bg-[var(--color-bg-tile-alt)] border border-[var(--color-border-subtle)] text-brand-textPrimary placeholder-brand-textSecondary focus:outline-none focus:ring-2 focus:ring-brand-accent/20 resize-none transition-all"
                            autoFocus
                            data-testid="help-input"
                        />
                        <div className="flex justify-between items-start px-1 mt-2">
                            <span className="text-xs text-brand-textSecondary ml-auto">
                                {comment.length}/{maxChars}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-border-subtle flex items-center justify-between gap-3 bg-[var(--color-bg-tile)]">
                    {/* Ask AI Button (New Location) */}
                    <button
                        type="button"
                        className="flex items-center gap-2 px-3 py-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 rounded-xl text-xs font-bold transition-colors border border-purple-500/20 opacity-50 cursor-not-allowed"
                        title="Coming Soon"
                    >
                        <Sparkles className="w-4 h-4" />
                        <span>Ask AI</span>
                    </button>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={onClose}
                            className="px-3 py-2 text-brand-textMuted hover:text-brand-textPrimary text-sm font-bold transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmitHelp}
                            disabled={!comment.trim() || isSubmitting}
                            className="flex items-center gap-2 px-4 py-2 bg-brand-accent hover:bg-brand-accent/90 disabled:bg-tile-alt text-white disabled:text-brand-textMuted rounded-xl text-sm font-bold transition-all shadow-lg shadow-brand-accent/20 disabled:shadow-none disabled:cursor-not-allowed"
                            data-testid="submit-help-btn"
                        >
                            {isSubmitting ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Send size={14} />
                            )}
                            Ask Teacher
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Utility Functions ---

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

// Get file icon color
const getFileIconColor = (mimeType: string): string => {
    if (mimeType.startsWith('image/')) return 'text-pink-500';
    if (mimeType.startsWith('video/')) return 'text-purple-500';
    if (mimeType.startsWith('audio/')) return 'text-cyan-500';
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType === 'text/csv') return 'text-green-500';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'text-orange-500';
    if (mimeType === 'application/pdf') return 'text-red-500';
    return 'text-brand-textMuted';
};

// Extract domain from URL
const getUrlDomain = (url: string): string => {
    try {
        const hostname = new URL(url).hostname.replace('www.', '');
        if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) return 'YouTube';
        if (hostname.includes('docs.google.com')) return 'Google Docs';
        if (hostname.includes('drive.google.com')) return 'Google Drive';
        if (hostname.includes('google.com')) return 'Google';
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

// Get hierarchical number for nested tasks
const getHierarchicalNumber = (task: Task | undefined, allTasks: Task[]): string => {
    if (!task) return '...';
    const siblings = task.parentId
        ? allTasks.filter(t => t && t.parentId === task.parentId)
        : allTasks.filter(t => t && !t.parentId);

    siblings.sort((a, b) => (a.presentationOrder || 0) - (b.presentationOrder || 0));
    const myIndex = siblings.findIndex(t => t.id === task.id) + 1;

    if (!task.parentId) return String(myIndex);

    const parent = allTasks.find(t => t.id === task.parentId);
    if (!parent) return String(myIndex);

    return `${getHierarchicalNumber(parent, allTasks)}.${myIndex}`;
};

/**
 * Props for the TaskCard component.
 */
interface TaskCardProps {
    task: Task;
    allTasks: Task[];
    onUpdateStatus: (taskId: string, status: TaskStatus) => void;
    onOpenHelpModal: (task: Task) => void;
    assignedDate?: string;
    formatDateRange: (assigned?: string, due?: string) => string;
    isExpanded: boolean;
    onToggleExpand: () => void;
}



/**
 * TaskCard Component - Redesigned with collapsible status button
 *
 * Features:
 * - Hierarchical numbering
 * - Expand/collapse for descriptions
 * - HTML description support with CodeBlockRenderer
 * - Resources section (links, files)
 * - Collapsible status buttons: single icon expands to show all 4 in fixed positions
 */
const TaskCard: React.FC<TaskCardProps> = ({ task, allTasks, onUpdateStatus, onOpenHelpModal, assignedDate, formatDateRange, isExpanded, onToggleExpand }) => {
    // Removed local isExpanded state - now controlled by parent for accordion behavior
    const [isStatusExpanded, setIsStatusExpanded] = useState(false);
    const [showStatusText, setShowStatusText] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null); // Sequential highlight animation
    const statusTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const textTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const introAnimatedRef = useRef(false); // Track if intro has played

    const hierarchicalNumber = getHierarchicalNumber(task, allTasks);
    const isDone = task.status === 'done';
    const depth = task.path?.length || 0;
    const indent = depth * 24;

    // Map legacy statuses to help
    const normalizedStatus = (task.status as string === 'stuck' || task.status as string === 'question') ? 'help' : task.status;
    const activeAction = STATUS_ACTIONS.find(a => a.id === normalizedStatus) || STATUS_ACTIONS.find(a => a.id === 'todo')!;

    // Separate attachments
    const imageAttachments = task.attachments?.filter(a => a.mimeType.startsWith('image/')) || [];
    const fileAttachments = task.attachments?.filter(a => !a.mimeType.startsWith('image/')) || [];
    const hasResources = imageAttachments.length > 0 || fileAttachments.length > 0 || task.linkURL || (task.links && task.links.length > 0);

    // Expand status menu - stays open while hovering
    const expandStatusMenu = () => {
        setIsStatusExpanded(true);
        setShowStatusText(false); // Hide text while expanded
        if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
        // No timeout while hovering - menu stays open
    };

    const handleActionClick = (actionId: TaskStatus) => {
        setIsStatusExpanded(false);
        if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);

        // Show status text for 3 seconds after clicking
        setShowStatusText(true);
        if (textTimeoutRef.current) clearTimeout(textTimeoutRef.current);
        textTimeoutRef.current = setTimeout(() => setShowStatusText(false), 3000);

        onUpdateStatus(task.id, actionId);
        if (actionId === 'help') {
            onOpenHelpModal({ ...task, status: actionId });
        }
    };

    // Cleanup timeouts on unmount
    useEffect(() => {
        return () => {
            if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
            if (textTimeoutRef.current) clearTimeout(textTimeoutRef.current);
        };
    }, []);

    // Intro animation: Sequential color flash - each button lights up with its accent color
    useEffect(() => {
        if (introAnimatedRef.current || normalizedStatus !== 'todo') return;
        introAnimatedRef.current = true;

        // Small delay before starting intro animation
        const introDelay = setTimeout(() => {
            setIsStatusExpanded(true);

            // Sequential highlight: 0 -> 1 -> 2 -> 3 -> collapse
            // Order: To Do (0), Help (1), In Progress (2), Done (3)
            const highlightDuration = 150; // ms per button
            const pauseBetween = 50; // ms between highlights

            // Highlight each button in sequence
            setTimeout(() => setHighlightedIndex(0), 0); // To Do
            setTimeout(() => setHighlightedIndex(1), highlightDuration + pauseBetween); // Help
            setTimeout(() => setHighlightedIndex(2), (highlightDuration + pauseBetween) * 2); // In Progress
            setTimeout(() => setHighlightedIndex(3), (highlightDuration + pauseBetween) * 3); // Done

            // Clear highlight and collapse
            const totalDuration = (highlightDuration + pauseBetween) * 4;
            const collapseTimeout = setTimeout(() => {
                setHighlightedIndex(null);
                setIsStatusExpanded(false);
            }, totalDuration);

            statusTimeoutRef.current = collapseTimeout;
        }, 300);

        return () => clearTimeout(introDelay);
    }, [normalizedStatus]);

    const ActiveIcon = activeAction.icon;

    return (
        <div
            className={`group relative bg-(--color-bg-tile) 
                rounded-2xl border border-border-subtle 
                hover:border-brand-accent/50 shadow-layered lift-dynamic
                pt-1.5 pb-4 px-5
                transition-all duration-300
                hover:shadow-layered-lg select-none
                ${isDone ? 'opacity-60 shadow-layered-sm' : ''}`}
            style={{
                marginLeft: `${indent}px`,
                width: `calc(100% - ${indent}px)`
            }}
            onDoubleClick={(e) => {
                const target = e.target as HTMLElement;
                const isInteractive = target.closest('a, button, input, [role="button"]');
                if (!isInteractive) {
                    e.preventDefault();
                    onToggleExpand();
                }
            }}
        >
            {/* TOP ROW: Text group + Date & Status Button */}
            <div className="flex items-center gap-3">
                {/* Text Group - number and title only (faded when done) */}
                <div className={`flex items-baseline gap-2 flex-1 min-w-0 ${isDone ? 'opacity-60' : ''}`}>
                    {/* Task Number - underlined with status color, positioned up 4px */}
                    <span className={`text-sm font-bold text-brand-textPrimary shrink-0 underline decoration-2 underline-offset-[3px] relative -top-1 ${activeAction.underlineColor}`}>
                        {hierarchicalNumber}
                    </span>

                    {/* Title - matching ShapeOfDay styling */}
                    <h3 className={`text-xl font-black leading-tight truncate flex-1 min-w-0 ${isDone ? 'text-brand-textMuted line-through decoration-2' : 'text-brand-textPrimary'}`}>
                        {task.title}
                    </h3>
                </div>

                {/* Date + Status Button - shared hover zone for larger target */}
                <div
                    className="flex items-center gap-2 shrink-0 cursor-pointer -my-2 py-2 -mr-2 pr-2"
                    onMouseEnter={() => {
                        // Open menu and start 5-second inactivity timeout
                        if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
                        setIsStatusExpanded(true);
                        setShowStatusText(false);
                        // Auto-collapse after 5 seconds of inactivity
                        statusTimeoutRef.current = setTimeout(() => {
                            setIsStatusExpanded(false);
                            setShowStatusText(true);
                            if (textTimeoutRef.current) clearTimeout(textTimeoutRef.current);
                            textTimeoutRef.current = setTimeout(() => setShowStatusText(false), 3000);
                        }, 5000);
                    }}
                    onMouseLeave={() => {
                        // Collapse immediately when mouse leaves
                        if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
                        setIsStatusExpanded(false);
                        setShowStatusText(true);
                        if (textTimeoutRef.current) clearTimeout(textTimeoutRef.current);
                        textTimeoutRef.current = setTimeout(() => setShowStatusText(false), 3000);
                    }}
                >
                    {/* Date (if exists) */}
                    {(assignedDate || task.dueDate) && (
                        <span className={`text-sm text-brand-textSecondary font-semibold ${isDone ? 'opacity-60' : ''}`}>
                            {formatDateRange(assignedDate, task.dueDate)}
                        </span>
                    )}

                    {/* Container that expands width smoothly */}
                    <div className="flex items-center">
                        {/* All icons in fixed order - fade in when expanded */}
                        <div className={`flex items-center gap-1 overflow-hidden transition-all duration-500 ease-out rounded-lg
                            ${isStatusExpanded ? 'max-w-[180px] opacity-100' : 'max-w-0 opacity-0'}`}
                        >
                            {STATUS_ACTIONS.map((action, index) => {
                                const Icon = action.icon;
                                const isActive = normalizedStatus === action.id;
                                const isHighlighted = highlightedIndex === index;

                                // Get highlight glow color based on action
                                const getHighlightStyle = () => {
                                    if (!isHighlighted) return '';
                                    switch (action.id) {
                                        case 'todo': return 'ring-2 ring-border-subtle bg-tile-alt';
                                        case 'help': return 'ring-2 ring-status-stuck bg-status-stuck/20';
                                        case 'in_progress': return 'ring-2 ring-status-progress bg-status-progress/20';
                                        case 'done': return 'ring-2 ring-status-complete bg-status-complete/20';
                                        default: return '';
                                    }
                                };

                                return (
                                    <button
                                        key={action.id}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleActionClick(action.id);
                                        }}
                                        title={action.label}
                                        aria-label={action.label}
                                        className={`transition-float button-lift-dynamic
                                            p-2 rounded-xl flex items-center justify-center border shadow-layered-sm focus:outline-none min-w-[36px] min-h-[36px]
                                            ${isActive
                                                ? `${action.activeColor} bg-(--color-bg-tile) border-border-strong`
                                                : `text-brand-textSecondary bg-transparent border-transparent hover:bg-(--color-bg-tile-hover) hover:border-border-subtle shadow-none hover:shadow-layered-sm`
                                            }
                                            ${isHighlighted ? action.activeColor : ''}
                                            ${getHighlightStyle()}`}
                                    >
                                        <Icon className={`w-5 h-5 ${isActive || isHighlighted ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                                    </button>
                                );
                            })}
                        </div>

                        {/* Collapsed state - depends on status */}
                        {!isStatusExpanded && (
                            normalizedStatus === 'todo' ? (
                                /* To Do: Show filled button matching UI.md button patterns */
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        expandStatusMenu();
                                    }}
                                    title="To Do - Click to change status"
                                    aria-label="Current status: To Do. Click to change."
                                    className="px-3 h-7 rounded-md transition-float
                                        bg-tile-alt text-brand-textSecondary
                                        border border-border-subtle
                                        font-bold text-sm
                                        hover:bg-(--color-bg-tile-hover) hover:border-border-strong hover:text-brand-textPrimary
                                        focus:outline-none focus:ring-2 focus:ring-brand-accent/20
                                        flex items-center justify-center
                                        shadow-layered-sm button-lift-dynamic"
                                >
                                    To Do
                                </button>
                            ) : (
                                /* Other statuses: Show icon with optional text */
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        expandStatusMenu();
                                    }}
                                    title={`${activeAction.label} - Click to change`}
                                    aria-label={`Current status: ${activeAction.label}. Click to change.`}
                                    className={`p-1.5 rounded-lg transition-all duration-300 ease-out
                                        min-h-[32px] flex items-center gap-1.5
                                        focus:outline-none
                                        ${activeAction.activeColor}`}
                                >
                                    {/* Status text - show for 3 seconds after clicking or collapse */}
                                    {showStatusText && (
                                        <span className="text-sm font-semibold whitespace-nowrap">
                                            {activeAction.label}
                                        </span>
                                    )}
                                    <ActiveIcon className="w-5 h-5 stroke-[2.5px]" />
                                </button>
                            )
                        )}
                    </div>
                </div>
            </div>

            {/* Description - Always render single instance, control visibility via isExpanded */}
            {task.description && (
                <div className={`mt-3 overflow-hidden min-w-0 ${isDone ? 'opacity-60' : ''}`}>
                    <div className="select-text w-full min-w-0">
                        {containsHtml(task.description) ? (
                            <CodeBlockRenderer
                                key={`desc-${task.id}-${isExpanded}`}
                                html={task.description}
                                isExpanded={isExpanded}
                                className="text-sm text-brand-textSecondary"
                            />
                        ) : (
                            <p className={`text-sm leading-relaxed text-brand-textSecondary whitespace-pre-wrap ${!isExpanded ? 'line-clamp-2' : ''}`}>
                                {task.description}
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Comment/Help Request - Only when expanded */}
            {isExpanded && task.comment && (
                <div className={`mt-3 ${isDone ? 'opacity-60' : ''}`}>
                    <div className="text-xs text-brand-textSecondary italic bg-status-stuck/10 p-3 rounded-xl border border-status-stuck/20 flex items-start gap-2">
                        <HelpCircle size={14} className="text-status-stuck shrink-0 mt-0.5" />
                        <span>"{task.comment}"</span>
                    </div>
                </div>
            )}

            {/* Resources Section - Only when expanded */}
            {hasResources && isExpanded && (
                <div className="mt-4 pt-3 border-t border-border-subtle">
                    <p className="text-[10px] font-black text-brand-textMuted uppercase mb-2">Resources</p>
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Image Thumbnails */}
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
                                    className="w-16 h-16 object-cover rounded-xl border border-border-subtle hover:border-brand-accent transition-colors"
                                    loading="lazy"
                                />
                            </a>
                        ))}

                        {/* Links */}
                        {(task.links && task.links.length > 0) ? (
                            task.links.map((link) => (
                                <a
                                    key={link.id}
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 px-3 py-2 rounded-lg
                                                bg-brand-accent/5 border border-brand-accent/20
                                                hover:bg-brand-accent/10 transition-colors text-sm"
                                    title={link.url}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <ExternalLink size={14} className="text-brand-accent shrink-0" />
                                    <span className="font-bold text-brand-textPrimary truncate max-w-[120px]">
                                        {link.title || getUrlDomain(link.url)}
                                    </span>
                                </a>
                            ))
                        ) : task.linkURL && (
                            <a
                                href={task.linkURL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-3 py-2 rounded-lg
                                            bg-brand-accent/5 border border-brand-accent/20
                                            hover:bg-brand-accent/10 transition-colors text-sm"
                                title={task.linkURL}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <ExternalLink size={14} className="text-brand-accent shrink-0" />
                                <span className="font-bold text-brand-textPrimary truncate max-w-[120px]">
                                    {task.linkTitle || getUrlDomain(task.linkURL)}
                                </span>
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
                                    className="flex items-center gap-2 px-3 py-2 rounded-xl
                                                bg-tile-alt border border-border-subtle
                                                text-sm font-bold hover:border-brand-accent transition-float button-lift-dynamic shadow-layered-sm"
                                    title={`${attachment.filename} (${(attachment.size / 1024).toFixed(1)} KB)`}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <FileIcon size={14} className={`shrink-0 ${iconColor}`} />
                                    <span className="truncate max-w-[100px] text-brand-textPrimary">{attachment.filename}</span>
                                </a>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Expand/Collapse Chevron - Bottom Right */}
            {(task.description || hasResources) && (
                <div className="flex justify-end mt-2">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleExpand();
                        }}
                        className="p-1.5 rounded-lg hover:bg-(--color-bg-tile-hover) transition-colors"
                        aria-label={isExpanded ? 'Collapse' : 'Expand'}
                        title={isExpanded ? 'Show less' : 'Show more'}
                    >
                        {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-brand-textSecondary" />
                        ) : (
                            <ChevronDown className="w-5 h-5 text-brand-textSecondary" />
                        )}
                    </button>
                </div>
            )}
        </div>
    );
};


/**
 * Props for the CurrentTaskList component.
 */
interface CurrentTaskListProps {
    tasks: Task[];
    onUpdateStatus: (taskId: string, status: TaskStatus) => void;
    onUpdateComment: (taskId: string, comment: string) => void;
    assignedDate?: string;
    studentName: string;
    classroomId: string;
}

/**
 * CurrentTaskList Component
 * 
 * Renders the list of active tasks for the day.
 * Handles sorting and manages the HelpModal state.
 */
const CurrentTaskList: React.FC<CurrentTaskListProps> = ({
    tasks,
    onUpdateStatus,
    onUpdateComment,
    assignedDate,
    studentName,
    classroomId
}) => {
    const [helpModalTask, setHelpModalTask] = useState<Task | null>(null);
    const [showCelebration, setShowCelebration] = useState(false);
    const [previousProgress, setPreviousProgress] = useState(0);
    // Accordion behavior: only one task can be expanded at a time
    const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

    // Track task completion for celebrations
    const completedCount = tasks.filter(t => t.status === 'done').length;
    const currentProgress = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;
    const allComplete = completedCount === tasks.length && tasks.length > 0;

    // Detect when all tasks are completed
    useEffect(() => {
        if (allComplete && previousProgress < 100) {
            setShowCelebration(true);
        }
        setPreviousProgress(currentProgress);
    }, [allComplete, currentProgress, previousProgress]);

    // Helper functions for date formatting
    const formatSingleDate = (dateString: string): string => {
        return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const isToday = (dateString: string): boolean => {
        const today = new Date().toISOString().split('T')[0];
        const checkDate = dateString.includes('-') ? dateString : new Date(dateString).toISOString().split('T')[0];
        return checkDate === today;
    };

    const isSameDay = (date1: string, date2: string): boolean => {
        const d1 = date1.includes('-') ? date1 : new Date(date1).toISOString().split('T')[0];
        const d2 = date2.includes('-') ? date2 : new Date(date2).toISOString().split('T')[0];
        return d1 === d2;
    };

    const formatDateRange = (assigned?: string, due?: string): string => {
        if (!assigned && !due) return '';
        if (!assigned && due) return isToday(due) ? 'Due Today' : formatSingleDate(due);
        if (assigned && !due) return isToday(assigned) ? 'Today' : formatSingleDate(assigned);

        if (assigned && due) {
            const assignedIsToday = isToday(assigned);
            const dueIsToday = isToday(due);
            const sameDay = isSameDay(assigned, due);

            if (sameDay) return assignedIsToday ? 'Due Today' : formatSingleDate(due);

            const assignedDate = new Date(assigned);
            const dueDate = new Date(due);
            const sameMonth = assignedDate.getMonth() === dueDate.getMonth() &&
                assignedDate.getFullYear() === dueDate.getFullYear();

            const assignedStr = assignedIsToday ? 'Today' : formatSingleDate(assigned);
            const dueStr = dueIsToday ? 'Today' : (sameMonth ? dueDate.getDate().toString() : formatSingleDate(due));

            return `${assignedStr} - ${dueStr}`;
        }

        return '';
    };

    const handleOpenHelpModal = (task: Task) => {
        setHelpModalTask(task);
    };

    const handleCloseHelpModal = () => {
        setHelpModalTask(null);
    };

    if (tasks.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 bg-(--color-bg-tile) rounded-2xl border border-dashed border-border-subtle w-full text-center shadow-layered-sm">
                <div className="w-16 h-16 bg-tile-alt rounded-full flex items-center justify-center mb-4">
                    <CheckCircle className="w-8 h-8 text-brand-textMuted" />
                </div>
                <h3 className="text-lg font-black text-brand-textPrimary mb-1 uppercase tracking-tight">All Caught Up!</h3>
                <p className="text-brand-textSecondary max-w-xs mx-auto text-sm">
                    You have no tasks for today. Enjoy your free time or check upcoming days.
                </p>
            </div>
        );
    }

    // Sort tasks: Active first, completed at bottom
    const sortedTasks = [...tasks].sort((a, b) => {
        const aDone = a.status === 'done';
        const bDone = b.status === 'done';
        if (aDone === bDone) return 0;
        return aDone ? 1 : -1;
    });

    return (
        <div className="flex flex-col gap-4 w-full">
            {/* Progress now shown in header */}

            {sortedTasks.map((task) => (
                <TaskCard
                    key={task.id}
                    task={task}
                    allTasks={tasks}
                    onUpdateStatus={onUpdateStatus}
                    onOpenHelpModal={handleOpenHelpModal}
                    assignedDate={assignedDate}
                    formatDateRange={formatDateRange}
                    isExpanded={expandedTaskId === task.id}
                    onToggleExpand={() => setExpandedTaskId(expandedTaskId === task.id ? null : task.id)}
                />
            ))}

            {helpModalTask && (
                <HelpModal
                    task={helpModalTask}
                    onClose={handleCloseHelpModal}
                    onUpdateComment={onUpdateComment}
                    studentName={studentName}
                    classroomId={classroomId}
                />
            )}

            {/* Celebration when all tasks complete */}
            <CelebrationModal
                isOpen={showCelebration}
                onClose={() => setShowCelebration(false)}
                type="all-tasks"
            />

            {/* Progress milestones */}
            <ProgressCelebration
                progress={currentProgress}
                previousProgress={previousProgress}
            />
        </div>
    );
};

export default CurrentTaskList;
