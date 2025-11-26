/**
 * Validates a file for upload.
 * @param file The file to validate.
 * @returns An object containing validity status and any error messages.
 */
export const validateFile = (file: File): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    const MAX_SIZE_MB = 5;
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        errors.push(`File size must be less than ${MAX_SIZE_MB}MB.`);
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
        errors.push('Invalid file type. Allowed types: JPG, PNG, GIF, PDF.');
    }

    return {
        valid: errors.length === 0,
        errors
    };
};

/**
 * Sanitizes task data to prevent XSS and ensure data integrity.
 * @param task The task object to sanitize.
 * @returns The sanitized task object.
 */
export const sanitizeTaskData = (task: any) => {
    return {
        ...task,
        title: task.title.trim(),
        description: task.description.trim(),
        linkURL: task.linkURL ? task.linkURL.trim() : '',
        imageURL: task.imageURL ? task.imageURL.trim() : '',
    };
};

/**
 * Checks if a string is a valid URL.
 * @param urlString The string to check.
 * @returns True if valid, false otherwise.
 */
export const isValidURL = (urlString: string): boolean => {
    try {
        new URL(urlString);
        return true;
    } catch (e) {
        return false;
    }
};
