import { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, Loader, ArrowRight, Save, RotateCcw, Link as LinkIcon, FilePlus, X, Paperclip, Youtube } from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { functions, storage, auth } from '../../firebase';
import { bulkSaveTasks } from '../../services/firestoreService';
import { TaskFormData, ItemType } from '../../types';
import { CodeBlockRenderer } from '../shared/CodeBlockRenderer';
import { formatMessageToHtml } from '../../utils/markdownFormatter';
import toast from 'react-hot-toast';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    suggestion?: {
        items: any[];
    };
}

interface AiAssistantProps {
    currentFormData: TaskFormData;
    onApply: (suggestion: any) => void;
    taskId?: string | null;
}

export const AiAssistant = ({ currentFormData, onApply, taskId }: AiAssistantProps) => {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            role: 'assistant',
            content: "I'm your Curriculum Architect. I can help refine your notes, suggest improvements for accessibility, or brainstorm Project/Assignment structures. What are we building today?"
        }
    ]);
    const [input, setInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [attachments, setAttachments] = useState<any[]>([]);
    const [showLinkInput, setShowLinkInput] = useState(false);
    const [linkInput, setLinkInput] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isThinking]);

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
            const processFile = httpsCallable(functions, 'processFile');
            const result = await processFile({
                fileUrl: downloadUrl,
                filename: file.name,
                contentType: file.type
            });

            const { text } = result.data as { text: string };

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
            const fetchUrlMetadata = httpsCallable(functions, 'fetchUrlMetadata');
            const result = await fetchUrlMetadata({ url: linkInput });
            const data = result.data as any;

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
        if (!input.trim() || isThinking) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsThinking(true);

        try {
            const refineTask = httpsCallable(functions, 'refineTask');

            // Extract context from current form and attachments
            const context = [];
            if (currentFormData.description) context.push(`Current Draft Description: ${currentFormData.description}`);
            if (currentFormData.links?.length) context.push(`Attached Links: ${currentFormData.links.map(l => l.url).join(', ')}`);

            // Add Assistant attachments to context
            attachments.forEach(att => {
                context.push(`ATTACHMENT [${att.type} - ${att.name}]:\n${att.content}`);
            });

            const result = await refineTask({
                rawContent: input,
                taskId: taskId || undefined,
                context: context,
            });

            // Clear attachments after successful send
            setAttachments([]);

            const AIResponse = result.data as any;

            // Strip ### from AI Response items and set status to draft
            if (AIResponse.items) {
                AIResponse.items = AIResponse.items.map((item: any) => ({
                    ...item,
                    title: item.title?.replace(/^###\s+/g, '').replace(/###/g, ''),
                    description: item.description?.replace(/^###\s+/g, '').replace(/###/g, ''),
                    status: 'draft'
                }));
            }

            const assistantMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: AIResponse.items?.length > 1
                    ? `I've broken down this objective into **${AIResponse.items.length} items**. Here is the recommended hierarchy:`
                    : `I've analyzed your request. Here's a suggestion for a **${AIResponse.items?.[0]?.type || 'item'}**:`,
                suggestion: AIResponse
            };

            setMessages(prev => [...prev, assistantMsg]);
        } catch (error: any) {
            console.error('AI Error:', error);
            toast.error(error.message || 'Failed to get AI response');
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: "I encountered an error trying to process that. Please try rephrasing or check your connection."
            }]);
        } finally {
            setIsThinking(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-(--color-bg-tile-alt) rounded-2xl border border-border-subtle overflow-hidden shadow-layered transition-float">
            {/* Header */}
            <div className="px-4 py-3 border-b border-border-subtle bg-(--color-bg-tile) flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-brand-accent animate-pulse" />
                    <span className="font-black text-sm uppercase tracking-widest text-brand-textPrimary">AI Curriculum Assistant</span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setMessages([messages[0]])}
                        className="p-1.5 rounded-lg text-brand-textSecondary hover:text-brand-textPrimary hover:bg-white/5 transition-all"
                        title="Clear chat"
                    >
                        <RotateCcw size={14} />
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
                                : 'bg-(--color-bg-tile) border border-border-subtle text-brand-textPrimary rounded-tl-sm'}
                        `}>
                            {msg.role === 'assistant' ? (
                                <div className="space-y-3">
                                    <div dangerouslySetInnerHTML={{ __html: formatMessageToHtml(msg.content) }} />

                                    {msg.suggestion && msg.suggestion.items && msg.suggestion.items.length > 0 && (
                                        <div className="mt-4 p-4 rounded-xl bg-(--color-bg-tile-alt) border border-brand-accent/20 space-y-3">
                                            {/* Primary Item Preview */}
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-brand-accent">
                                                    {msg.suggestion.items.length > 1 ? 'Root Objective' : 'Generated Item'}
                                                </span>
                                                <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase 
                                                    ${msg.suggestion.items[0].type === 'project' ? 'bg-type-project-color/20 text-type-project-color' :
                                                        msg.suggestion.items[0].type === 'assignment' ? 'bg-type-assignment-color/20 text-type-assignment-color' :
                                                            msg.suggestion.items[0].type === 'task' ? 'bg-type-task-color/20 text-type-task-color' :
                                                                'bg-type-subtask-color/20 text-type-subtask-color'}
                                                `}>
                                                    {msg.suggestion.items[0].type}
                                                </div>
                                            </div>

                                            <h4 className="font-bold text-brand-textPrimary">{msg.suggestion.items[0].title}</h4>

                                            <div className="text-xs text-brand-textSecondary line-clamp-2">
                                                <CodeBlockRenderer
                                                    html={formatMessageToHtml(msg.suggestion.items[0].description)}
                                                    isExpanded={false}
                                                />
                                            </div>

                                            {/* Breakdown Summary for multiple items */}
                                            {msg.suggestion.items.length > 1 && (
                                                <div className="py-2 px-3 rounded-lg bg-black/20 border border-white/5 space-y-1.5 max-h-[200px] overflow-y-auto custom-scrollbar">
                                                    <p className="text-[10px] font-bold text-brand-textMuted uppercase tracking-wider">Breakdown Hierarchy:</p>
                                                    <div className="space-y-1">
                                                        {msg.suggestion.items.slice(1).map((item: any, idx: number) => (
                                                            <div key={idx} className="flex items-center gap-2 text-[11px] text-brand-textSecondary">
                                                                <div className="w-1 h-1 rounded-full bg-brand-accent/40" />
                                                                <span className="opacity-50 uppercase font-bold text-[9px] w-12">{item.type}</span>
                                                                <span className="truncate">{item.title}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            <div className="flex gap-2 pt-1">
                                                <button
                                                    onClick={() => {
                                                        onApply(msg.suggestion!.items[0]);
                                                        toast.success('Applied to editor!');
                                                    }}
                                                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-white/5 border border-white/10 text-brand-textPrimary text-xs font-bold hover:bg-white/10 transition-all"
                                                >
                                                    <ArrowRight size={12} />
                                                    <span>Pin Item</span>
                                                </button>

                                                {msg.suggestion.items.length > 1 && (
                                                    <button
                                                        onClick={async () => {
                                                            const user = auth.currentUser;
                                                            if (!user) {
                                                                toast.error("Please sign in to sync");
                                                                return;
                                                            }

                                                            const loadingToast = toast.loading('Adding to schedule...');
                                                            try {
                                                                // Ensure items have the correct selectedRoomIds from the editor
                                                                const itemsToSync = msg.suggestion!.items.map(item => ({
                                                                    ...item,
                                                                    status: 'draft', // Explicitly set to draft
                                                                    selectedRoomIds: currentFormData.selectedRoomIds.length > 0
                                                                        ? currentFormData.selectedRoomIds
                                                                        : item.selectedRoomIds
                                                                }));

                                                                await bulkSaveTasks(user.uid, itemsToSync);
                                                                toast.success('Tasks added to schedule as drafts!', { id: loadingToast });
                                                            } catch (error) {
                                                                console.error('Bulk Sync Error:', error);
                                                                toast.error('Failed to add tasks', { id: loadingToast });
                                                            }
                                                        }}
                                                        className="flex-[2] flex items-center justify-center gap-2 py-2 rounded-xl bg-brand-accent text-white text-xs font-bold hover:bg-brand-accent/90 shadow-lg shadow-brand-accent/20 transition-all button-lift-dynamic"
                                                    >
                                                        <Save size={12} />
                                                        <span>Add Tasks to Schedule</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                msg.content
                            )}
                        </div>
                    </div>
                ))}

                {isThinking && (
                    <div className="flex items-center gap-2 text-brand-textSecondary text-xs animate-pulse">
                        <Loader className="w-3 h-3 animate-spin" />
                        <span>Curriculum Architect is thinking...</span>
                    </div>
                )}
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
                                if (e.key === 'Enter' && !e.shiftKey) {
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
                                disabled={isUploading || isThinking}
                                title="Attach File (PDF/Text)"
                                className="p-2 rounded-lg text-brand-textSecondary hover:bg-white/5 transition-all text-xs"
                            >
                                <Paperclip size={18} />
                            </button>
                            <button
                                onClick={() => setShowLinkInput(!showLinkInput)}
                                disabled={isUploading || isThinking}
                                title="Attach Link (YouTube/Web)"
                                className="p-2 rounded-lg text-brand-textSecondary hover:bg-white/5 transition-all text-xs"
                            >
                                <LinkIcon size={18} />
                            </button>
                            <button
                                onClick={handleSend}
                                disabled={!input.trim() || isThinking || isUploading}
                                className="p-2 rounded-lg text-brand-accent hover:bg-brand-accent/10 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                            >
                                {isThinking || isUploading ? <Loader size={18} className="animate-spin" /> : <Send size={18} />}
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
                            <span>Enter to send</span>
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
