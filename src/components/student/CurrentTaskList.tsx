import React, { useState, useEffect, useRef, useCallback } from 'react';
import { HelpCircle, Play, CheckCircle, RotateCcw, X, LucideIcon, Send, MessageCircle, ExternalLink, File, FileText, FileImage, FileVideo, FileAudio, FileSpreadsheet, Presentation, ChevronDown, ChevronUp } from 'lucide-react';
import { Task, TaskStatus } from '../../types';

import { sanitizeComment, filterProfanity } from '../../utils/security';
import { sanitizeHelpRequest } from '../../utils/textSanitizer';
import { addQuestionToTask } from '../../services/firestoreService';
import { auth } from '../../firebase';
import toast from 'react-hot-toast';

import { CelebrationModal, ProgressCelebration } from '../shared/Celebration';
import { CodeBlockRenderer } from '../shared/CodeBlockRenderer';

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
        activeColor: 'text-gray-500',
        underlineColor: 'decoration-gray-300',
        hover: 'hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800',
        borderColor: 'border-gray-200 dark:border-gray-700'
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

// Pre-defined help options
const HELP_OPTIONS = [
    { id: 'dont-understand', label: "I don't understand", text: "I don't understand" },
    { id: 'stuck', label: "I'm stuck", text: "I'm stuck on something" },
    { id: 'question', label: "I have a question", text: "I have a question about" },
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
    const [submittedQuestions, setSubmittedQuestions] = useState<string[]>([]);
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
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
     * Handle selecting a pre-defined option
     */
    const handleOptionSelect = (option: typeof HELP_OPTIONS[0]) => {
        setSelectedOption(option.id);
        // If comment is empty or matches a previous option, set to the new option text
        const optionTexts = HELP_OPTIONS.map(o => o.text);
        if (!comment.trim() || optionTexts.some(t => comment.startsWith(t))) {
            setComment(option.text + ': ');
        }
    };

    /**
     * Submit the help request to the task's question history
     */
    const handleSubmitHelp = async () => {
        if (!comment.trim() || !auth.currentUser) return;

        setIsSubmitting(true);
        try {
            const sanitized = sanitizeComment(comment, maxChars);

            // Save to task's questionHistory in Firestore
            await addQuestionToTask(task.id, {
                studentId: auth.currentUser.uid,
                studentName: studentName,
                classroomId: classroomId,
                question: sanitized,
            });

            // Also update the comment for immediate display
            onUpdateComment(task.id, sanitized);

            // Track submitted question
            setSubmittedQuestions(prev => [...prev, sanitized]);

            toast.success('Help request sent to teacher!');
            setComment('');
            setSelectedOption(null);
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

    // Get previous questions for this task
    const previousQuestions = task.questionHistory?.filter(
        q => q.classroomId === classroomId
    ) || [];

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
                className="bg-brand-lightSurface dark:bg-brand-darkSurface w-full max-w-md rounded-xl shadow-2xl border-2 border-status-question transform transition-all duration-300 max-h-[90vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-start justify-between p-4 border-b border-gray-100 dark:border-gray-800">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <HelpCircle className="w-5 h-5 text-status-question" />
                            <h2 id="help-modal-title" className="font-bold text-lg text-brand-textDarkPrimary dark:text-brand-textPrimary">
                                Need Help?
                            </h2>
                        </div>
                        <p className="text-sm text-brand-textDarkSecondary dark:text-brand-textSecondary">
                            {task.title}
                        </p>
                    </div>
                    <button
                        ref={closeButtonRef}
                        onClick={onClose}
                        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                        aria-label="Close"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Previous Questions */}
                {(previousQuestions.length > 0 || submittedQuestions.length > 0) && (
                    <div className="px-4 pt-3 max-h-32 overflow-y-auto border-b border-gray-100 dark:border-gray-800">
                        <div className="flex items-center gap-2 mb-2">
                            <MessageCircle size={14} className="text-gray-400" />
                            <span className="text-xs font-medium text-gray-500 uppercase">Previous Requests</span>
                        </div>
                        <div className="space-y-2 pb-3">
                            {previousQuestions.map((q, idx) => (
                                <div key={q.id || idx} className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded-lg">
                                    <span className="text-brand-textDarkSecondary dark:text-brand-textSecondary">
                                        "{q.question}"
                                    </span>
                                    {q.resolved && q.teacherResponse && (
                                        <div className="mt-1 pl-2 border-l-2 border-brand-accent text-brand-accent">
                                            Teacher: {q.teacherResponse}
                                        </div>
                                    )}
                                </div>
                            ))}
                            {submittedQuestions.map((q, idx) => (
                                <div key={`new-${idx}`} className="text-xs bg-green-50 dark:bg-green-900/20 p-2 rounded-lg border border-green-200 dark:border-green-800">
                                    <span className="text-green-700 dark:text-green-400">
                                        âœ“ "{q}" (just submitted)
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Pre-defined Options */}
                <div className="px-4 pt-4">
                    <p className="text-sm font-medium text-brand-textDarkPrimary dark:text-brand-textPrimary mb-2">
                        What kind of help do you need?
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {HELP_OPTIONS.map((option) => (
                            <button
                                key={option.id}
                                onClick={() => handleOptionSelect(option)}
                                className={`px-3 py-1.5 rounded-full text-sm font-medium border-2 transition-all ${selectedOption === option.id
                                    ? 'bg-status-question/10 text-status-question border-status-question'
                                    : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-status-question/50'
                                    }`}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="p-4 flex-1 overflow-y-auto">
                    <label className="block text-sm font-medium text-brand-textDarkPrimary dark:text-brand-textPrimary mb-1">
                        Tell your teacher more:
                    </label>
                    {/* PRIVACY: Teacher visibility warning */}
                    <p className="text-xs text-amber-600 dark:text-amber-400 mb-2 flex items-center gap-1">
                        <span>âš ï¸</span>
                        <span>Your teacher will see this message</span>
                    </p>
                    <div className="relative">
                        <textarea
                            value={comment}
                            onChange={handleCommentChange}
                            placeholder="Describe what you need help with..."
                            maxLength={maxChars}
                            autoComplete="off"
                            spellCheck={true}
                            className="w-full h-24 p-3 rounded-lg bg-brand-light dark:bg-brand-dark border-2 border-gray-200 dark:border-gray-700 text-brand-textDarkPrimary dark:text-brand-textPrimary focus:ring-2 focus:ring-offset-2 focus:ring-status-question dark:focus:ring-offset-brand-darkSurface focus:border-status-question resize-none transition-all outline-none"
                            autoFocus
                            data-testid="help-input"
                        />
                        <div className="absolute bottom-2 right-2 text-xs text-gray-400">
                            {comment.length}/{maxChars}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex justify-between gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-brand-light dark:bg-brand-dark hover:bg-gray-100 dark:hover:bg-gray-800 text-brand-textDarkPrimary dark:text-brand-textPrimary rounded-lg text-sm font-medium transition-colors"
                    >
                        Close
                    </button>
                    <button
                        onClick={handleSubmitHelp}
                        disabled={!comment.trim() || isSubmitting}
                        className="flex items-center gap-2 px-4 py-2 bg-status-question hover:bg-status-question/90 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white disabled:text-gray-500 rounded-lg text-sm font-medium transition-colors disabled:cursor-not-allowed"
                        data-testid="submit-help-btn"
                    >
                        {isSubmitting ? (
                            <span className="animate-spin">â³</span>
                        ) : (
                            <Send size={14} />
                        )}
                        Send Help Request
                    </button>
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
    return 'text-gray-500';
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
const getHierarchicalNumber = (task: Task, allTasks: Task[]): string => {
    const siblings = task.parentId
        ? allTasks.filter(t => t.parentId === task.parentId)
        : allTasks.filter(t => !t.parentId);

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
            className={`group relative bg-brand-lightSurface dark:bg-brand-darkSurface 
                rounded-xl border-2 border-gray-300 dark:border-gray-600 
                hover:border-brand-accent/50 hover:shadow-sm hover:shadow-brand-accent/5
                pt-1.5 pb-4 px-5
                transition-all duration-200
                hover:-translate-y-0.5 select-none
                ${isDone ? 'opacity-60' : ''}`}
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
                    <span className={`text-sm font-bold text-brand-textDarkPrimary dark:text-brand-textPrimary shrink-0 underline decoration-2 underline-offset-[3px] relative -top-1 ${activeAction.underlineColor}`}>
                        {hierarchicalNumber}
                    </span>

                    {/* Title - matching ShapeOfDay styling */}
                    <h3 className={`text-xl font-black leading-tight truncate flex-1 min-w-0 ${isDone ? 'text-gray-500 line-through decoration-2' : 'text-brand-textDarkPrimary dark:text-brand-textPrimary'}`}>
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
                        <span className={`text-sm text-gray-400 dark:text-gray-500 font-semibold ${isDone ? 'opacity-60' : ''}`}>
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
                                        case 'todo': return 'ring-2 ring-gray-400 bg-gray-100 dark:bg-gray-700';
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
                                        className={`p-1.5 rounded-lg transition-all duration-150 ease-out
                                            min-w-[32px] min-h-[32px] flex items-center justify-center
                                            focus:outline-none
                                            ${isHighlighted ? action.activeColor : ''}
                                            ${getHighlightStyle()}
                                            ${!isHighlighted && (isActive
                                                ? `${action.activeColor} bg-white dark:bg-brand-darkSurface shadow-sm`
                                                : `text-gray-400 dark:text-gray-500 ${action.hover}`
                                            )}`}
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
                                    className="px-3 h-7 rounded-md transition-all duration-300 ease-out
                                        bg-gray-500 dark:bg-gray-800/50
                                        border-2 border-gray-600 dark:border-gray-500
                                        text-white font-semibold text-sm
                                        hover:bg-gray-600 dark:hover:bg-gray-700/50
                                        focus:outline-none focus:ring-2 focus:ring-gray-400/50
                                        flex items-center justify-center
                                        shadow-sm"
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
                                className="text-sm text-brand-textDarkSecondary dark:text-brand-textSecondary"
                            />
                        ) : (
                            <p className={`text-sm leading-relaxed text-brand-textDarkSecondary dark:text-brand-textSecondary whitespace-pre-wrap ${!isExpanded ? 'line-clamp-2' : ''}`}>
                                {task.description}
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Comment/Help Request - Only when expanded */}
            {isExpanded && task.comment && (
                <div className={`mt-3 ${isDone ? 'opacity-60' : ''}`}>
                    <div className="text-xs text-brand-textDarkSecondary dark:text-brand-textSecondary italic bg-status-stuck/10 p-3 rounded-lg border border-status-stuck/20 flex items-start gap-2">
                        <HelpCircle size={14} className="text-status-stuck shrink-0 mt-0.5" />
                        <span>"{task.comment}"</span>
                    </div>
                </div>
            )}

            {/* Resources Section - Only when expanded */}
            {hasResources && isExpanded && (
                <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
                    <p className="text-xs font-medium text-gray-400 uppercase mb-2">Resources</p>
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
                                    className="w-16 h-16 object-cover rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-brand-accent transition-colors"
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
                                    <span className="font-medium text-brand-textDarkPrimary dark:text-brand-textPrimary truncate max-w-[120px]">
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
                                <span className="font-medium text-brand-textDarkPrimary dark:text-brand-textPrimary truncate max-w-[120px]">
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
                                    className="flex items-center gap-2 px-3 py-2 rounded-lg
                                                bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700
                                                text-sm font-medium hover:border-brand-accent transition-colors"
                                    title={`${attachment.filename} (${(attachment.size / 1024).toFixed(1)} KB)`}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <FileIcon size={14} className={`shrink-0 ${iconColor}`} />
                                    <span className="truncate max-w-[100px] text-gray-700 dark:text-gray-300">{attachment.filename}</span>
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
                        className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        aria-label={isExpanded ? 'Collapse' : 'Expand'}
                        title={isExpanded ? 'Show less' : 'Show more'}
                    >
                        {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
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
            <div className="flex flex-col items-center justify-center py-16 bg-brand-lightSurface dark:bg-brand-darkSurface rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 w-full text-center">
                <div className="w-16 h-16 bg-brand-light dark:bg-brand-dark rounded-full flex items-center justify-center mb-4">
                    <CheckCircle className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                </div>
                <h3 className="text-lg font-bold text-brand-textDarkPrimary dark:text-brand-textPrimary mb-1">All Caught Up!</h3>
                <p className="text-brand-textDarkSecondary dark:text-brand-textSecondary max-w-xs mx-auto">
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
