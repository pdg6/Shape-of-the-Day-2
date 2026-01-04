
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
            let escaped = part
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");

            // Convert newlines to <br>
            return escaped.replace(/\n/g, '<br>');
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
