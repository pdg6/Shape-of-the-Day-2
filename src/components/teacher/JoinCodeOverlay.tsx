import React, { useEffect, useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, Users, X } from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { LiveStudent } from '../../types';
import { LogoBeam } from '../shared/Logo';

interface JoinCodeOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    classCode: string;
    classId: string;
    className?: string;
}

const JoinCodeOverlay: React.FC<JoinCodeOverlayProps> = ({ isOpen, onClose, classCode, classId, className }) => {
    const [liveStudents, setLiveStudents] = useState<LiveStudent[]>([]);
    const [copied, setCopied] = useState(false);
    const [newStudentIds, setNewStudentIds] = useState<Set<string>>(new Set());
    const prevStudentCountRef = useRef(0);
    const [isModalHovered, setIsModalHovered] = useState(false);
    const [isCodeHovered, setIsCodeHovered] = useState(false);
    const [showCopyButton, setShowCopyButton] = useState(false);
    const codeHoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Handle code hover with 3 second delay
    useEffect(() => {
        if (isCodeHovered) {
            setShowCopyButton(true);
            // Clear any existing timeout
            if (codeHoverTimeoutRef.current) {
                clearTimeout(codeHoverTimeoutRef.current);
            }
        } else {
            // Hide after 3 seconds when not hovered
            codeHoverTimeoutRef.current = setTimeout(() => {
                setShowCopyButton(false);
            }, 2000);
        }
        return () => {
            if (codeHoverTimeoutRef.current) {
                clearTimeout(codeHoverTimeoutRef.current);
            }
        };
    }, [isCodeHovered]);

    // Listen for real-time updates to the roster
    useEffect(() => {
        if (!classId) return;

        const studentsRef = collection(db, 'classrooms', classId, 'live_students');

        const unsubscribe = onSnapshot(studentsRef, (snapshot) => {
            const students: LiveStudent[] = [];
            snapshot.forEach((doc) => {
                students.push(doc.data() as LiveStudent);
            });
            students.sort((a, b) => a.displayName.localeCompare(b.displayName));

            // Track new students for animation
            if (students.length > prevStudentCountRef.current) {
                const currentIds = new Set(liveStudents.map(s => s.uid));
                const newIds = students.filter(s => !currentIds.has(s.uid)).map(s => s.uid);
                setNewStudentIds(new Set(newIds));
                // Clear animation after delay
                setTimeout(() => setNewStudentIds(new Set()), 1000);
            }
            prevStudentCountRef.current = students.length;

            setLiveStudents(students);
        });

        return () => unsubscribe();
    }, [classId, liveStudents]);

    const handleCopyCode = () => {
        navigator.clipboard.writeText(classCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const joinUrl = `${window.location.origin}/join`;

    if (!isOpen) return null;

    return (
        <div
            className="flex flex-col"
            onMouseEnter={() => setIsModalHovered(true)}
            onMouseLeave={() => setIsModalHovered(false)}
        >
            {/* Header Row: Logo + Tagline (left) + Live Students (right) */}
            <div className="flex items-center justify-between mb-8">
                {/* Left: Logo + Tagline */}
                <div className="flex items-center gap-3">
                    <LogoBeam size={60} />
                    <div className="flex items-baseline gap-2">
                        <span className="text-lg font-bold text-brand-textPrimary">
                            Shape of the Day
                        </span>
                        <span className="text-sm text-brand-textMuted">
                            a digital agenda for education
                        </span>
                    </div>
                </div>

                {/* Right: Live Students */}
                <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-brand-accent" />
                    <span className="text-sm font-bold text-brand-accent">
                        Live Students: {liveStudents.length}
                    </span>
                </div>
            </div>

            {/* Hero Section: QR + Join Info - Horizontal Layout */}
            <div className="flex flex-col sm:flex-row items-stretch gap-6 mb-8">
                {/* QR Code - Compact but scannable */}
                <div className="bg-white p-4 rounded-xl shadow-lg shrink-0 self-center sm:self-start">
                    <QRCodeSVG
                        value={`${joinUrl}?code=${classCode}`}
                        size={160}
                        level={"H"}
                        includeMargin={false}
                    />
                </div>

                {/* Join Info - 3 Row Structure */}
                <div className="flex-1 flex flex-col justify-between gap-3">
                    {/* Row 1: Class Name + Close Button */}
                    <div className="flex items-center justify-between">
                        <div className="grid grid-cols-[100px_1fr] items-baseline">
                            <span className="text-sm font-bold text-brand-textMuted uppercase tracking-wider">Class:</span>
                            <span className="text-2xl font-bold text-brand-accent">{className || 'Unnamed Class'}</span>
                        </div>
                        <button
                            onClick={onClose}
                            className={`p-2 rounded-lg border-2 border-border-subtle hover:border-border-strong hover:bg-tile-hover transition-all focus:outline-none focus:ring-2 focus:ring-brand-accent/30 ${isModalHovered ? 'opacity-100' : 'opacity-0'}`}
                            aria-label="Close"
                        >
                            <X className="w-5 h-5 text-brand-textMuted" />
                        </button>
                    </div>

                    {/* Row 2: Join URL */}
                    <div className="grid grid-cols-[100px_1fr] items-baseline">
                        <span className="text-sm font-bold text-brand-textMuted uppercase tracking-wider">Join at:</span>
                        <span className="text-2xl font-bold text-brand-textPrimary">
                            shape-of-the-day.com
                        </span>
                    </div>

                    {/* Row 3: Class Code + Copy Button */}
                    <div
                        className="flex items-center justify-between"
                        onMouseEnter={() => setIsCodeHovered(true)}
                        onMouseLeave={() => setIsCodeHovered(false)}
                    >
                        <div className="grid grid-cols-[100px_1fr] items-baseline">
                            <span className="text-sm font-bold text-brand-textMuted uppercase tracking-wider">Code:</span>
                            <span className="text-2xl font-mono font-black text-brand-textPrimary tracking-[0.15em]">
                                {classCode}
                            </span>
                        </div>
                        <button
                            onClick={handleCopyCode}
                            className={`p-2 rounded-lg border-2 border-border-subtle hover:border-border-strong hover:bg-tile-hover transition-all focus:outline-none focus:ring-2 focus:ring-brand-accent/30 ${showCopyButton ? 'opacity-100' : 'opacity-0'}`}
                            title="Copy code"
                        >
                            {copied ? (
                                <Check className="w-5 h-5 text-green-500" />
                            ) : (
                                <Copy className="w-5 h-5 text-brand-textMuted" />
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Live Students Section */}
            <div className="flex-1 min-h-0">

                <div className="max-h-[320px] overflow-y-auto custom-scrollbar">
                    {liveStudents.length === 0 ? (
                        <div className="flex items-center justify-center gap-3 py-8 text-brand-textSecondary border-2 border-dashed border-border-subtle rounded-xl">
                            <div className="flex gap-1">
                                <span className="w-2 h-2 bg-border-strong rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="w-2 h-2 bg-border-strong rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="w-2 h-2 bg-border-strong rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                            <p className="text-sm italic">Waiting for students...</p>
                        </div>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            {liveStudents.map((student) => {
                                const isNew = newStudentIds.has(student.uid);
                                let bgColor = 'bg-brand-accent/10';
                                let textColor = 'text-brand-accent';
                                let dotColor = 'bg-green-500';

                                switch (student.currentStatus) {
                                    case 'stuck':
                                    case 'question':
                                    case 'help':
                                        bgColor = 'bg-amber-500/10';
                                        textColor = 'text-amber-500';
                                        dotColor = 'bg-amber-500 animate-pulse';
                                        break;
                                    case 'done':
                                        bgColor = 'bg-emerald-500/10';
                                        textColor = 'text-emerald-500';
                                        dotColor = 'bg-emerald-500';
                                        break;
                                }

                                return (
                                    <div
                                        key={student.uid}
                                        className={`
                                            flex items-center gap-2 px-3 py-2 rounded-full
                                            ${bgColor} ${textColor}
                                            border border-border-subtle
                                            transition-all duration-300
                                            ${isNew ? 'animate-celebration-pop ring-2 ring-green-500/50' : ''}
                                        `}
                                    >
                                        <span className={`w-2 h-2 rounded-full ${dotColor} shrink-0`} />
                                        <span className="text-sm font-medium truncate max-w-[120px]">
                                            {student.displayName}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default JoinCodeOverlay;
