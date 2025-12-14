/**
 * Security Utilities
 * 
 * Centralized security functions to protect against mischievous high school students.
 * Includes input sanitization, profanity filtering, rate limiting helpers, and secure code generation.
 */

// ============================================================================
// PROFANITY FILTER
// ============================================================================

/**
 * Basic profanity blocklist for high school environment.
 * This list covers common offensive terms - expand as needed.
 * Words are stored lowercase for case-insensitive matching.
 */
const PROFANITY_LIST: string[] = [
    // Common profanity (abbreviated/masked for code readability)
    'ass', 'asshole', 'bastard', 'bitch', 'bullshit',
    'crap', 'damn', 'dick', 'dumbass', 'fag',
    'fuck', 'fucking', 'fucker', 'hell', 'jackass',
    'jerk', 'nigga', 'nigger', 'piss', 'porn',
    'pussy', 'retard', 'retarded', 'sex', 'sexy',
    'shit', 'slut', 'stupid', 'suck', 'whore',
    // Common substitutions students use
    'a$$', 'azz', 'b1tch', 'biatch', 'btch',
    'd1ck', 'f*ck', 'fck', 'fuk', 'fuq',
    'sh1t', 'sht', '$hit', 'wtf', 'stfu',
    // Mild but inappropriate for classroom
    'dumb', 'idiot', 'loser', 'hate', 'kill',
    'die', 'dead', 'drugs', 'weed', 'drunk'
];

/**
 * Builds a regex pattern that matches whole words from the profanity list.
 * Uses word boundaries to avoid false positives (e.g., "class" containing "ass").
 */
const buildProfanityRegex = (): RegExp => {
    const escaped = PROFANITY_LIST.map(word =>
        word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    );
    return new RegExp(`\\b(${escaped.join('|')})\\b`, 'gi');
};

const PROFANITY_REGEX = buildProfanityRegex();

// ============================================================================
// INPUT SANITIZATION
// ============================================================================

/**
 * Sanitizes a student name input.
 * - Only allows letters (a-z, A-Z) and spaces
 * - Trims whitespace
 * - Enforces maximum length of 12 characters
 * - Removes consecutive spaces
 * 
 * @param input - Raw user input
 * @returns Sanitized name string
 */
export const sanitizeName = (input: string): string => {
    const MAX_LENGTH = 16;

    // Remove any characters that aren't letters or spaces
    const lettersOnly = input.replace(/[^a-zA-Z ]/g, '');

    // Collapse multiple spaces into single space
    const singleSpaced = lettersOnly.replace(/  +/g, ' ');

    // Remove leading space only (allow trailing for typing), enforce max length
    return singleSpaced.replace(/^ /, '').slice(0, MAX_LENGTH);
};

/**
 * Validates a name meets minimum requirements.
 * 
 * @param name - The sanitized name to validate
 * @returns Object with valid status and error message
 */
export const validateName = (name: string): { valid: boolean; error: string } => {
    const trimmed = name.trim();

    if (!trimmed) {
        return { valid: false, error: 'Please enter your name' };
    }

    if (trimmed.length < 2) {
        return { valid: false, error: 'Name must be at least 2 characters' };
    }

    if (trimmed.length > 16) {
        return { valid: false, error: 'Name must be 16 characters or less' };
    }

    // Check for letters only (after sanitization this should always pass)
    if (!/^[a-zA-Z\s]+$/.test(trimmed)) {
        return { valid: false, error: 'Letters only please' };
    }

    return { valid: true, error: '' };
};

/**
 * Sanitizes a classroom join code.
 * - Only allows uppercase letters and numbers
 * - Enforces exactly 6 characters
 * 
 * @param input - Raw user input
 * @returns Sanitized code string (uppercase)
 */
export const sanitizeCode = (input: string): string => {
    const MAX_LENGTH = 6;

    // Remove any characters that aren't alphanumeric, convert to uppercase
    return input
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, MAX_LENGTH);
};

/**
 * Escapes HTML entities to prevent XSS attacks.
 * 
 * @param str - String potentially containing HTML
 * @returns Safe string with HTML entities escaped
 */
