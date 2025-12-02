import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import { ItemType, ALLOWED_CHILD_TYPES } from '../../types';

interface TabInfo {
    id: string;
    title: string;
    type: ItemType;
    isNew: boolean;
    isDirty: boolean;
}

interface TaskTabBarProps {
    tabs: TabInfo[];
    activeTabId: string;
    onTabClick: (tabId: string) => void;
    onTabClose: (tabId: string) => void;
    onAddChild: (parentTabId: string) => void;
    onNavigate: (direction: 'prev' | 'next') => void;
}

// Get display label for item type
const getTypeLabel = (type: ItemType): string => {
    switch (type) {
        case 'project': return 'Project';
        case 'assignment': return 'Assignment';
        case 'task': return 'Task';
        case 'subtask': return 'Subtask';
    }
};

// Get type-specific colors
const getTypeColor = (type: ItemType): string => {
    switch (type) {
        case 'project': return 'bg-purple-500/10 text-purple-500 border-purple-500/30';
        case 'assignment': return 'bg-blue-500/10 text-blue-500 border-blue-500/30';
        case 'task': return 'bg-green-500/10 text-green-500 border-green-500/30';
        case 'subtask': return 'bg-orange-500/10 text-orange-500 border-orange-500/30';
    }
};

export function TaskTabBar({
    tabs,
    activeTabId,
    onTabClick,
    onTabClose,
    onAddChild,
    onNavigate,
}: TaskTabBarProps) {
    const activeIndex = tabs.findIndex(t => t.id === activeTabId);
    const activeTab = tabs.find(t => t.id === activeTabId);
    const canAddChild = activeTab && ALLOWED_CHILD_TYPES[activeTab.type].length > 0;

    return (
        <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-brand-darkSurface rounded-xl border-[3px] border-gray-200 dark:border-gray-700">
            {/* Navigation Chevrons */}
            <button
                onClick={() => onNavigate('prev')}
                disabled={activeIndex <= 0}
                className="p-1.5 rounded-lg text-gray-400 hover:text-brand-textDarkPrimary dark:hover:text-brand-textPrimary hover:bg-white dark:hover:bg-gray-700 disabled:text-gray-300 dark:disabled:text-gray-600 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-300 dark:disabled:hover:text-gray-600 transition-all"
                aria-label="Previous tab"
            >
                <ChevronLeft size={14} />
            </button>

            {/* Tabs Container - Scrollable */}
            <div className="flex-1 flex items-center gap-1 overflow-x-auto custom-scrollbar">
                {tabs.map((tab) => {
                    const isActive = tab.id === activeTabId;
                    const typeColor = getTypeColor(tab.type);
                    
                    return (
                        <div
                            key={tab.id}
                            className={`
                                group relative flex items-center gap-2 px-3 py-1.5 rounded-lg 
                                cursor-pointer transition-all duration-200 min-w-0 flex-shrink-0
                                ${isActive 
                                    ? 'bg-white dark:bg-gray-900 shadow-sm border-[2px] border-brand-accent' 
                                    : 'hover:bg-white/50 dark:hover:bg-gray-700/50 border-[2px] border-transparent'}
                            `}
                            onClick={() => onTabClick(tab.id)}
                        >
                            {/* Type Badge */}
                            <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${typeColor}`}>
                                {getTypeLabel(tab.type).charAt(0)}
                            </span>
                            
                            {/* Title */}
                            <span className={`
                                text-sm font-medium truncate max-w-[120px]
                                ${isActive 
                                    ? 'text-brand-textDarkPrimary dark:text-brand-textPrimary' 
                                    : 'text-gray-500 dark:text-gray-400'}
                            `}>
                                {tab.title || `New ${getTypeLabel(tab.type)}`}
                            </span>

                            {/* Dirty indicator */}
                            {tab.isDirty && (
                                <span className="w-2 h-2 rounded-full bg-brand-accent" title="Unsaved changes" />
                            )}

                            {/* Close Button */}
                            {tabs.length > 1 && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onTabClose(tab.id);
                                    }}
                                    className={`
                                        p-0.5 rounded-md transition-all
                                        ${isActive 
                                            ? 'opacity-100' 
                                            : 'opacity-0 group-hover:opacity-100'}
                                        hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200
                                    `}
                                    aria-label={`Close ${tab.title}`}
                                >
                                    <X size={12} />
                                </button>
                            )}
                        </div>
                    );
                })}

                {/* Add Child Button - Right next to tabs */}
                <button
                    onClick={() => onAddChild(activeTabId)}
                    className="p-1.5 rounded-lg text-brand-accent hover:bg-brand-accent/10 transition-all border-[2px] border-transparent hover:border-brand-accent flex-shrink-0"
                    aria-label="Add new item"
                    title={canAddChild 
                        ? `Add ${ALLOWED_CHILD_TYPES[activeTab!.type].join(' or ')} to this ${getTypeLabel(activeTab!.type)}`
                        : 'Add new item'}
                >
                    <Plus size={16} />
                </button>
            </div>

            {/* Navigation Chevron Right */}
            <button
                onClick={() => onNavigate('next')}
                disabled={activeIndex >= tabs.length - 1}
                className="p-1.5 rounded-lg text-gray-400 hover:text-brand-textDarkPrimary dark:hover:text-brand-textPrimary hover:bg-white dark:hover:bg-gray-700 disabled:text-gray-300 dark:disabled:text-gray-600 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-300 dark:disabled:hover:text-gray-600 transition-all"
                aria-label="Next tab"
            >
                <ChevronRight size={14} />
            </button>
        </div>
    );
}

export default TaskTabBar;
