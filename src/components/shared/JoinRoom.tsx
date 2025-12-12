import React, { useState, useRef } from 'react';
import { signInAnonymously } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { LiveStudent } from '../../types';
import toast from 'react-hot-toast';
import { sanitizeName, sanitizeCode, validateName, createRateLimiter } from '../../utils/security';

interface JoinRoomProps {
    onJoin: (code: string, name: string, classId: string) => void;
    initialCode?: string; // Optional: Pre-fill code from URL
}

const JoinRoom: React.FC<JoinRoomProps> = ({ onJoin, initialCode = '' }) => {
    const [code, setCode] = useState(sanitizeCode(initialCode));
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [isJoining, setIsJoining] = useState(false);
    const [inputHint, setInputHint] = useState<string | null>(null);

    // Rate limiter: Max 3 join attempts per minute to prevent brute-force
    const rateLimiterRef = useRef(createRateLimiter(3, 60000));

    /**
     * Postel's Law: Be liberal in what you accept
     * Handles various input formats gracefully:
     * - Spaces between characters ("AB C 123" -> "ABC123")
     * - Lowercase letters (auto-uppercase)
     * - Common separators (dashes, dots)
     */
    const handleCodeChange = (rawInput: string) => {
        // Remove spaces, dashes, dots and other separators
        const cleaned = rawInput.replace(/[\s\-\.\,\_]/g, '');
        const sanitized = sanitizeCode(cleaned);
        setCode(sanitized);

        // Provide helpful hints based on input transformations
        if (rawInput !== sanitized && rawInput.length > 0) {
            if (rawInput.includes(' ') || rawInput.includes('-')) {
                setInputHint('Spaces and dashes removed automatically');
            } else if (rawInput !== rawInput.toUpperCase()) {
                setInputHint('Converted to uppercase');
            } else {
                setInputHint(null);
            }
            // Clear hint after 2 seconds
            setTimeout(() => setInputHint(null), 2000);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // 0. Rate limiting check
        const rateCheck = rateLimiterRef.current.check();
        if (!rateCheck.allowed) {
            setError(`Too many attempts. Try again in ${rateCheck.retryAfter} seconds.`);
            return;
        }

        // 1. Sanitize inputs
        const sanitizedCode = sanitizeCode(code);
        const sanitizedName = sanitizeName(name);

        // 2. Validation
        if (sanitizedCode.length !== 6) {
            setError('Please enter a valid 6-character code');
            return;
        }

        const nameValidation = validateName(sanitizedName);
        if (!nameValidation.valid) {
            setError(nameValidation.error);
            return;
        }

        setError('');
        setIsJoining(true);

        try {
            let targetClassId = '';

            // Query Firestore for classroom with matching join code
            const q = query(collection(db, 'classrooms'), where('joinCode', '==', code));
            const snapshot = await getDocs(q);

            const firstDoc = snapshot.docs[0];
            if (snapshot.empty || !firstDoc) {
                setError('Invalid code. No classroom found with this code.');
                setIsJoining(false);
                return;
            }

            targetClassId = firstDoc.id;

            // 2. Authenticate Anonymously
            const userCredential = await signInAnonymously(auth);
            const uid = userCredential.user.uid;

            // 3. Create the Live Student Document in the target class
            const newStudentData: LiveStudent = {
                uid: uid,
                displayName: sanitizedName,
                joinedAt: serverTimestamp() as any,
                currentStatus: 'todo',
                taskHistory: [],
                metrics: {
                    tasksCompleted: 0,
                    activeTasks: []
                }
            };

            try {
                await setDoc(doc(db, 'classrooms', targetClassId, 'live_students', uid), newStudentData);
            } catch (dbError) {
                console.error("Firestore write failed:", dbError);
                if (targetClassId === 'demo-class-123') {
                    console.warn("Proceeding in Demo Mode despite DB error");
                    toast('Demo Mode: Backend sync unavailable', { icon: '⚠️' });
                } else {
                    throw dbError; // Re-throw for non-demo classes
                }
            }

            toast.success(`Joined as ${sanitizedName}!`);
            onJoin(sanitizedCode, sanitizedName, targetClassId); // Notify parent to switch view

        } catch (err) {
            console.error("Join Error:", err);
            setError('Failed to join session. Please try again.');
            toast.error('Could not join the session.');
        } finally {
            setIsJoining(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="w-full max-w-sm mx-auto space-y-4">
            <div className="space-y-4">
                {/* Class Code Input - Postel's Law: Accept flexible formats */}
                <div>
                    <label htmlFor="code" className="sr-only">Class Code</label>
                    <input
                        id="code"
                        type="text"
                        value={code}
                        onChange={(e) => handleCodeChange(e.target.value)}
                        placeholder="Enter 6-digit code"
                        maxLength={12}  /* Allow extra chars for spaces/dashes that get stripped */
                        autoComplete="off"
                        spellCheck={false}
                        aria-describedby={inputHint ? 'code-hint' : undefined}
                        className={`
                            input-base text-center font-mono tracking-[0.5em]
                            placeholder:font-sans placeholder:tracking-normal
                            min-h-[56px]  /* Fitts's Law: Larger touch target */
                            ${error
                                ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                                : 'input-focus'}
                        `}
                    />
                    {/* Helpful hint for input transformations */}
                    {inputHint && (
                        <p id="code-hint" className="text-xs text-brand-accent mt-1 text-center animate-fade-in">
                            ✓ {inputHint}
                        </p>
                    )}
                </div>

                {/* Name Input */}
                <div>
                    <label htmlFor="name" className="sr-only">Your Name</label>
                    <input
                        id="name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(sanitizeName(e.target.value))}
                        placeholder="First Name"
                        maxLength={12}
                        autoComplete="off"
                        spellCheck={false}
                        className="input-base text-center font-medium input-focus min-h-[56px]"
                    />
                </div>
            </div>

            {error && (
                <p className="text-red-500 text-sm font-medium">
                    {error}
                </p>
            )}

            <button
                type="submit"
                disabled={isJoining || sanitizeCode(code).length !== 6 || !validateName(sanitizeName(name)).valid}
                className="btn-primary-green"
            >
                {isJoining ? 'Joining...' : 'Join Class'}
            </button>
        </form>
    );
};

export default JoinRoom;
