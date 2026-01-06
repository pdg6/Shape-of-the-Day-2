import {
    File, FileImage, FileVideo, FileAudio, FileSpreadsheet, Presentation, FileText,
    FolderOpen, ListChecks, CheckSquare
} from 'lucide-react';
import { ItemType } from '../types';

/**
 * Get file icon based on MIME type
 */
export const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return FileImage;
    if (mimeType.startsWith('video/')) return FileVideo;
    if (mimeType.startsWith('audio/')) return FileAudio;
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType === 'text/csv') return FileSpreadsheet;
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return Presentation;
    if (mimeType === 'application/pdf') return FileText;
    return File;
};

/**
 * Get file icon color based on MIME type
 */
export const getFileIconColor = (mimeType: string): string => {
    if (mimeType.startsWith('image/')) return 'text-[var(--type-project-color)]';
    if (mimeType.startsWith('video/')) return 'text-[var(--type-project-color)]';
    if (mimeType.startsWith('audio/')) return 'text-brand-accent';
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType === 'text/csv') return 'text-[var(--color-status-progress)]';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'text-brand-accent';
    if (mimeType === 'application/pdf') return 'text-[var(--color-status-stuck)]';
    return 'text-brand-textSecondary';
};

/**
 * Extract domain from URL for display
 */
export const getUrlDomain = (url: string): string => {
    try {
        const hostname = new URL(url).hostname.replace('www.', '');
        // Special handling for known domains
        if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) return 'YouTube';
        if (hostname.includes('google.com')) return 'Google';
        if (hostname.includes('docs.google.com')) return 'Google Docs';
        if (hostname.includes('drive.google.com')) return 'Google Drive';
        if (hostname.includes('github.com')) return 'GitHub';
        if (hostname.includes('notion.')) return 'Notion';
        if (hostname.includes('canva.com')) return 'Canva';
        return hostname;
    } catch {
        return 'Link';
    }
};

/**
 * Check if description contains HTML
 */
export const containsHtml = (str: string): boolean => {
    return /<[a-z][\s\S]*>/i.test(str);
};

/**
 * Get type-specific icon for Tasks/Projects/Assignments
 */
export const getTypeIcon = (type: ItemType) => {
    switch (type) {
        case 'project': return FolderOpen;
        case 'assignment': return FileText;
        case 'task': return ListChecks;
        case 'subtask': return CheckSquare;
    }
};

/**
 * Get human-readable label for task types
 */
export const getTypeLabel = (type: ItemType): string => {
    switch (type) {
        case 'project': return 'Project';
        case 'assignment': return 'Assignment';
        case 'task': return 'Task';
        case 'subtask': return 'Subtask';
        default: return type;
    }
};

/**
 * Get type-specific border color class for left accent
 */
export const getTypeBorderColor = (type: ItemType): string => {
    switch (type) {
        case 'project': return 'border-l-[var(--type-project-color)]';
        case 'assignment': return 'border-l-[var(--type-assignment-color)]';
        case 'task': return 'border-l-[var(--type-task-color)]';
        case 'subtask': return 'border-l-brand-accent';
    }
};

/**
 * Get type color classes (use semantic CSS classes from index.css)
 */
export const getTypeColorClasses = (type: ItemType): string => {
    return `type-${type}`;
};

/**
 * Get type hex color for icons or styles
 */
export const getTypeHexColor = (type: ItemType): string => {
    switch (type) {
        case 'project': return 'var(--type-project-color)';
        case 'assignment': return 'var(--type-assignment-color)';
        case 'task': return 'var(--type-task-color)';
        case 'subtask': return 'var(--type-subtask-color)';
    }
};