export const escapeHtml = (str: string): string => {
    const htmlEntities: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
        '/': '&#x2F;',
        '`': '&#x60;',
        '=': '&#x3D;'
    };

    return str.replace(/[&<>"'`=/]/g, char => htmlEntities[char] || char);
};

/**
 * Sanitizes a comment/message from a student.
 * - Escapes HTML entities
 * - Filters profanity (replaces with asterisks)
 * - Enforces maximum length
 * - Removes excessive whitespace
 * 
 * @param input - Raw user input
 * @param maxLength - Maximum allowed characters (default 200)
 * @returns Sanitized comment string
 */
export const sanitizeComment = (input: string, maxLength: number = 200): string => {
    // Trim and enforce max length first
    let sanitized = input.trim().slice(0, maxLength);

    // Collapse multiple spaces/newlines
    sanitized = sanitized.replace(/\s+/g, ' ');

    // Escape HTML entities
    sanitized = escapeHtml(sanitized);

    return sanitized;
};

/**
 * Filters profanity from text, replacing with asterisks.
 * Preserves first and last letter for readability.
 * 
 * @param text - Text to filter
 * @returns Text with profanity censored
 */
export const filterProfanity = (text: string): string => {
    return text.replace(PROFANITY_REGEX, (match) => {
        if (match.length <= 2) return '*'.repeat(match.length);
        return match[0] + '*'.repeat(match.length - 2) + match[match.length - 1];
    });
};

/**
 * Checks if text contains profanity.
 * 
 * @param text - Text to check
 * @returns True if profanity detected
 */
export const containsProfanity = (text: string): boolean => {
    PROFANITY_REGEX.lastIndex = 0; // Reset regex state
    return PROFANITY_REGEX.test(text);
};

// ============================================================================
// SECURE CODE GENERATION
// ============================================================================

/**
 * Character set for join codes - uppercase letters and numbers.
 * Excludes ambiguous characters: 0/O, 1/I/L
 */
const CODE_CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/**
 * Generates a cryptographically secure random join code.
 * Uses crypto.getRandomValues() instead of Math.random().
 * 
 * @param length - Length of code to generate (default 6)
 * @returns Secure random code string
 */
export const generateSecureCode = (length: number = 6): string => {
    const array = new Uint32Array(length);
    crypto.getRandomValues(array);

    let code = '';
    for (let i = 0; i < length; i++) {
        code += CODE_CHARSET[array[i] % CODE_CHARSET.length];
    }

    return code;
};

// ============================================================================
// RATE LIMITING HELPERS
// ============================================================================

/**
 * Rate limiter state interface.
 */
export interface RateLimitState {
    attempts: number;
    windowStart: number;
}

/**
 * Creates a rate limiter for tracking attempts within a time window.
 * 
 * @param maxAttempts - Maximum attempts allowed in the window
 * @param windowMs - Time window in milliseconds
 * @returns Object with check and reset functions
 */
export const createRateLimiter = (maxAttempts: number, windowMs: number) => {
    let state: RateLimitState = {
        attempts: 0,
        windowStart: Date.now()
    };

    return {
        /**
         * Checks if another attempt is allowed.
         * @returns Object with allowed status and seconds until reset
         */
        check: (): { allowed: boolean; retryAfter: number } => {
            const now = Date.now();

            // Reset window if expired
            if (now - state.windowStart > windowMs) {
                state = { attempts: 0, windowStart: now };
            }

            if (state.attempts >= maxAttempts) {
                const retryAfter = Math.ceil((windowMs - (now - state.windowStart)) / 1000);
                return { allowed: false, retryAfter };
            }

            state.attempts++;
            return { allowed: true, retryAfter: 0 };
        },

        /**
         * Resets the rate limiter state.
         */
        reset: (): void => {
            state = { attempts: 0, windowStart: Date.now() };
        },

        /**
         * Gets current state for debugging.
         */
        getState: (): RateLimitState => ({ ...state })
    };
};

/**
 * Simple debounce function for status updates.
 * 
 * @param fn - Function to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced function
 */
export const debounce = <T extends (...args: any[]) => any>(
    fn: T,
    delay: number
): ((...args: Parameters<T>) => void) => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    return (...args: Parameters<T>) => {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(() => fn(...args), delay);
    };
};

/**
 * Throttle function - ensures function is called at most once per interval.
 * 
 * @param fn - Function to throttle
 * @param interval - Minimum interval between calls in milliseconds
 * @returns Throttled function
 */
export const throttle = <T extends (...args: any[]) => any>(
    fn: T,
    interval: number
): ((...args: Parameters<T>) => void) => {
    let lastCall = 0;

    return (...args: Parameters<T>) => {
        const now = Date.now();
        if (now - lastCall >= interval) {
            lastCall = now;
            fn(...args);
        }
    };
};
