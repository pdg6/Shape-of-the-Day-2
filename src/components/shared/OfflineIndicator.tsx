/**
 * OfflineIndicator Component
 * 
 * Displays a non-intrusive banner when the student is offline
 * or when there are pending operations waiting to sync.
 */

import React from 'react';
import { WifiOff, CloudOff, RefreshCw, Check } from 'lucide-react';
import { SyncStatus } from '../../services/studentDataService';

interface OfflineIndicatorProps {
    syncStatus: SyncStatus;
    onRefresh?: () => void;
}

const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ syncStatus, onRefresh }) => {
    const { isOnline, isSyncing, pendingOperations, lastSyncTime } = syncStatus;

    // Don't show anything if online and no pending operations
    if (isOnline && pendingOperations === 0 && !isSyncing) {
        return null;
    }

    // Format last sync time
    const formatLastSync = (timestamp: number | null): string => {
        if (!timestamp) return 'Never';
        const diff = Date.now() - timestamp;
        const minutes = Math.floor(diff / 60000);
        if (minutes < 1) return 'Just now';
        if (minutes === 1) return '1 min ago';
        return `${minutes} mins ago`;
    };

    return (
        <div
            className={`
                fixed bottom-4 left-1/2 -translate-x-1/2 z-50
                flex items-center gap-2 px-4 py-2 rounded-full
                text-sm font-bold shadow-layered border border-white/10
                transition-all duration-300 tracking-tight
                ${isOnline
                    ? 'bg-blue-600/90 text-white'
                    : 'bg-amber-600/90 text-white'}
            `}
            role="status"
            aria-live="polite"
        >
            {!isOnline ? (
                <>
                    <WifiOff size={16} />
                    <span>Offline - Changes will sync when connected</span>
                </>
            ) : isSyncing ? (
                <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Syncing...</span>
                </>
            ) : pendingOperations > 0 ? (
                <>
                    <CloudOff size={16} />
                    <span>{pendingOperations} change{pendingOperations > 1 ? 's' : ''} pending</span>
                    {onRefresh && (
                        <button
                            onClick={onRefresh}
                            className="ml-2 p-1 hover:bg-white/20 rounded-full transition-colors"
                            aria-label="Sync now"
                        >
                            <RefreshCw size={14} />
                        </button>
                    )}
                </>
            ) : (
                <>
                    <Check size={16} />
                    <span>Synced {formatLastSync(lastSyncTime)}</span>
                </>
            )}
        </div>
    );
};

export default OfflineIndicator;
