import { useEffect, useRef } from 'react';

interface CodeBlockRendererProps {
    html: string;
    className?: string;
    isExpanded?: boolean;
}

/**
 * Renders HTML content with enhanced code blocks that have copy functionality.
 * Parses the HTML to find <pre><code> blocks and adds copy buttons.
 * Follows UI.md border and hover/focus standards.
 */
export function CodeBlockRenderer({ html, className = '', isExpanded = true }: CodeBlockRendererProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    // Add copy buttons to code blocks after render
    useEffect(() => {
        if (!containerRef.current) return;

        const codeBlocks = containerRef.current.querySelectorAll<HTMLPreElement>('pre:not([data-enhanced])');

        codeBlocks.forEach((pre) => {
            // Mark as enhanced to prevent duplicate processing
            pre.setAttribute('data-enhanced', 'true');

            // Skip if already inside a wrapper (handles StrictMode double-render)
            if (pre.parentElement?.classList.contains('code-block-wrapper')) return;

            // Wrap code block in a container for proper border styling
            // Hide the wrapper when collapsed to avoid DOM conflicts
            const wrapper = document.createElement('div');
            wrapper.className = `code-block-wrapper relative rounded-lg border-2 border-gray-400 dark:border-gray-600 overflow-hidden my-3 transition-colors hover:border-gray-600 dark:hover:border-gray-400 ${isExpanded ? '' : 'hidden'}`;
            wrapper.setAttribute('data-code-wrapper', 'true');

            // Get the code content
            const codeElement = pre.querySelector('code');
            const codeText = codeElement?.textContent || pre.textContent || '';

            // Create floating copy button (positioned inside code block, top-right, aligned with padding)
            const copyBtn = document.createElement('button');
            copyBtn.className = 'code-copy-btn absolute top-4 right-4 flex items-center gap-1.5 px-2.5 py-1 rounded-md border-2 border-gray-600 text-gray-400 bg-gray-800/90 backdrop-blur-sm transition-all hover:border-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 z-10';
            copyBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg><span>Copy</span>`;

            copyBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                try {
                    await navigator.clipboard.writeText(codeText);
                    copyBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg><span>Copied!</span>`;
                    copyBtn.classList.add('text-green-400', 'border-green-400');
                    setTimeout(() => {
                        copyBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg><span>Copy</span>`;
                        copyBtn.classList.remove('text-green-400', 'border-green-400');
                    }, 2000);
                } catch (err) {
                    console.error('Failed to copy:', err);
                }
            });

            // Move pre into wrapper, then add copy button
            pre.parentNode?.insertBefore(wrapper, pre);
            wrapper.appendChild(pre);
            wrapper.appendChild(copyBtn);

            // Style the pre element directly (ensures padding works regardless of prose styles)
            pre.style.borderRadius = '0';
            pre.style.border = 'none';
            pre.style.margin = '0';
            pre.style.padding = '16px'; // Consistent 16px padding all around
        });
    }, [html]); // Only re-run when content changes

    // Toggle code block visibility based on expand state
    useEffect(() => {
        if (!containerRef.current) return;

        const wrappers = containerRef.current.querySelectorAll('[data-code-wrapper]');
        wrappers.forEach((wrapper) => {
            if (isExpanded) {
                wrapper.classList.remove('hidden');
            } else {
                wrapper.classList.add('hidden');
            }
        });
    }, [isExpanded]); // Re-run when expand state changes

    return (
        <div
            ref={containerRef}
            className={`code-block-renderer prose prose-base dark:prose-invert max-w-none
                prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-pre:text-sm
                prose-pre:rounded-none prose-pre:border-none
                prose-pre:overflow-x-auto prose-pre:my-0 prose-pre:p-5 prose-pre:pt-12
                prose-code:bg-gray-100 dark:prose-code:bg-gray-800
                prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm
                prose-code:text-brand-accent prose-code:font-mono
                prose-code:before:content-none prose-code:after:content-none
                prose-headings:text-brand-textDarkPrimary dark:prose-headings:text-brand-textPrimary
                prose-headings:font-bold prose-headings:mt-4 prose-headings:mb-2
                prose-ul:my-2 prose-ul:list-disc prose-ul:pl-5 prose-li:my-0.5 prose-li:marker:text-brand-accent
                prose-ol:my-2 prose-ol:list-decimal prose-ol:pl-5
                prose-p:my-2
                prose-a:text-brand-accent prose-a:no-underline hover:prose-a:underline
                ${isExpanded ? '' : 'line-clamp-3'}
                ${className}`}
            dangerouslySetInnerHTML={{ __html: html }}
        />
    );
}

export default CodeBlockRenderer;

