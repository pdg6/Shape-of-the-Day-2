
import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Loader2, User } from 'lucide-react';
import { format } from 'date-fns';
import { QuestionEntry, Task } from '../../types';
import { subscribeToTaskQuestions, resolveQuestion } from '../../services/firestoreService';
import toast from 'react-hot-toast';
import { CodeBlockRenderer } from '../shared/CodeBlockRenderer';
import { formatMessageToHtml } from '../../utils/markdownFormatter';

interface TeacherChatModalProps {
    taskId: string;
    studentId: string;
    studentName: string;
    taskTitle: string;
    onClose: () => void;
}

export const TeacherChatModal: React.FC<TeacherChatModalProps> = ({
    taskId,
    studentId,
    studentName,
    taskTitle,
    onClose
}) => {
    const [questions, setQuestions] = useState<QuestionEntry[]>([]);
    const [replyText, setReplyText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Scroll to bottom on updates
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [questions]);

    // Subscribe to questions for this specific student and task
    useEffect(() => {
        const unsubscribe = subscribeToTaskQuestions(
            taskId,
            (fetchedQuestions) => {
                setQuestions(fetchedQuestions);

                // Find the latest unresolved question to reply to
                // Questions are ordered by askedAt desc (newest first)
                // We want the newest UNRESOLVED question
                const latestUnresolved = fetchedQuestions.find(q => !q.resolved);
                setActiveQuestionId(latestUnresolved ? latestUnresolved.id : null);
            },
            null, // classroomId not required for subcollection query
            studentId
        );

        return () => unsubscribe();
    }, [taskId, studentId]);

    const handleSendReply = async () => {
        if (!replyText.trim() || !activeQuestionId) return;

        setIsSubmitting(true);
        try {
            await resolveQuestion(taskId, activeQuestionId, replyText.trim());
            toast.success('Reply sent');
            setReplyText('');
        } catch (error) {
            console.error('Error sending reply:', error);
            toast.error('Failed to send reply');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Derived state for UI: Are we chatting or is it read-only?
    const canReply = !!activeQuestionId;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className="bg-[var(--color-bg-tile)] w-full max-w-md rounded-2xl border border-border-subtle shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border-subtle bg-[var(--color-bg-tile-alt)]">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-brand-accent/10 border border-brand-accent/20 text-brand-accent">
                            <User className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="font-bold text-brand-textPrimary text-lg leading-tight">
                                {studentName}
                            </h2>
                            <p className="text-xs text-brand-textSecondary font-medium line-clamp-1">
                                {taskTitle}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-brand-textMuted hover:text-brand-textPrimary rounded-lg hover:bg-white/5 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Chat History */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar bg-[var(--color-bg-tile)]">
                    {questions.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-brand-textSecondary opacity-50">
                            <p>No messages yet.</p>
                        </div>
                    ) : (
                        // QUESTIONS are Oldest -> Newest visually usually, but fetched Newest -> First.
                        // We should REVERSE them for chronological display (Oldest Top, Newest Bottom).
                        [...questions].reverse().map((q) => (
                            <div key={q.id} className="flex flex-col gap-3">
                                {/* Student Question (Left - "Other") */}
                                <div className="flex flex-col items-start max-w-[85%] self-start gap-1">
                                    <div className="bg-[var(--color-bg-tile-alt)] border border-border-subtle text-brand-textPrimary px-4 py-2.5 rounded-2xl rounded-tl-sm shadow-sm w-full">
                                        <CodeBlockRenderer
                                            html={formatMessageToHtml(q.question)}
                                            className="prose-p:my-0 prose-pre:my-2"
                                        />
                                    </div>
                                    <span className="text-[10px] text-brand-textSecondary px-1">
                                        {q.askedAt?.toDate ? format(q.askedAt.toDate(), 'h:mm a') : '...'}
                                    </span>
                                </div>

                                {/* Teacher Response (Right - "Self") */}
                                {q.resolved && q.teacherResponse && (
                                    <div className="flex flex-col items-end max-w-[85%] self-end gap-1">
                                        <div className="bg-brand-accent text-white px-4 py-2.5 rounded-2xl rounded-tr-sm shadow-md w-full">
                                            <CodeBlockRenderer
                                                html={formatMessageToHtml(q.teacherResponse)}
                                                className="prose-p:my-0 prose-pre:my-2 prose-headings:text-white prose-code:bg-white/10 prose-pre:bg-black/20"
                                            />
                                        </div>
                                        <span className="text-[10px] text-brand-textSecondary px-1">
                                            {q.resolvedAt?.toDate ? format(q.resolvedAt.toDate(), 'h:mm a') : 'Sent'}
                                        </span>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 border-t border-border-subtle bg-[var(--color-bg-tile-alt)]">
                    <div className="flex gap-2">
                        <textarea
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder={canReply ? "Type a reply..." : "No open questions to reply to."}
                            disabled={!canReply || isSubmitting}
                            className="flex-1 bg-[var(--color-bg-tile)] text-brand-textPrimary placeholder-brand-textSecondary/50 border border-border-subtle rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent resize-none h-12 custom-scrollbar disabled:opacity-50 disabled:cursor-not-allowed"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendReply();
                                }
                            }}
                        />
                        <button
                            onClick={handleSendReply}
                            disabled={!canReply || !replyText.trim() || isSubmitting}
                            className="flex items-center justify-center w-12 h-12 bg-brand-accent hover:bg-brand-accent/90 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-xl shadow-lg shadow-brand-accent/20 transition-all active:scale-95 disabled:shadow-none disabled:active:scale-100"
                        >
                            {isSubmitting ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <Send className="w-5 h-5 ml-0.5" />
                            )}
                        </button>
                    </div>
                    {!canReply && questions.length > 0 && (
                        <p className="text-[10px] text-brand-textSecondary mt-2 text-center">
                            All questions have been resolved. Wait for the student to ask more.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};
