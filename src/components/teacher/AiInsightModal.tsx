import React, { useState } from 'react';
import { X, Sparkles, Brain, ArrowRight, Plus, Loader2, CheckCircle2 } from 'lucide-react';
import { StruggleAnalysis, Task } from '../../types';
import { CodeBlockRenderer } from '../shared/CodeBlockRenderer';
import { formatMessageToHtml } from '../../utils/markdownFormatter';
import toast from 'react-hot-toast';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface AiInsightModalProps {
    classroomId: string;
    type: 'struggles' | 'scaffolding';
    insight?: StruggleAnalysis;
    suggestedTasks?: Task[];
    onClose: () => void;
    onTasksApproved?: (tasks: Task[]) => void;
}

export const AiInsightModal: React.FC<AiInsightModalProps> = ({
    classroomId,
    type,
    insight,
    suggestedTasks,
    onClose,
    onTasksApproved
}) => {
    const [isAdding, setIsAdding] = useState(false);
    const [addedTaskIds, setAddedTaskIds] = useState<string[]>([]);

    const handleAddTask = async (task: Task) => {
        setIsAdding(true);
        try {
            const db = getFirestore();
            // Add as a purple draft
            const taskData = {
                ...task,
                status: 'draft',
                description: task.description || task.structuredContent?.instructions?.map((s, i) => `${i + 1}. ${s}`).join('\n') || '',
                selectedRoomIds: [classroomId],
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                isAiGenerated: true
            };

            // Remove ID if it was a tempId from AI
            if (taskData.id?.startsWith('temp_')) {
                delete (taskData as any).id;
            }

            await addDoc(collection(db, 'tasks'), taskData);
            setAddedTaskIds(prev => [...prev, task.id]);
            toast.success(`Scaffolding task "${task.title}" added to drafts`);
        } catch (error) {
            console.error('Error adding scaffolding task:', error);
            toast.error('Failed to add task');
        } finally {
            setIsAdding(false);
        }
    };

    const handleAddAll = async () => {
        if (!suggestedTasks) return;
        setIsAdding(true);
        try {
            for (const task of suggestedTasks) {
                if (!addedTaskIds.includes(task.id)) {
                    await handleAddTask(task);
                }
            }
            toast.success('All suggested tasks added to drafts');
        } catch (error) {
            console.error('Error adding all tasks:', error);
        } finally {
            setIsAdding(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            <div
                className="bg-[var(--color-bg-tile)] w-full max-w-2xl rounded-2xl border border-[var(--color-border-subtle)] shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-tile-alt)]">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                            {type === 'struggles' ? <Brain className="w-6 h-6" /> : <Sparkles className="w-6 h-6" />}
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-brand-textPrimary">
                                {type === 'struggles' ? 'Class Struggle Analysis' : 'Suggest Scaffolding'}
                            </h2>
                            <p className="text-sm text-brand-textSecondary font-medium">
                                AI-powered pedagogical support
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-brand-textMuted hover:text-brand-textPrimary rounded-lg hover:bg-white/5 transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                    {type === 'struggles' && insight && (
                        <>
                            {/* Summary */}
                            <section className="space-y-3">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-brand-textSecondary flex items-center gap-2">
                                    <ArrowRight className="w-3 h-3" /> Synthesis
                                </h3>
                                <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-brand-textPrimary leading-relaxed">
                                    {insight.summary}
                                </div>
                            </section>

                            {/* Top Struggles */}
                            <section className="space-y-3">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-brand-textSecondary flex items-center gap-2">
                                    <ArrowRight className="w-3 h-3" /> Core Blockers
                                </h3>
                                <div className="grid gap-3">
                                    {insight.topStruggles.map((struggle, idx) => (
                                        <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-red-500/5 border border-red-500/10">
                                            <div className="mt-1 w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                                            <span className="text-sm text-brand-textPrimary">{struggle}</span>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            {/* Suggestions */}
                            <section className="space-y-3">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-brand-textSecondary flex items-center gap-2">
                                    <ArrowRight className="w-3 h-3" /> Actionable Tips
                                </h3>
                                <div className="grid gap-3">
                                    {insight.suggestions.map((tip, idx) => (
                                        <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-green-500/5 border border-green-500/10">
                                            <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                                            <span className="text-sm text-brand-textPrimary">{tip}</span>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        </>
                    )}

                    {type === 'scaffolding' && suggestedTasks && (
                        <div className="space-y-6">
                            <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/10 text-sm text-purple-200/80 leading-relaxed italic">
                                "I've designed these tasks to bridge the conceptual gaps I detected in your students' questions. They appear as 'Purple Drafts' in your inventory once approved."
                            </div>

                            <div className="grid gap-4">
                                {suggestedTasks.map((task) => (
                                    <div
                                        key={task.id}
                                        className="group relative p-4 rounded-2xl bg-[var(--color-bg-tile-alt)] border border-[var(--color-border-subtle)] hover:border-purple-500/50 transition-all shadow-lg hover:shadow-purple-500/10"
                                    >
                                        <div className="flex justify-between items-start gap-4">
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-500/20 text-purple-400 border border-purple-500/30">
                                                        {task.type}
                                                    </span>
                                                    <h4 className="font-bold text-brand-textPrimary">{task.title}</h4>
                                                </div>
                                                <div className="text-sm text-brand-textSecondary line-clamp-2">
                                                    {task.structuredContent?.rationale}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleAddTask(task)}
                                                disabled={isAdding || addedTaskIds.includes(task.id)}
                                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all shrink-0
                                                    ${addedTaskIds.includes(task.id)
                                                        ? 'bg-green-500/10 text-green-400 border border-green-500/20 cursor-default'
                                                        : 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/20 active:scale-95 disabled:opacity-50'}`}
                                            >
                                                {addedTaskIds.includes(task.id) ? (
                                                    <>
                                                        <CheckCircle2 className="w-4 h-4" />
                                                        <span>Added</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Plus className="w-4 h-4" />
                                                        <span>Add Draft</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-[var(--color-border-subtle)] bg-[var(--color-bg-tile-alt)] flex justify-between items-center">
                    <div className="text-xs text-brand-textMuted flex items-center gap-2">
                        <Sparkles className="w-3 h-3" /> AI insights based on live student data
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-6 py-2.5 rounded-xl font-bold text-brand-textSecondary hover:text-brand-textPrimary hover:bg-white/5 transition-all"
                        >
                            Close
                        </button>
                        {type === 'scaffolding' && suggestedTasks && suggestedTasks.length > 1 && (
                            <button
                                onClick={handleAddAll}
                                disabled={isAdding || addedTaskIds.length === suggestedTasks.length}
                                className="px-6 py-2.5 rounded-xl font-bold bg-white/10 hover:bg-white/20 text-brand-textPrimary border border-white/10 transition-all disabled:opacity-50"
                            >
                                {isAdding ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Add All to Drafts'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
