import React, { useState } from 'react';
import { useAuth } from '../../context/auth-context';
import { Mail, Key, Loader2 } from 'lucide-react';

const EmailLoginForm = () => {
    const { loginWithEmail } = useAuth();
    const [isExpanded, setIsExpanded] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            await loginWithEmail(email, password);
            // Success is handled by auth state change
        } catch (err: any) {
            setError('Invalid email or password');
        } finally {
            setIsLoading(false);
        }
    };

    const fillDevCredentials = () => {
        setEmail('agent@test.com');
        setPassword('Antigravity@123');
    };

    if (!isExpanded) { // Use isExpanded
        return (
            <button
                onClick={() => setIsExpanded(!isExpanded)} // Use isExpanded
                className="flex items-center justify-center gap-2 w-full py-3.5 px-4 rounded-xl
                    bg-tile text-brand-textSecondary text-sm font-black uppercase tracking-widest
                    border border-border-subtle shadow-layered
                    hover:bg-tile-hover hover:border-blue-500/50 hover:text-brand-textPrimary hover:shadow-layered-lg
                    transition-float button-lift-dynamic"
            >
                <Mail className="w-4 h-4" />
                <span>Sign in with Email</span>
            </button>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-3 animate-in fade-in zoom-in-95 duration-200">
            <div className="space-y-2">
                <div className="relative group">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-textSecondary group-focus-within:text-brand-accent transition-colors" />
                    <input
                        type="email"
                        placeholder="Email address" // Changed placeholder
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl text-sm font-bold bg-tile-alt border border-border-subtle focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all placeholder:text-brand-textMuted text-brand-textPrimary"
                        required
                    />
                </div>
                <div className="relative group">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-textSecondary group-focus-within:text-brand-accent transition-colors" />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl text-sm font-bold bg-tile-alt border border-border-subtle focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all placeholder:text-brand-textMuted text-brand-textPrimary"
                        required
                    />
                </div>
            </div>

            {error && <p className="text-xs text-red-500 font-medium px-1">{error}</p>}

            <div className="flex gap-2 mt-3">
                <button
                    type="button"
                    onClick={() => setIsExpanded(false)} // Use isExpanded
                    className="px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest
                        bg-tile-alt text-brand-textMuted border border-border-subtle
                        hover:text-brand-textSecondary hover:bg-tile-hover hover:border-border-strong
                        transition-float shadow-layered-sm button-lift-dynamic"
                >
                    Back
                </button>
                <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold
                        text-white bg-blue-500 border border-blue-500
                        hover:bg-blue-600 shadow-layered
                        transition-float button-lift-dynamic
                        disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Sign In'}
                </button>
            </div>

            {/* Dev Helper - Only visible in DEV */}
            {import.meta.env.DEV && (
                <button
                    type="button"
                    onClick={fillDevCredentials}
                    className="w-full text-[10px] text-brand-textSecondary hover:text-brand-accent transition-colors mt-2"
                >
                    Dev: Fill Test Credentials
                </button>
            )}
        </form>
    );
};

export default EmailLoginForm;
