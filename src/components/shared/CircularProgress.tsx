import React from 'react';

interface CircularProgressProps {
    /** Total number of tasks */
    total: number;
    /** Count of in-progress tasks */
    inProgress: number;
    /** Count of completed tasks */
    completed: number;
    /** Whether any work has started (at least one task not 'todo') */
    hasStarted: boolean;
    /** CSS class for sizing - should use responsive text classes */
    className?: string;
}

/**
 * CircularProgress - A donut chart showing task completion status
 * 
 * Color logic:
 * - No work started: All segments red at 50% opacity
 * - After work starts:
 *   - in_progress → emerald (#10B981)
 *   - done → blue (#3B82F6)
 *   - todo/help → transparent
 */
const CircularProgress: React.FC<CircularProgressProps> = ({
    total,
    inProgress,
    completed,
    hasStarted,
    className = 'w-5 h-5 sm:w-6 sm:h-6'
}) => {
    if (total === 0) return null;

    const strokeWidth = 3;
    const radius = 10;
    const circumference = 2 * Math.PI * radius;
    const gapAngle = total > 1 ? 8 : 0; // Gap in degrees between segments
    const gapLength = (gapAngle / 360) * circumference;
    const totalGaps = total * gapLength;
    const availableLength = circumference - totalGaps;
    const segmentLength = availableLength / total;

    // Colors
    const redColor = '#EF4444';
    const emeraldColor = '#10B981';
    const blueColor = '#3B82F6';

    // Build segments array
    const segments: Array<{ color: string; opacity: number }> = [];

    if (!hasStarted) {
        // All red at 50% opacity
        for (let i = 0; i < total; i++) {
            segments.push({ color: redColor, opacity: 0.5 });
        }
    } else {
        // Count-based coloring: completed first, then in-progress, rest transparent
        let remaining = total;

        // Add completed segments (blue)
        for (let i = 0; i < completed && remaining > 0; i++) {
            segments.push({ color: blueColor, opacity: 1 });
            remaining--;
        }

        // Add in-progress segments (emerald)
        for (let i = 0; i < inProgress && remaining > 0; i++) {
            segments.push({ color: emeraldColor, opacity: 1 });
            remaining--;
        }

        // Add remaining as transparent
        for (let i = 0; i < remaining; i++) {
            segments.push({ color: 'transparent', opacity: 0 });
        }
    }

    // Calculate stroke-dasharray and dashoffset for each segment
    const renderSegments = () => {
        let currentOffset = circumference * 0.25; // Start at 12 o'clock

        return segments.map((segment, index) => {
            const dashArray = `${segmentLength} ${circumference - segmentLength}`;
            const dashOffset = currentOffset;

            // Move offset for next segment (segment + gap)
            currentOffset -= (segmentLength + gapLength);

            if (segment.color === 'transparent') return null;

            return (
                <circle
                    key={index}
                    cx="12"
                    cy="12"
                    r={radius}
                    fill="none"
                    stroke={segment.color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={dashArray}
                    strokeDashoffset={dashOffset}
                    strokeLinecap="round"
                    opacity={segment.opacity}
                    className="transition-all duration-300"
                />
            );
        });
    };

    // Calculate remaining tasks
    const remaining = total - completed;

    return (
        <svg
            viewBox="0 0 24 24"
            className={className}
            aria-label={`Progress: ${completed} of ${total} complete, ${remaining} remaining`}
        >
            {/* Background ring (very subtle) */}
            <circle
                cx="12"
                cy="12"
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth={strokeWidth}
                className="text-slate-200 dark:text-white/10"
            />
            {/* Colored segments */}
            {renderSegments()}
            {/* Remaining count in center - only show if remaining > 0 */}
            {remaining > 0 && (
                <text
                    x="12"
                    y="12"
                    textAnchor="middle"
                    dominantBaseline="central"
                    className="fill-current text-brand-textDarkPrimary dark:text-brand-textPrimary font-bold"
                    style={{ fontSize: '8px' }}
                >
                    {remaining}
                </text>
            )}
        </svg>
    );
};

export default CircularProgress;
