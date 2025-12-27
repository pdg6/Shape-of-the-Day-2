import { useState, useMemo } from 'react';
import { Copy, Check } from 'lucide-react';

interface CodeBlockRendererProps {
    html: string;
    className?: string;
    isExpanded?: boolean;
}

/**
 * Renders HTML content with enhanced code blocks that have copy functionality.
 * Uses a React-based approach instead of DOM manipulation for stability.
 * 
 * Pre-processes HTML to extract code blocks and renders them as React components.
 */
export function CodeBlockRenderer({ html, className = '', isExpanded = true }: CodeBlockRendererProps) {
    // Parse HTML to separate code blocks from other content
    const { segments } = useMemo(() => {
        const segments: Array<{ type: 'html' | 'code'; content: string; codeText?: string }> = [];

        // Regex to find <pre><code>...</code></pre> or just <pre>...</pre> blocks
        const preRegex = /<pre[^>]*>[\s\S]*?<\/pre>/gi;
        let lastIndex = 0;
        let match;

        while ((match = preRegex.exec(html)) !== null) {
            // Add HTML before this code block
            if (match.index > lastIndex) {
                segments.push({ type: 'html', content: html.slice(lastIndex, match.index) });
            }

            // Extract text content from the code block for copying
            const codeMatch = match[0].match(/<code[^>]*>([\s\S]*?)<\/code>/i);
            const codeText = codeMatch
                ? codeMatch[1].replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
                : match[0].replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"');

            segments.push({ type: 'code', content: match[0], codeText });
            lastIndex = match.index + match[0].length;
        }

        // Add remaining HTML after last code block
        if (lastIndex < html.length) {
            segments.push({ type: 'html', content: html.slice(lastIndex) });
        }

        return { segments };
    }, [html]);

    // If not expanded, just show truncated text without code blocks
    if (!isExpanded) {
        return (
            <div
                className={`code-block-renderer prose prose-base dark:prose-invert max-w-none
                    prose-headings:text-brand-textDarkPrimary dark:prose-headings:text-brand-textPrimary
                    prose-headings:font-bold prose-headings:mt-4 prose-headings:mb-2
                    prose-ul:my-2 prose-ul:list-disc prose-ul:pl-5 prose-li:my-0.5 prose-li:marker:text-brand-accent
                    prose-ol:my-2 prose-ol:list-decimal prose-ol:pl-5
                    prose-p:my-2
                    prose-a:text-brand-accent prose-a:no-underline hover:prose-a:underline
                    line-clamp-3
                    ${className}`}
                dangerouslySetInnerHTML={{ __html: html }}
            />
        );
    }

    return (
        <div className={`code-block-renderer prose prose-base dark:prose-invert max-w-none
            prose-headings:text-brand-textDarkPrimary dark:prose-headings:text-brand-textPrimary
            prose-headings:font-bold prose-headings:mt-4 prose-headings:mb-2
            prose-ul:my-2 prose-ul:list-disc prose-ul:pl-5 prose-li:my-0.5 prose-li:marker:text-brand-accent
            prose-ol:my-2 prose-ol:list-decimal prose-ol:pl-5
            prose-p:my-2
            prose-a:text-brand-accent prose-a:no-underline hover:prose-a:underline
            ${className}`}
        >
            {segments.map((segment, index) => {
                if (segment.type === 'html') {
                    return (
                        <span
                            key={index}
                            dangerouslySetInnerHTML={{ __html: segment.content }}
                        />
                    );
                } else {
                    return (
                        <CodeBlock
                            key={index}
                            html={segment.content}
                            codeText={segment.codeText || ''}
                        />
                    );
                }
            })}
        </div>
    );
}

/**
 * Individual code block component with copy button.
 * Self-contained React component - no DOM manipulation needed.
 */
function CodeBlock({ html, codeText }: { html: string; codeText: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(codeText);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            // Fallback for older browsers/restricted contexts
            try {
                const textarea = document.createElement('textarea');
                textarea.value = codeText;
                textarea.style.position = 'fixed';
                textarea.style.opacity = '0';
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            } catch (fallbackErr) {
                console.error('Failed to copy:', fallbackErr);
            }
        }
    };

    return (
        <div className="code-block-wrapper relative rounded-xl border border-slate-200 dark:border-white/10 my-4 transition-all hover:border-slate-300 dark:hover:border-white/20 w-full max-w-full overflow-hidden shadow-layered-sm">
            {/* Copy button - React controlled */}
            <button
                onClick={handleCopy}
                aria-label={copied ? 'Copied to clipboard' : 'Copy code to clipboard'}
                className={`absolute top-2 right-2 flex items-center gap-1.5 px-3 py-1 rounded-xl border 
                    ${copied
                        ? 'border-green-400 text-green-400'
                        : 'border-white/10 text-gray-400 hover:border-white/30 hover:text-white hover:bg-white/5'
                    }
                    bg-[#1a1d24]/90 backdrop-blur-sm transition-all font-bold text-xs tracking-tight
                    focus:outline-none focus:border-brand-accent/50 focus:ring-4 focus:ring-brand-accent/5 z-10`}
            >
                {copied ? (
                    <>
                        <Check size={14} />
                        <span>Copied!</span>
                    </>
                ) : (
                    <>
                        <Copy size={14} />
                        <span>Copy</span>
                    </>
                )}
            </button>

            {/* Code block content - scrolls horizontally, grows vertically */}
            <div
                className="code-block-content bg-gray-900 text-gray-100 text-sm p-4 pr-24 w-full whitespace-pre-wrap break-words"
                dangerouslySetInnerHTML={{ __html: html }}
            />
        </div>
    );
}

export default CodeBlockRenderer;
