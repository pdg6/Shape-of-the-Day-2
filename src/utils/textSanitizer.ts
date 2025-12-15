/**
 * Text Sanitizer - Unicode normalization and input sanitization
 * 
 * Protects against:
 * 1. Unicode encoding issues (normalization to NFC)
 * 2. Control characters that could break display or storage
 * 3. Zero-width characters that could hide content
 * 4. Excessive length that could cause performance issues
 */

// ============================================================================
// Constants
// ============================================================================

/** Maximum length for various field types */
export const MAX_LENGTHS = {
    name: 50,
    comment: 500,
    helpRequest: 1000,
    taskTitle: 200,
} as const;

/** Characters to preserve (emoji ranges, common Unicode) */
const EMOJI_REGEX = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;

// ============================================================================
// Core Sanitization
// ============================================================================

/**
 * Sanitizes text input with Unicode normalization and dangerous character removal.
 * Safe for use in Firestore, localStorage, and UI display.
 * 
 * @param input - Raw user input
 * @param maxLength - Maximum allowed length (default: 500)
 * @returns Sanitized string
 */
export const sanitizeText = (input: string, maxLength: number = MAX_LENGTHS.comment): string => {
    if (!input || typeof input !== 'string') {
        return '';
    }

    return input
        // Step 1: Unicode normalization (NFC = Canonical Decomposition, followed by Canonical Composition)
        // This ensures consistent encoding for characters like é (can be e + ´ or single char)
        .normalize('NFC')

        // Step 2: Remove control characters (ASCII 0-31 and 127, except newlines)
        // These can break JSON, Firestore, and UI rendering
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')

        // Step 3: Remove zero-width and invisible characters
        // These can hide malicious content or break copy/paste
        .replace(/[\u200B-\u200D\uFEFF\u2060\u00AD]/g, '')

        // Step 4: Normalize whitespace (collapse multiple spaces, trim)
        .replace(/\s+/g, ' ')
        .trim()

        // Step 5: Enforce maximum length
        .slice(0, maxLength);
};

/**
 * Sanitizes a student name with stricter rules.
 * Only allows letters, numbers, spaces, and common punctuation.
 * 
 * @param name - Raw name input
 * @returns Sanitized name
 */
export const sanitizeName = (name: string): string => {
    if (!name || typeof name !== 'string') {
        return '';
    }

    return name
        .normalize('NFC')
        // Allow letters (including Unicode letters), numbers, spaces, hyphens, apostrophes
        .replace(/[^\p{L}\p{N}\s\-'.]/gu, '')
        // Collapse whitespace
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, MAX_LENGTHS.name);
};

/**
 * Sanitizes a help request / comment with emoji preservation.
 * More permissive than name sanitization.
 * 
 * @param text - Raw help request text
 * @returns Sanitized text with emojis preserved
 */
export const sanitizeHelpRequest = (text: string): string => {
    if (!text || typeof text !== 'string') {
        return '';
    }

    // Preserve emojis by extracting them first
    const emojis: string[] = [];
    const textWithPlaceholders = text.replace(EMOJI_REGEX, (match) => {
        emojis.push(match);
        return `__EMOJI_${emojis.length - 1}__`;
    });

    // Sanitize the text
    let sanitized = textWithPlaceholders
        .normalize('NFC')
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
        .replace(/[\u200B-\u200D\uFEFF\u2060\u00AD]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    // Restore emojis
    emojis.forEach((emoji, index) => {
        sanitized = sanitized.replace(`__EMOJI_${index}__`, emoji);
    });

    return sanitized.slice(0, MAX_LENGTHS.helpRequest);
};

// ============================================================================
// Validation
// ============================================================================

/**
 * Checks if a string contains potentially problematic characters.
 * Useful for logging/debugging encoding issues.
 * 
 * @param text - Text to check
 * @returns Object with validation results
 */
export const validateText = (text: string): {
    isValid: boolean;
    hasControlChars: boolean;
    hasZeroWidth: boolean;
    originalLength: number;
    sanitizedLength: number;
} => {
    const hasControlChars = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(text);
    const hasZeroWidth = /[\u200B-\u200D\uFEFF\u2060\u00AD]/.test(text);
    const sanitized = sanitizeText(text);

    return {
        isValid: !hasControlChars && !hasZeroWidth,
        hasControlChars,
        hasZeroWidth,
        originalLength: text.length,
        sanitizedLength: sanitized.length,
    };
};

/**
 * Checks if a name is valid after sanitization.
 * 
 * @param name - Name to validate
 * @returns true if name is valid (non-empty after sanitization)
 */
export const isValidName = (name: string): boolean => {
    const sanitized = sanitizeName(name);
    return sanitized.length >= 1;
};
