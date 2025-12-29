import React, { useState } from 'react';
import { GraduationCap, X } from 'lucide-react';
import { sanitizeName, validateName } from '../../utils/security';

/**
 * Props for the StudentNameModal component.
 * @property onSubmit - Callback function called when the user submits a valid name.
 * @property initialName - Optional initial value for the name input.
 * @property onClose - Optional callback to close the modal (e.g., via the X button or background click).
 */
interface StudentNameModalProps {
    onSubmit: (name: string) => void;
    initialName?: string;
    onClose?: () => void;
}

/**
 * StudentNameModal Component
 * 
 * A modal dialog that prompts the student to enter their name before joining a class.
 * It includes validation to ensure the name is not empty and is within a reasonable length.
 */
const StudentNameModal: React.FC<StudentNameModalProps> = ({ onSubmit, initialName = '', onClose }) => {
    const [name, setName] = useState<string>(initialName);
    const [error, setError] = useState<string>('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const sanitized = sanitizeName(name);
        const validation = validateName(sanitized);

        if (!validation.valid) {
            setError(validation.error);
            return;
        }

        onSubmit(sanitized);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const sanitized = sanitizeName(e.target.value);
        setName(sanitized);
        if (error) setError('');
    };

    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-overlay p-4 transition-all duration-300"
            onClick={onClose}
        >
            <div
                className="bg-[var(--color-bg-tile)] rounded-2xl shadow-layered w-full max-w-md p-8 transition-float border border-[var(--color-border-subtle)] relative"
                onClick={(e) => e.stopPropagation()}
            >
                {onClose && (
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 text-brand-textMuted hover:text-brand-textPrimary transition-colors rounded-lg hover:bg-[var(--color-bg-tile-hover)]"
                        aria-label="Close"
                    >
                        <X className="w-5 h-5" />
                    </button>
                )}

                <div className="text-center mb-8">
                    <GraduationCap className="w-16 h-16 text-brand-accent mx-auto mb-6" />
                    <h2 className="text-3xl font-black text-brand-textPrimary tracking-tight">What is your name?</h2>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-brand-textMuted uppercase tracking-widest px-1">
                            Your Display Name
                        </label>
                        <div className="relative group">
                            <input
                                autoFocus
                                type="text"
                                value={name}
                                onChange={handleChange}
                                placeholder="First name only (e.g., Sarah)"
                                maxLength={12}
                                autoComplete="off"
                                spellCheck={false}
                                className={`
                                    w-full px-4 py-4 rounded-xl bg-[var(--color-bg-tile-alt)] border text-lg text-center tracking-[0.5em] font-black
                                    placeholder:tracking-normal placeholder:font-sans placeholder:font-normal
                                    ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : 'border-[var(--color-border-subtle)] focus:border-brand-accent/50 focus:ring-brand-accent/5'}
                                    text-brand-textPrimary placeholder-brand-textMuted focus:outline-none focus:ring-4 transition-all shadow-layered-sm
                                `}
                                enterKeyHint="go"
                            />
                        </div>
                        <div className="flex justify-between mt-3 px-2">
                            <span className="text-sm text-red-500 min-h-[1.25rem] font-medium">{error}</span>
                        </div>
                    </div>

                    <div className="bg-brand-accent/5 border border-brand-accent/20 rounded-xl p-4 flex gap-4">
                        <div className="shrink-0 p-2 rounded-lg bg-brand-accent/10 h-fit">
                            <GraduationCap className="w-5 h-5 text-brand-accent" />
                        </div>
                        <div className="space-y-1 min-w-0">
                            <p className="text-[10px] font-black text-brand-accent uppercase tracking-widest">About this name</p>
                            <p className="text-sm text-brand-textSecondary leading-relaxed">
                                This name identifies you to your teacher and classmates. You can change it later in settings.
                            </p>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={!validateName(sanitizeName(name)).valid}
                        className="w-full bg-brand-accent hover:bg-brand-accent/90 text-white font-black uppercase tracking-widest py-4 rounded-xl shadow-layered transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                        Join Class
                    </button>
                </form>
            </div>
        </div>
    );
};

export default StudentNameModal;
