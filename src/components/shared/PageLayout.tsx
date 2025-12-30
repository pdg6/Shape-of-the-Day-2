import React from 'react';

/**
 * PageLayout Component
 * 
 * A universal layout wrapper that provides consistent spacing, padding,
 * and scroll behavior across all content pages. This component implements
 * the "Blank Canvas + Standard Container" pattern.
 * 
 * ## Usage:
 * ```tsx
 * <PageLayout header={<MyHeader />}>
 *   <ContentGoesHere />
 * </PageLayout>
 * ```
 * 
 * ## Layout Structure:
 * - Root: Full height flex column with standard padding (px-4)
 * - Header Slot: Fixed height (h-16), aligned with sidebar header
 * - Content Slot: Flex-1, scrollable, with top padding (pt-4) to prevent clipping
 * 
 * ## Key Features:
 * - Matches sidebar layout exactly (px-4, h-16 header, pt-4 gap)
 * - Prevents shadow/lift clipping with proper padding
 * - Enables smooth internal scrolling
 * - Single source of truth for layout changes
 */

interface PageLayoutProps {
    /**
     * Header content - typically includes title, class name, and action buttons.
     * This slot is fixed at h-16 (64px) to align with the sidebar header.
     */
    header?: React.ReactNode;

    /**
     * Main content - the scrollable body of the page.
     * Wrapped in a container with proper padding and scroll behavior.
     */
    children: React.ReactNode;

    /**
     * Optional: Disable internal scrolling. Use for views that manage their own
     * scroll (e.g., full-screen maps, kanban boards).
     * @default false
     */
    disableScroll?: boolean;

    /**
     * Optional: Additional classes for the root container.
     */
    className?: string;
}

export const PageLayout: React.FC<PageLayoutProps> = ({
    header,
    children,
    disableScroll = false,
    className = ''
}) => {
    return (
        <div className={`
            h-full w-full flex flex-col
            px-4
            animate-in fade-in duration-500
            ${className}
        `}>
            {/* Header Slot - Fixed height, aligned with sidebar */}
            {header && (
                <div className="hidden lg:flex h-16 shrink-0 items-center justify-between">
                    {header}
                </div>
            )}

            {/* Content Slot - Scrollable with top padding to prevent clipping */}
            <div className={`
                flex-1 min-h-0
                ${disableScroll
                    ? 'overflow-visible'
                    : 'overflow-y-auto custom-scrollbar'
                }
                pt-4 pb-4
            `}>
                {children}
            </div>
        </div>
    );
};

export default PageLayout;
