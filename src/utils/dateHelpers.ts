/**
 * Returns the current date as a string in YYYY-MM-DD format.
 * @returns Date string.
 */
export const toDateString = (date: Date = new Date()): string => {
    return date.toISOString().split('T')[0];
};
