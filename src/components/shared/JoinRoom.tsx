import React, { useState } from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';
import { signInAnonymously } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { LiveStudent } from '../../types';
import toast from 'react-hot-toast';

interface JoinRoomProps {
    onJoin: (code: string, name: string) => void;
    initialCode?: string; // Optional: Pre-fill code from URL
}

const JoinRoom: React.FC<JoinRoomProps> = ({ onJoin, initialCode = '' }) => {
    const [code, setCode] = useState(initialCode);
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [isJoining, setIsJoining] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // 1. Validation
        if (code.length !== 6) {
            setError('Please enter a valid 6-character code');
            return;
        }
        if (!name.trim()) {
            setError('Please enter your name');
            return;
        }

        setError('');
        setIsJoining(true);

        try {
            let targetClassId = '';

            // --- DEMO WORKFLOW ---
            // Always accept '123456' and map it to the persistent demo class ID.
            if (code === '123456') {
                targetClassId = 'demo-class-123';
            } else {
                // Future Real Implementation:
                // const q = query(collection(db, 'classrooms'), where('code', '==', code));
                // const snapshot = await getDocs(q);
                // if (snapshot.empty) throw new Error('Class not found');
                // targetClassId = snapshot.docs[0].id;

                setError('Invalid Code. Please use "123456" for the demo.');
                setIsJoining(false);
                return;
            }

            // 2. Authenticate Anonymously
            const userCredential = await signInAnonymously(auth);
            const uid = userCredential.user.uid;

            // 3. Create the Live Student Document in the target class
            const newStudentData: LiveStudent = {
                uid: uid,
                displayName: name,
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

            toast.success(`Joined as ${name}!`);
            onJoin(code, name); // Notify parent to switch view

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
                {/* Class Code Input */}
                <div>
                    <label htmlFor="code" className="sr-only">Class Code</label>
                    <input
                        id="code"
                        type="text"
                        value={code}
                        onChange={(e) => setCode(e.target.value.toUpperCase())}
                        placeholder="Enter 6-digit code"
                        maxLength={6}
                        className={`
                            w-full px-4 py-3 text-center text-2xl font-mono tracking-[0.5em] rounded-xl border-[3px] outline-none transition-all
                            bg-brand-lightSurface dark:bg-brand-darkSurface text-brand-textDarkPrimary dark:text-brand-textPrimary
                            placeholder:text-sm placeholder:font-sans placeholder:tracking-normal
                            ${error
                                ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                                : 'border-gray-200 dark:border-gray-700 focus:border-brand-accent focus:ring-4 focus:ring-brand-accent/10'}
                        `}
                    />
                </div>

                {/* Name Input */}
                <div>
                    <label htmlFor="name" className="sr-only">Your Name</label>
                    <input
                        id="name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="What's your name?"
                        className="w-full px-4 py-3 text-center text-lg rounded-xl border-[3px] border-gray-200 dark:border-gray-700 bg-brand-lightSurface dark:bg-brand-darkSurface text-brand-textDarkPrimary dark:text-brand-textPrimary focus:border-brand-accent focus:ring-4 focus:ring-brand-accent/10 outline-none transition-all"
                    />
                </div>
            </div>

            {error && (
                <p className="text-red-500 text-sm font-medium animate-in slide-in-from-top-1">
                    {error}
                </p>
            )}

            <button
                type="submit"
                disabled={isJoining}
                className="w-full group relative flex items-center justify-center gap-2 bg-brand-accent hover:bg-brand-accent/90 text-white py-3.5 rounded-xl font-bold text-lg transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-brand-accent/20 hover:shadow-brand-accent/30 active:scale-[0.98]"
            >
                {isJoining ? (
                    <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Joining...</span>
                    </>
                ) : (
                    <>
                        <span>Join Class</span>
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </>
                )}
            </button>
        </form>
    );
};

export default JoinRoom;
