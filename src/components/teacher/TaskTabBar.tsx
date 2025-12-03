import { Plus, X, Pencil } from 'lucide-react';

interface TabInfo {
    id: string;
    title: string;
    parentId: string | null;
    isNew: boolean;
    isDirty: boolean;
}

interface TaskTabBarProps {
    tabs: TabInfo[];
    activeTabId: string;
    onTabClick: (tabId: string) => void;
    onTabClose: (tabId: string) => void;
    onAddNew: () => void;
    onTitleChange: (tabId: string, title: string) => void;
}

export function TaskTabBar({
    tabs,
    activeTabId,
    onTabClick,
    onTabClose,
    onAddNew,
    onTitleChange,
}: TaskTabBarProps) {
    // Find the active tab index
    const activeIndex = tabs.findIndex(tab => tab.id === activeTabId);

    return (
        <div className="flex items-end relative">
            {/* Tabs Container - File folder style with overlapping */}
            <div className="flex items-end">
                {tabs.map((tab, index) => {
                    const isActive = tab.id === activeTabId;
                    // Calculate z-index: active tab is always highest
                    const zIndex = isActive 
                        ? 50 
                        : index < activeIndex 
                            ? 20 + index
                            : 20 - (index - activeIndex);
                    
                    // -16px overlap between tabs
                    const marginLeft = index === 0 ? 0 : -16;
                    
                    return (
                        <div
                            key={tab.id}
                            style={{ 
                                zIndex,
                                marginLeft: `${marginLeft}px`,
                            }}
                            className={`
                                group relative flex items-center
                                transition-all duration-200 ease-out
                                rounded-t-lg
                                ${isActive 
                                    ? 'border-[2px] border-b-0 border-gray-200 dark:border-gray-700 bg-brand-lightSurface dark:bg-brand-darkSurface shadow-[0_-2px_8px_rgba(0,0,0,0.08)] dark:shadow-[0_-2px_8px_rgba(0,0,0,0.3)]'
                                    : 'border-[2px] border-b-0 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer -mb-[1px]'
                                }
                            `}
                            onClick={() => !isActive && onTabClick(tab.id)}
                        >
                            {/* Tab content */}
                            <div className={`
                                relative flex items-center
                                ${isActive ? 'pb-[2px]' : 'pb-[1px]'}
                            `}>
                                {/* Edit Icon - only show when no title (placeholder state) */}
                                {!tab.title && (
                                    <Pencil 
                                        size={14} 
                                        className={`ml-3 flex-shrink-0 transition-colors ${isActive ? 'text-gray-500 dark:text-gray-400' : 'text-gray-400 dark:text-gray-500'}`} 
                                    />
                                )}
                                
                                {/* Editable Title Input */}
                                <input
                                    type="text"
                                    value={tab.title}
                                    onChange={(e) => onTitleChange(tab.id, e.target.value)}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (!isActive) onTabClick(tab.id);
                                    }}
                                    placeholder="Title"
                                    className={`
                                        w-32 sm:w-40 px-2 py-2.5 bg-transparent text-center
                                        outline-none border-none ring-0 shadow-none
                                        focus:outline-none focus:border-none focus:ring-0 focus:shadow-none
                                        focus-visible:outline-none focus-visible:ring-0 focus-visible:border-none
                                        text-sm font-medium transition-colors
                                        ${!tab.title ? '' : 'ml-3'}
                                        ${isActive 
                                            ? 'text-brand-textDarkPrimary dark:text-brand-textPrimary' 
                                            : 'text-gray-500 dark:text-gray-400'}
                                        placeholder-gray-400 dark:placeholder-gray-500
                                        ${!isActive ? 'cursor-pointer' : ''}
                                    `}
                                />

                                {/* Close Button - Only show if more than 1 tab */}
                                {tabs.length > 1 && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onTabClose(tab.id);
                                        }}
                                        className={`
                                            mr-2 p-1.5 rounded-lg transition-all duration-200 select-none
                                            ${isActive 
                                                ? 'opacity-60 hover:opacity-100' 
                                                : 'opacity-0 group-hover:opacity-60 hover:!opacity-100'}
                                            hover:bg-gray-200 dark:hover:bg-gray-600 
                                            text-gray-500 hover:text-gray-700 dark:hover:text-gray-200
                                            focus:outline-none focus:ring-2 focus:ring-brand-accent/20
                                            active:scale-90
                                        `}
                                        aria-label={`Close ${tab.title || 'tab'}`}
                                    >
                                        <X size={14} />
                                    </button>
                                )}

                            </div>

                            {/* Bottom connector for active tab - seamlessly connects to card below */}
                            {isActive && (
                                <div className="absolute -bottom-[2px] left-0 right-0 h-[4px] bg-brand-lightSurface dark:bg-brand-darkSurface" />
                            )}
                        </div>
                    );
                })}

                {/* Add New Tab Button - styled consistently with inactive tabs */}
                <button
                    onClick={onAddNew}
                    style={{ 
                        zIndex: 10,
                        marginLeft: tabs.length > 0 ? '-16px' : '0',
                    }}
                    className="
                        group relative flex items-center justify-center gap-1.5
                        px-4 py-2.5 rounded-t-lg -mb-[1px]
                        border-[2px] border-b-0 border-gray-300 dark:border-gray-600
                        bg-gray-50 dark:bg-gray-800
                        hover:bg-gray-100 dark:hover:bg-gray-700
                        transition-all duration-200
                        text-gray-500 dark:text-gray-400
                        hover:text-gray-700 dark:hover:text-gray-300
                        focus:outline-none focus:ring-2 focus:ring-brand-accent/20 focus:ring-inset
                        active:scale-[0.98] select-none cursor-pointer
                    "
                    aria-label="Add new task"
                    title="Create new task"
                >
                    <Plus size={16} className="transition-transform group-hover:scale-110" />
                    <span className="text-sm font-medium">New Task</span>
                </button>
            </div>
        </div>
    );
}
