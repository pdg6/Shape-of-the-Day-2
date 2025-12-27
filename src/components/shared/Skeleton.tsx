import React from 'react';

/**
 * Skeleton Loading Components
 * 
 * Implements the Doherty Threshold principle (<400ms perceived response).
 * Skeleton screens provide visual feedback immediately, making load times
 * feel faster and keeping users engaged.
 */

interface SkeletonProps {
    className?: string;
    animate?: boolean;
}

/**
 * Base skeleton element with shimmer animation
 */
export const Skeleton: React.FC<SkeletonProps> = ({
    className = '',
    animate = true
}) => (
    <div
        className={`
            bg-slate-300 dark:bg-gray-700 rounded-lg
            ${animate ? 'animate-pulse' : ''}
            ${className}
        `}
        aria-hidden="true"
    />
);

/**
 * Skeleton for text lines
 */
export const SkeletonText: React.FC<{ lines?: number; className?: string }> = ({
    lines = 1,
    className = ''
}) => (
    <div className={`space-y-2 ${className}`}>
        {Array.from({ length: lines }).map((_, i) => (
            <Skeleton
                key={i}
                className={`h-4 ${i === lines - 1 ? 'w-3/4' : 'w-full'}`}
            />
        ))}
    </div>
);

/**
 * Skeleton for task cards - matches TaskCard layout
 */
export const SkeletonTaskCard: React.FC = () => (
    <div className="bg-brand-lightSurface dark:bg-[#1a1d24] p-5 rounded-2xl border border-slate-200 dark:border-white/5 min-h-[160px] shadow-layered-sm">
        <div className="flex gap-6">
            {/* Left Column */}
            <div className="flex flex-col gap-3 w-48 shrink-0">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-24" />
                <div className="flex gap-1 mt-auto">
                    {[1, 2, 3, 4].map(i => (
                        <Skeleton key={i} className="w-10 h-10 rounded-xl" />
                    ))}
                </div>
            </div>
            {/* Right Column */}
            <div className="flex-1">
                <div className="float-right ml-3 mb-2">
                    <Skeleton className="w-24 h-8 rounded-full" />
                </div>
                <SkeletonText lines={3} />
            </div>
        </div>
    </div>
);

/**
 * Skeleton for the task list area
 */
export const SkeletonTaskList: React.FC<{ count?: number }> = ({ count = 3 }) => (
    <div className="flex flex-col gap-4 w-full" role="status" aria-label="Loading tasks">
        {Array.from({ length: count }).map((_, i) => (
            <SkeletonTaskCard key={i} />
        ))}
        <span className="sr-only">Loading tasks...</span>
    </div>
);

/**
 * Skeleton for sidebar navigation items
 */
export const SkeletonSidebar: React.FC = () => (
    <div className="space-y-2 p-4">
        {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
    </div>
);

/**
 * Skeleton for calendar/schedule view
 */
export const SkeletonCalendar: React.FC = () => (
    <div className="bg-brand-lightSurface dark:bg-[#1a1d24] p-4 rounded-2xl border border-slate-200 dark:border-white/5 shadow-layered-sm">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
            <Skeleton className="h-6 w-32" />
            <div className="flex gap-2">
                <Skeleton className="h-8 w-8 rounded-xl" />
                <Skeleton className="h-8 w-8 rounded-xl" />
            </div>
        </div>
        {/* Days grid */}
        <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 35 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-10 rounded-xl" />
            ))}
        </div>
    </div>
);

/**
 * Skeleton for class cards in teacher view
 */
export const SkeletonClassCard: React.FC = () => (
    <div className="bg-brand-lightSurface dark:bg-[#1a1d24] p-6 rounded-2xl border border-slate-200 dark:border-white/5 shadow-layered-sm">
        <div className="flex items-start gap-4">
            <Skeleton className="w-12 h-12 rounded-full" />
            <div className="flex-1">
                <Skeleton className="h-5 w-40 mb-2" />
                <Skeleton className="h-4 w-24 mb-3" />
                <div className="flex gap-2">
                    <Skeleton className="h-6 w-16 rounded-full" />
                    <Skeleton className="h-6 w-20 rounded-full" />
                </div>
            </div>
        </div>
    </div>
);

/**
 * Full page loading skeleton for initial app load
 */
export const SkeletonPage: React.FC = () => (
    <div className="h-screen flex bg-brand-light dark:bg-brand-dark">
        {/* Sidebar skeleton */}
        <aside className="hidden md:flex flex-col w-72 bg-brand-lightSurface dark:bg-[#1a1d24] border-r border-slate-200 dark:border-white/5">
            <div className="h-16 flex items-center px-4 border-b border-slate-200 dark:border-white/5">
                <Skeleton className="h-8 w-8 rounded-xl mr-2" />
                <Skeleton className="h-6 w-32" />
            </div>
            <SkeletonSidebar />
        </aside>
        {/* Main content */}
        <main className="flex-1 p-6 overflow-auto">
            <div className="max-w-4xl mx-auto">
                <Skeleton className="h-8 w-48 mb-6" />
                <SkeletonTaskList count={3} />
            </div>
        </main>
    </div>
);

export default Skeleton;
