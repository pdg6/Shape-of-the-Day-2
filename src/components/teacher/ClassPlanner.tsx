import React, { useEffect, useState } from 'react';
import { collection, getDocs, query } from 'firebase/firestore';
import { db } from '../../firebase';
import { AnalyticsLog } from '../../types';
import { BarChart, Clock, AlertTriangle } from 'lucide-react';

/**
 * ClassPlanner Component (Repurposed as Analytics Dashboard for Stage 3)
 * 
 * Displays historical session data from the 'analytics_logs' collection.
 * This proves that student data is being anonymized and persisted correctly.
 */
const ClassPlanner: React.FC = () => {
    const [logs, setLogs] = useState<AnalyticsLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                // In a real app, we'd filter by classroomId
                const q = query(collection(db, 'analytics_logs')); // orderBy('date', 'desc') requires an index
                const snapshot = await getDocs(q);

                const data: AnalyticsLog[] = [];
                snapshot.forEach(doc => {
                    data.push({ id: doc.id, ...doc.data() } as AnalyticsLog);
                });

                setLogs(data);
            } catch (error) {
                console.error("Failed to fetch analytics:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchLogs();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-accent"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-brand-textPrimary">Analytics Vault</h2>
                    <p className="text-brand-textSecondary">
                        Anonymized session logs (Privacy Scrubbing Verification)
                    </p>
                </div>
                <div className="p-2 bg-brand-accent/10 rounded-lg text-brand-accent">
                    <BarChart className="w-6 h-6" />
                </div>
            </div>

            <div className="grid gap-4">
                {logs.length === 0 ? (
                    <div className="text-center py-12 bg-tile rounded-2xl border border-dashed border-border-subtle shadow-layered-sm">
                        <p className="text-brand-textMuted">No analytics logs found yet.</p>
                        <p className="text-sm text-brand-textMuted mt-2">Sign out a student to generate a log.</p>
                    </div>
                ) : (
                    logs.map((log) => (
                        <div key={log.id} className="bg-tile p-5 rounded-2xl border border-border-subtle hover:border-brand-accent/30 shadow-layered lift-hover transition-all">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-tile-alt rounded-lg">
                                        <Clock className="w-5 h-5 text-brand-textSecondary" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-brand-textPrimary">
                                            Session Log
                                        </h3>
                                        <p className="text-xs text-brand-textMuted font-mono">{log.id}</p>
                                    </div>
                                </div>
                                <div className="flex gap-4 text-sm">
                                    <div className="flex flex-col items-end">
                                        <span className="text-brand-textMuted text-xs uppercase tracking-wider font-bold">Date</span>
                                        <span className="font-medium text-brand-textSecondary">{log.date}</span>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-brand-textMuted text-xs uppercase tracking-wider font-bold">Duration</span>
                                        <span className="font-medium text-brand-textSecondary">{Math.round(log.sessionDuration / 60000)} min</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <h4 className="text-xs font-bold text-brand-textMuted uppercase tracking-wider mb-2">Task Performance</h4>
                                {log.taskPerformance.map((task, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 bg-tile-alt rounded-lg border border-border-subtle">
                                        <span className="font-medium text-sm text-brand-textSecondary">{task.title}</span>
                                        <div className="flex items-center gap-3">
                                            {task.statusWasStuck && (
                                                <span className="flex items-center gap-1 text-xs text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                                                    <AlertTriangle className="w-3 h-3" /> Stuck
                                                </span>
                                            )}
                                            <span className="text-xs text-brand-textMuted">
                                                {Math.round(task.timeToComplete_ms / 60000)}m
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default ClassPlanner;
