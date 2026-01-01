import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
import { useCallback, useEffect, useState } from 'react';
import {
    Bold,
    Italic,
    List,
    ListOrdered,
    Heading2,
    Code,
    Undo,
    Redo,
} from 'lucide-react';

// Create lowlight instance with common languages
const lowlight = createLowlight(common);

interface RichTextEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    secondaryPlaceholder?: string;
    onDrop?: (files: File[]) => void;
    className?: string;
}

interface ToolbarButtonProps {
    onClick: () => void;
    isActive?: boolean;
    disabled?: boolean;
    children: React.ReactNode;
    title: string;
}

const ToolbarButton = ({ onClick, isActive, disabled, children, title }: ToolbarButtonProps) => (
    <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        title={title}
        className={`
            p-1.5 rounded transition-colors
            ${isActive
                ? 'bg-(--color-bg-tile-hover) text-brand-textPrimary'
                : 'text-brand-textMuted hover:text-brand-textPrimary hover:bg-(--color-bg-tile-hover)'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
    >
        {children}
    </button>
);

export function RichTextEditor({
    value,
    onChange,
    placeholder = 'Describe this task...',
    secondaryPlaceholder = 'Add text, links, or drag files here',
    onDrop,
    className = '',
}: RichTextEditorProps) {
    const [isDragging, setIsDragging] = useState(false);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                codeBlock: false, // We use CodeBlockLowlight instead
            }),
            CodeBlockLowlight.configure({
                lowlight,
                defaultLanguage: 'javascript',
            }),
        ],
        content: value,
        editorProps: {
            attributes: {
                class: 'prose prose-sm max-w-none focus:outline-none min-h-[160px] px-4 py-3 caret-brand-accent text-brand-textPrimary/80',
            },
        },
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
    });

    // Sync external value changes
    useEffect(() => {
        if (editor && value !== editor.getHTML()) {
            editor.commands.setContent(value, { emitUpdate: false });
        }
    }, [value, editor]);

    // Handle file drop
    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0 && onDrop) {
            onDrop(files);
        }
    }, [onDrop]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDragEnter = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        // Only set to false if we're actually leaving the container
        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
        setIsDragging(false);
    }, []);

    // Handle paste (for images from clipboard)
    const handlePaste = useCallback((e: React.ClipboardEvent) => {
        const items = e.clipboardData?.items;
        if (!items || !onDrop) return;

        const imageFiles: File[] = [];
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item && item.type.startsWith('image/')) {
                const file = item.getAsFile();
                if (file) {
                    imageFiles.push(file);
                }
            }
        }

        if (imageFiles.length > 0) {
            e.preventDefault(); // Prevent default paste behavior for images
            onDrop(imageFiles);
        }
        // Let text paste through normally
    }, [onDrop]);

    if (!editor) {
        return null;
    }

    return (
        <div
            className={`flex flex-col rounded-xl bg-transparent ${className}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onPaste={handlePaste}
        >
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-1 p-2 border-b border-border-subtle bg-tile-alt rounded-t-xl">
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    isActive={editor.isActive('bold')}
                    title="Bold (Ctrl+B)"
                >
                    <Bold size={16} />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    isActive={editor.isActive('italic')}
                    title="Italic (Ctrl+I)"
                >
                    <Italic size={16} />
                </ToolbarButton>

                <div className="w-px h-4 bg-border-subtle mx-1" />

                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    isActive={editor.isActive('heading', { level: 2 })}
                    title="Heading"
                >
                    <Heading2 size={16} />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    isActive={editor.isActive('bulletList')}
                    title="Bullet List"
                >
                    <List size={16} />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    isActive={editor.isActive('orderedList')}
                    title="Numbered List"
                >
                    <ListOrdered size={16} />
                </ToolbarButton>

                <div className="w-px h-4 bg-border-subtle mx-1" />

                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                    isActive={editor.isActive('codeBlock')}
                    title="Code Block"
                >
                    <Code size={16} />
                </ToolbarButton>

                <div className="flex-1" />

                <ToolbarButton
                    onClick={() => editor.chain().focus().undo().run()}
                    disabled={!editor.can().undo()}
                    title="Undo (Ctrl+Z)"
                >
                    <Undo size={16} />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().redo().run()}
                    disabled={!editor.can().redo()}
                    title="Redo (Ctrl+Y)"
                >
                    <Redo size={16} />
                </ToolbarButton>
            </div>

            {/* Editor Content */}
            <div className="flex-1 overflow-y-auto relative">
                <EditorContent
                    editor={editor}
                    className="h-full [&_.ProseMirror]:h-full [&_.ProseMirror]:min-h-[100px]"
                />
                {/* Multi-line Placeholder - only show when truly empty (both editor state and value prop) */}
                {editor.isEmpty && (!value || value === '<p></p>') && (
                    <div className="absolute top-3 left-4 pointer-events-none">
                        <div className="text-brand-textSecondary text-base font-bold">
                            {placeholder}
                        </div>
                        <div className="text-brand-textSecondary text-xs mt-1">
                            {secondaryPlaceholder}
                        </div>
                    </div>
                )}
            </div>

            {/* Drag-and-Drop Overlay */}
            {isDragging && (
                <div className="absolute inset-0 bg-brand-accent/5 border-2 border-dashed border-brand-accent rounded-md flex items-center justify-center z-10 pointer-events-none">
                    <div className="text-brand-accent font-black text-[10px] uppercase tracking-widest bg-(--color-bg-tile) px-4 py-2 rounded-lg border border-brand-accent/20 shadow-layered-lg">
                        Drop files here
                    </div>
                </div>
            )}
        </div>
    );
}

export default RichTextEditor;

