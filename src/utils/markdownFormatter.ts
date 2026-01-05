
/**
 * Formats a raw text message for display with code blocks.
 * 
 * 1. Escapes HTML entities in ordinary text.
 * 2. Detects markdown code blocks (```) and wraps them in <pre><code>.
 * 3. Converts newlines to <br> in ordinary text.
 * 
 * @param text The raw message text
 * @returns HTML string ready for CodeBlockRenderer
 */
export const formatMessageToHtml = (text: string): string => {
    if (!text) return '';

    // Split by code blocks
    // Capture the code content including newlines
    const parts = text.split(/```([\s\S]*?)```/g);

    return parts.map((part, index) => {
        // Even indices are normal text, odd are code
        if (index % 2 === 0) {
            // Escape HTML entities to be safe
            let formatted = part
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");

            // Convert H3 headers (must be at start of line)
            formatted = formatted.replace(/^### (.*$)/gm, '<h3 class="text-lg font-black mt-4 mb-2 text-brand-textPrimary">$1</h3>');

            // Convert bold (**text**)
            formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong class="font-black text-brand-textPrimary">$1</strong>');

            // Convert blockquotes (> text)
            formatted = formatted.replace(/^&gt; (.*$)/gm, '<blockquote class="border-l-4 border-brand-accent/30 pl-4 py-1 my-2 bg-brand-accent/5 rounded-r-lg italic text-brand-textSecondary">$1</blockquote>');

            // Convert newlines to <br>, but avoid double spacing after headers/quotes
            return formatted.replace(/\n/g, '<br>');
        } else {
            // Code block - preserve content but ensure it's safe inside <pre><code>
            // CodeBlockRenderer might re-process, but standard is to escape contents too 
            // so they display literally.
            // However, CodeBlockRenderer expects <pre><code>...</code></pre> tags.

            // We escape the code content so it displays as code, not HTML.
            const codeContent = part
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");

            return `<pre><code>${codeContent}</code></pre>`;
        }
    }).join('');
};
