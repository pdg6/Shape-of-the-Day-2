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
                    <h2 className="text-2xl font-bold text-brand-textDarkPrimary dark:text-brand-textPrimary">Analytics Vault</h2>
                    <p className="text-brand-textDarkSecondary dark:text-brand-textSecondary">
                        Anonymized session logs (Privacy Scrubbing Verification)
                    </p>
                </div>
                <div className="p-2 bg-brand-accent/10 rounded-lg text-brand-accent">
                    <BarChart className="w-6 h-6" />
                </div>
            </div>

            <div className="grid gap-4">
                {logs.length === 0 ? (
                    <div className="text-center py-12 bg-brand-lightSurface dark:bg-brand-darkSurface rounded-xl border-[3px] border-dashed border-gray-300 dark:border-gray-700">
                        <p className="text-gray-500 dark:text-gray-400">No analytics logs found yet.</p>
                        <p className="text-sm text-gray-400 mt-2">Sign out a student to generate a log.</p>
                    </div>
                ) : (
                    logs.map((log) => (
                        <div key={log.id} className="bg-brand-lightSurface dark:bg-brand-darkSurface p-5 rounded-xl border-[3px] border-gray-200 dark:border-gray-700 hover:border-brand-accent/30 transition-colors">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                                        <Clock className="w-5 h-5 text-gray-500" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-brand-textDarkPrimary dark:text-brand-textPrimary">
                                            Session Log
                                        </h3>
                                        <p className="text-xs text-gray-500 font-mono">{log.id}</p>
                                    </div>
                                </div>
                                <div className="flex gap-4 text-sm">
                                    <div className="flex flex-col items-end">
                                        <span className="text-gray-500 text-xs uppercase tracking-wider font-bold">Date</span>
                                        <span className="font-medium dark:text-gray-300">{log.date}</span>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-gray-500 text-xs uppercase tracking-wider font-bold">Duration</span>
                                        <span className="font-medium dark:text-gray-300">{Math.round(log.sessionDuration / 60000)} min</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Task Performance</h4>
                                {log.taskPerformance.map((task, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/30 rounded-lg border border-gray-100 dark:border-gray-800">
                                        <span className="font-medium text-sm text-gray-700 dark:text-gray-300">{task.title}</span>
                                        <div className="flex items-center gap-3">
                                            {task.statusWasStuck && (
                                                <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                                                    <AlertTriangle className="w-3 h-3" /> Stuck
                                                </span>
                                            )}
                                            <span className="text-xs text-gray-500">
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
