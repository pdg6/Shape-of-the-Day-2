import React, { useState, useEffect } from 'react';
import { useClassStore } from '../../store/classStore';
import { useAuth } from '../../context/AuthContext';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { toDateString } from '../../utils/dateHelpers';
import { QRCodeSVG } from 'qrcode.react';
import { Users, Link as LinkIcon, ExternalLink } from 'lucide-react';

// --- Types ---
interface Task {
    id: string;
    title: string;
    description: string;
    linkURL: string;
    imageURL: string;
    startDate: string;
    endDate: string;
    selectedRoomIds: string[];
    presentationOrder: number;
    createdAt: any;
}

const ShapeOfDay: React.FC = () => {
    const { currentClassId, classrooms, activeStudentCount } = useClassStore();
    const { user } = useAuth();

    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);

    const currentClass = classrooms.find(c => c.id === currentClassId);
    const today = toDateString();

    // --- Data Fetching ---
    useEffect(() => {
        if (!currentClassId || !user) {
            setTasks([]);
            setLoading(false);
            return;
        }

        const q = query(
            collection(db, 'tasks'),
            where('selectedRoomIds', 'array-contains', currentClassId)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const taskData: Task[] = [];
            snapshot.forEach(doc => {
                const data = doc.data() as Task;
                if (today >= data.startDate && today <= data.endDate) {
                    taskData.push({ id: doc.id, ...data });
                }
            });

            taskData.sort((a, b) => (a.presentationOrder || 0) - (b.presentationOrder || 0));

            setTasks(taskData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching tasks for Shape of the Day:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [currentClassId, user, today]);

    if (!currentClass) {
        return (
            <div className="flex items-center justify-center h-full text-gray-500">
                Please select a class to view the Shape of the Day.
            </div>
        );
    }

    const joinUrl = `${window.location.origin}/join`;

    return (
        <div className="h-full flex flex-col gap-4 overflow-y-auto custom-scrollbar p-1">

            {/* --- HEADER CARD (Compact) --- */}
            <div className="w-full bg-brand-lightSurface dark:bg-brand-darkSurface border-[3px] border-gray-200 dark:border-gray-700 rounded-2xl p-4 md:p-6 shadow-sm flex-shrink-0">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6">

                    {/* Left: Class Identity */}
                    <div className="flex-1 flex flex-col justify-center">
                        <div className="flex items-center gap-3 mb-1">
                            <span className="px-2 py-0.5 rounded-full bg-brand-accent/10 text-brand-accent text-xs font-bold uppercase tracking-wider border border-brand-accent/20">
                                Current Session
                            </span>
                            <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                                <Users size={16} />
                                <span className="font-bold text-sm">{activeStudentCount} Active</span>
                            </div>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black text-brand-textDarkPrimary dark:text-brand-textPrimary tracking-tight leading-tight">
                            {currentClass.name}
                        </h1>
                    </div>

                    {/* Right: Connection Info (Compact) */}
                    <div className="flex-shrink-0 flex items-center gap-4 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                        <div className="text-right">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">Join at</p>
                            <p className="text-base font-medium text-brand-textDarkPrimary dark:text-brand-textPrimary mb-2 flex items-center justify-end gap-1">
                                shapeoftheday.app/join
                            </p>

                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">Class Code</p>
                            <div className="text-3xl font-mono font-black text-brand-accent tracking-widest leading-none">
                                {currentClass.joinCode}
                            </div>
                        </div>

                        {/* QR Code */}
                        <div className="bg-white p-1.5 rounded-lg shadow-sm border border-gray-100">
                            <QRCodeSVG
                                value={`${joinUrl}?code=${currentClass.joinCode}`}
                                size={80}
                                level="H"
                                fgColor="#000000"
                                bgColor="#ffffff"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* --- TASK STREAM (Compact) --- */}
            <div className="space-y-3 pb-4">
                {loading ? (
                    <div className="text-center py-12 text-gray-400">Loading schedule...</div>
                ) : tasks.length === 0 ? (
                    <div className="text-center py-12 text-gray-400 italic bg-brand-lightSurface dark:bg-brand-darkSurface rounded-xl border-[3px] border-dashed border-gray-200 dark:border-gray-700">
                        No tasks scheduled for today.
                    </div>
                ) : (
                    tasks.map((task, index) => (
                        <div
                            key={task.id}
                            className="group w-full bg-brand-lightSurface dark:bg-brand-darkSurface border-[3px] border-gray-200 dark:border-gray-700 rounded-xl p-4 transition-all hover:border-brand-accent/50"
                        >
                            <div className="flex items-center gap-4">
                                {/* Number Badge (Aligned to Sidebar Style) */}
                                <div className="flex-shrink-0 w-12 h-12 rounded-xl border-[3px] border-brand-accent bg-brand-accent/10 text-brand-accent flex items-center justify-center text-xl font-bold">
                                    {index + 1}
                                </div>

                                {/* Task Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-xl font-bold text-brand-textDarkPrimary dark:text-brand-textPrimary leading-tight truncate">
                                            {task.title}
                                        </h3>
                                        {task.linkURL && (
                                            <a
                                                href={task.linkURL}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex-shrink-0 text-brand-accent hover:text-brand-accent/80 transition-colors"
                                                title="Open Resource"
                                            >
                                                <ExternalLink size={20} />
                                            </a>
                                        )}
                                    </div>

                                    {task.description && (
                                        <div className="text-sm text-brand-textDarkSecondary dark:text-brand-textSecondary mt-1 line-clamp-2">
                                            {task.description}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default ShapeOfDay;
