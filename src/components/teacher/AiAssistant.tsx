import { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, Loader, ArrowRight, Save, RotateCcw, Link as LinkIcon, FilePlus, X, Paperclip, Youtube, Brain } from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage, auth } from '../../firebase';
import { bulkSaveTasks } from '../../services/firestoreService';
import { TaskFormData, Task } from '../../types';
import { CodeBlockRenderer } from '../shared/CodeBlockRenderer';
import { formatMessageToHtml } from '../../utils/markdownFormatter';
import * as aiService from '../../services/aiService';
import { useAiStore, AiMessage } from '../../store/aiStore';
import toast from 'react-hot-toast';

interface AiAssistantProps {
    currentFormData: TaskFormData;
    onApply: (suggestion: Task) => void;
    taskId?: string | null;
    subject?: string;
    gradeLevel?: string;
}

export const AiAssistant = ({ currentFormData, onApply, taskId, subject, gradeLevel }: AiAssistantProps) => {
    const {
        messages,
        addMessage,
        updateMessage,
        clearMessages,
        isProcessing,
        setProcessing
    } = useAiStore();

    const [input, setInput] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [attachments, setAttachments] = useState<any[]>([]);
    const [showLinkInput, setShowLinkInput] = useState(false);
    const [linkInput, setLinkInput] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Initial message if empty
    useEffect(() => {
        // Double-check if we already have an assistant message to prevent duplicates
        const hasAssistantMessage = messages.some(m => m.role === 'assistant');
        if (!hasAssistantMessage && !isProcessing) {
            addMessage({
                role: 'assistant',
                content: "Hi! I'm your Curriculum Architect. I'm ready to help you structure your lessons, refine your curriculum for accessibility, or brainstorm creative ideas for the classroom. How can I support your planning today?"
            });
        }
    }, [messages.length, addMessage, isProcessing]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isProcessing]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !auth.currentUser) return;

        setIsUploading(true);
        const loadingToast = toast.loading(`Uploading ${file.name}...`);

        try {
            // 1. Upload to Firebase Storage
            const storagePath = `ai_temp/${auth.currentUser.uid}/${Date.now()}_${file.name}`;
            const storageRef = ref(storage, storagePath);
            await uploadBytes(storageRef, file);
            const downloadUrl = await getDownloadURL(storageRef);

            // 2. Extract Text via Cloud Function
            // 2. Extract Text via Cloud Function
            const text = await aiService.processFileContent({
                fileUrl: downloadUrl,
                filename: file.name,
                contentType: file.type,
                taskId: taskId || undefined
            });

            setAttachments(prev => [...prev, {
                type: 'file',
                id: Date.now().toString(),
                name: file.name,
                content: text,
                icon: <FilePlus size={14} />
            }]);

            toast.success('File attached to context!', { id: loadingToast });
        } catch (error: any) {
            console.error('File Upload Error:', error);
            toast.error(error.message || 'Failed to process file', { id: loadingToast });
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleAddLink = async () => {
        if (!linkInput.trim()) return;

        setIsUploading(true);
        const loadingToast = toast.loading('Fetching link context...');

        try {
            const data = await aiService.fetchUrlMetadata(linkInput);

            setAttachments(prev => [...prev, {
                type: 'link',
                id: Date.now().toString(),
                name: data.title || linkInput,
                url: linkInput,
                content: data.transcript ? `Title: ${data.title}\nTranscript: ${data.transcript}` : `Title: ${data.title}\nContent snippet from ${linkInput}`,
                icon: linkInput.includes('youtube.com') || linkInput.includes('youtu.be') ? <Youtube size={14} className="text-red-500" /> : <LinkIcon size={14} />
            }]);

            setLinkInput('');
            setShowLinkInput(false);
            toast.success('Link contextualized!', { id: loadingToast });
        } catch (error: any) {
            console.error('Link Error:', error);
            toast.error('Failed to fetch link info', { id: loadingToast });
        } finally {
            setIsUploading(false);
        }
    };

    const handleSend = async () => {
        if (!input.trim() || isProcessing) return;

        const currentInput = input;
        setInput('');

        // 1. Add User Message
        addMessage({
            role: 'user',
            content: currentInput
        });

        setProcessing(true);

        // 2. Add placeholder assistant message for thinking state
        const assistantMsgId = addMessage({
            role: 'assistant',
            content: '',
            isThinking: true
        });

        try {
            // Extract context from current form and attachments
            const context = [];
            if (currentFormData.description) context.push(`Current Draft Description: ${currentFormData.description}`);
            if (currentFormData.links?.length) context.push(`Attached Links: ${currentFormData.links.map(l => l.url).join(', ')}`);

            // Add Assistant attachments to context
            attachments.forEach(att => {
                context.push(`ATTACHMENT [${att.type} - ${att.name}]:\n${att.content}`);
            });

            // Get existing items from the chat for multi-turn refinement
            const existingItems = messages
                .filter(m => m.role === 'assistant' && m.suggestions)
                .flatMap(m => m.suggestions || []);

            const response = await aiService.refineTask({
                rawContent: currentInput,
                taskId: taskId || undefined,
                context: context,
                existingItems: existingItems as Task[],
                subject,
                gradeLevel
            });

            const { items, thoughts } = response;

            // Clear attachments after successful send
            setAttachments([]);

            // Set status to draft for all items
            const processedItems = items.map((item: any) => ({
                ...item,
                status: 'draft'
            }));

            // 3. Update placeholder message with AI Response
            updateMessage(assistantMsgId, {
                content: processedItems.length > 1
                    ? `I've broken down this objective into **${processedItems.length} items**. Here is the recommended hierarchy:`
                    : `I've analyzed your request. Here's a suggestion for a **${processedItems[0]?.type || 'item'}**:`,
                suggestions: processedItems as Task[],
                thoughts: thoughts,
                isThinking: false
            });

        } catch (error: any) {
            console.error('AI Error:', error);
            toast.error(error.message || 'Failed to get AI response');
            updateMessage(assistantMsgId, {
                content: "I encountered an error trying to process that. Please try rephrasing or check your connection.",
                isThinking: false
            });
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-(--color-bg-tile-alt) tile-blur rounded-2xl border border-border-subtle overflow-hidden shadow-layered transition-float">
            {/* Header */}
            <div className="px-4 py-3 border-b border-border-subtle bg-(--color-bg-tile) tile-blur flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-brand-accent animate-pulse" />
                    <span className="font-black text-sm uppercase tracking-widest text-brand-textPrimary">AI Curriculum Assistant</span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={clearMessages}
                        className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-brand-textSecondary hover:text-brand-textPrimary hover:bg-white/5 transition-all text-[10px] font-bold uppercase tracking-wider"
                        title="Start New Chat"
                    >
                        <RotateCcw size={12} />
                        <span>New Chat</span>
                    </button>
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} gap-2`}>
                        <div className={`
                            max-w-[90%] px-4 py-3 rounded-2xl shadow-sm text-sm
                            ${msg.role === 'user'
                                ? 'bg-brand-accent text-white rounded-tr-sm'
                                : 'bg-(--color-bg-tile) tile-blur border border-border-subtle text-brand-textPrimary rounded-tl-sm'}
                        `}>
                            {msg.role === 'assistant' ? (
                                <div className="space-y-3">
                                    {msg.isThinking ? (
                                        <div className="flex flex-col gap-3 py-4 px-2">
                                            <div className="flex items-center gap-3">
                                                <div className="relative">
                                                    <div className="w-10 h-10 rounded-full bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center">
                                                        <Sparkles className="w-5 h-5 text-brand-accent animate-pulse" />
                                                    </div>
                                                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-brand-accent rounded-full animate-ping" />
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-xs font-black uppercase tracking-widest text-brand-textPrimary">Curriculum Architect</span>
                                                    <span className="text-[10px] text-brand-textSecondary uppercase tracking-tighter animate-pulse">Analyzing pedagogical requirements...</span>
                                                </div>
                                            </div>
                                            <div className="flex gap-1.5 px-13">
                                                <div className="w-1.5 h-1.5 rounded-full bg-brand-accent/40 animate-bounce [animation-delay:-0.3s]" />
                                                <div className="w-1.5 h-1.5 rounded-full bg-brand-accent/40 animate-bounce [animation-delay:-0.15s]" />
                                                <div className="w-1.5 h-1.5 rounded-full bg-brand-accent/40 animate-bounce" />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="prose prose-sm prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: formatMessageToHtml(msg.content) }} />
                                    )}

                                    {/* Stream of Thought Section */}
                                    {msg.thoughts && (
                                        <div className="mt-4 px-4 py-3 rounded-2xl bg-brand-accent/5 border border-brand-accent/10 space-y-2">
                                            <div className="flex items-center gap-2">
                                                <Brain className="w-4 h-4 text-brand-accent animate-pulse" />
                                                <span className="text-[10px] font-black uppercase tracking-widest text-brand-textPrimary">AI Reasoning Process</span>
                                            </div>
                                            <div className="text-xs text-brand-textSecondary leading-relaxed italic opacity-80 whitespace-pre-wrap">
                                                {msg.thoughts}
                                            </div>
                                        </div>
                                    )}

                                    {msg.suggestions && msg.suggestions.length > 0 && (
                                        <div className="mt-4 space-y-4">
                                            {msg.suggestions.map((item, idx) => {
                                                const indentation = item.parentId ? 'ml-6 border-l-2 border-brand-accent/10 pl-4' : '';


                                                // Build unified markdown description
                                                let descriptionHtml = '';

                                                if (item.structuredContent) {
                                                    const cleanRationale = item.structuredContent.rationale;
                                                    const cleanInstructions = item.structuredContent.instructions;
                                                    const cleanTroubleshooting = item.structuredContent.troubleshooting || '';

                                                    const markdown = [
                                                        `**Objective**: ${cleanRationale}`,
                                                        cleanInstructions.map((s, i) => `${i + 1}. ${s}`).join('\n'),
                                                        cleanTroubleshooting ? `> [!TIP]\n> **Student Prompt**: ${cleanTroubleshooting}` : ''
                                                    ].filter(Boolean).join('\n\n');
                                                    descriptionHtml = formatMessageToHtml(markdown);
                                                }

                                                return (
                                                    <div key={idx} className={`${indentation} overflow-visible rounded-2xl bg-(--color-bg-tile) border border-border-subtle shadow-layered hover:shadow-layered-lg transition-float lift-dynamic`}>
                                                        {/* Suggestion Header */}
                                                        <div className="px-4 py-2.5 bg-(--color-bg-tile-alt)/50 border-b border-border-subtle flex items-center justify-between rounded-t-2xl">
                                                            <div className="flex items-center gap-3 min-w-0">
                                                                <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0
                                                                    ${item.type === 'project' ? 'bg-type-project-color/20 text-type-project-color' :
                                                                        item.type === 'assignment' ? 'bg-type-assignment-color/20 text-type-assignment-color' :
                                                                            item.type === 'task' ? 'bg-type-task-color/20 text-type-task-color' :
                                                                                'bg-type-subtask-color/20 text-type-subtask-color'}
                                                                `}>
                                                                    {item.type[0].toUpperCase()}
                                                                </div>
                                                                <h4 className="text-sm font-black text-brand-textPrimary truncate tracking-tight leading-tight">
                                                                    {item.title}
                                                                </h4>
                                                            </div>
                                                            <div className="flex items-center gap-2 shrink-0">
                                                                <div className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter
                                                                    ${item.type === 'project' ? 'bg-type-project-color/20 text-type-project-color' :
                                                                        item.type === 'assignment' ? 'bg-type-assignment-color/20 text-type-assignment-color' :
                                                                            item.type === 'task' ? 'bg-type-task-color/20 text-type-task-color' :
                                                                                'bg-type-subtask-color/20 text-type-subtask-color'}
                                                                `}>
                                                                    {item.type}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Content */}
                                                        <div className="p-4 space-y-4">
                                                            <div className="prose prose-sm prose-invert max-w-none opacity-90">
                                                                <CodeBlockRenderer
                                                                    html={descriptionHtml}
                                                                    isExpanded={true}
                                                                    className="text-xs text-brand-textSecondary leading-relaxed"
                                                                />
                                                            </div>

                                                            <div className="flex items-center justify-between gap-4">
                                                                {item.structuredContent?.keyConcepts && item.structuredContent.keyConcepts.length > 0 && (
                                                                    <div className="flex flex-wrap gap-1.5 overflow-hidden">
                                                                        {item.structuredContent.keyConcepts.map((concept, i) => (
                                                                            <span key={i} className="px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-[9px] font-bold text-brand-textSecondary italic whitespace-nowrap">
                                                                                #{concept}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                )}

                                                                {item.accessibilityAudit && (
                                                                    <div className="flex gap-2 shrink-0">
                                                                        <div className="flex flex-col items-center">
                                                                            <span className="text-[8px] font-black text-brand-textMuted uppercase tabular-nums">Grade</span>
                                                                            <span className="text-[10px] font-black text-brand-accent">{item.accessibilityAudit.readingLevelGrade}</span>
                                                                        </div>
                                                                        {item.accessibilityAudit.hasAlternativePath && (
                                                                            <div className="flex flex-col items-center" title="Has 'Plan B' path">
                                                                                <span className="text-[8px] font-black text-brand-textMuted uppercase">Path B</span>
                                                                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1" />
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>

                                                            <div className="flex gap-2 pt-1">
                                                                <button
                                                                    onClick={() => {
                                                                        onApply(item);
                                                                        toast.success('Applied to editor!');
                                                                    }}
                                                                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/5 border border-white/10 text-brand-textPrimary text-xs font-bold hover:bg-white/10 transition-all button-lift-dynamic shadow-layered-sm"
                                                                >
                                                                    <ArrowRight size={14} className="text-brand-accent" />
                                                                    <span>Apply to Editor</span>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}

                                            {/* Bulk Sync Button */}
                                            {msg.suggestions.length > 1 && (
                                                <button
                                                    onClick={async () => {
                                                        const user = auth.currentUser;
                                                        if (!user) {
                                                            toast.error("Please sign in to sync");
                                                            return;
                                                        }

                                                        const loadingToast = toast.loading('Adding all items to schedule...');
                                                        try {
                                                            const itemsToSync = msg.suggestions!.map(item => ({
                                                                ...item,
                                                                status: 'draft',
                                                                description: item.structuredContent?.instructions?.map((s, i) => `${i + 1}. ${s}`).join('\n') || '',
                                                                selectedRoomIds: currentFormData.selectedRoomIds.length > 0
                                                                    ? currentFormData.selectedRoomIds
                                                                    : []
                                                            }));

                                                            await bulkSaveTasks(user.uid, itemsToSync);
                                                            toast.success('Full hierarchy synced successfully!', { id: loadingToast });
                                                        } catch (error) {
                                                            console.error('Bulk Sync Error:', error);
                                                            toast.error('Failed to sync hierarchy', { id: loadingToast });
                                                        }
                                                    }}
                                                    className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-brand-accent text-white text-sm font-black uppercase tracking-wider hover:bg-brand-accent/90 shadow-lg shadow-brand-accent/20 transition-all button-lift-dynamic"
                                                >
                                                    <Save size={16} />
                                                    <span>Sync Entire Hierarchy to Schedule</span>
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="prose prose-sm prose-invert max-w-none">
                                    {msg.content}
                                </div>
                            )}

                        </div>
                    </div>
                ))}

                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-(--color-bg-tile) border-t border-border-subtle">
                {/* Attachments Display */}
                {attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                        {attachments.map(att => (
                            <div key={att.id} className="flex items-center gap-2 px-2 py-1 rounded-lg bg-brand-accent/10 border border-brand-accent/20 text-[11px] text-brand-textPrimary font-bold">
                                {att.icon}
                                <span className="max-w-[120px] truncate">{att.name}</span>
                                <button
                                    onClick={() => setAttachments(prev => prev.filter(a => a.id !== att.id))}
                                    className="hover:text-red-500 transition-colors"
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Link Input Overlay */}
                {showLinkInput && (
                    <div className="mb-3 flex gap-2">
                        <input
                            autoFocus
                            value={linkInput}
                            onChange={(e) => setLinkInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleAddLink();
                                if (e.key === 'Escape') setShowLinkInput(false);
                            }}
                            placeholder="Paste link here (YouTube, Web, etc.)..."
                            className="flex-1 bg-(--color-bg-tile-alt) border border-brand-accent/30 rounded-lg px-3 py-1.5 text-xs text-brand-textPrimary focus:outline-none ring-1 ring-brand-accent/20"
                        />
                        <button
                            onClick={handleAddLink}
                            className="px-3 py-1.5 rounded-lg bg-brand-accent text-white text-xs font-bold"
                        >
                            Add
                        </button>
                        <button
                            onClick={() => setShowLinkInput(false)}
                            className="p-1.5 rounded-lg bg-white/5 text-brand-textSecondary"
                        >
                            <X size={14} />
                        </button>
                    </div>
                )}

                <div className="flex flex-col gap-3">
                    <div className="relative flex items-center">
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Describe a task or ask for ideas..."
                            rows={1}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                            className="w-full bg-(--color-bg-tile-alt) border border-border-subtle rounded-xl px-4 py-3 pr-24 text-sm text-brand-textPrimary placeholder:text-brand-textMuted focus:outline-none focus:border-brand-accent/50 focus:ring-1 focus:ring-brand-accent/20 transition-all resize-none overflow-hidden"
                        />
                        <div className="absolute right-2 flex items-center gap-1">
                            {/* Attachment Controls */}
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploading || isProcessing}
                                title="Attach File (PDF/Text)"
                                className="p-2 rounded-lg text-brand-textSecondary hover:bg-white/5 transition-all text-xs"
                            >
                                <Paperclip size={18} />
                            </button>
                            <button
                                onClick={() => setShowLinkInput(!showLinkInput)}
                                disabled={isUploading || isProcessing}
                                title="Attach Link (YouTube/Web)"
                                className="p-2 rounded-lg text-brand-textSecondary hover:bg-white/5 transition-all text-xs"
                            >
                                <LinkIcon size={18} />
                            </button>
                            <button
                                onClick={handleSend}
                                disabled={!input.trim() || isProcessing || isUploading}
                                className="p-2 rounded-lg text-brand-accent hover:bg-brand-accent/10 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                            >
                                {isProcessing || isUploading ? <Loader size={18} className="animate-spin" /> : <Send size={18} />}
                            </button>
                        </div>
                    </div>

                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept=".pdf,.txt,.doc,.docx"
                        onChange={handleFileUpload}
                    />

                    <div className="mb-0.5 flex items-center justify-between text-[10px] text-brand-textMuted font-bold uppercase tracking-widest px-1">
                        <div className="flex gap-3">
                            <span>Ctrl + Enter to send</span>
                            {attachments.length > 0 && <span className="text-brand-accent underline underline-offset-2">{attachments.length} attachments included</span>}
                        </div>
                        <div className="flex items-center gap-2">
                            <Sparkles size={10} className="text-brand-accent" />
                            <span>AI Powered</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
