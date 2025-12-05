/**
 * Returns the current date as a string in YYYY-MM-DD format.
 * Uses local timezone to avoid date shifting issues.
 * @returns Date string.
 */
export const toDateString = (date: Date = new Date()): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};
