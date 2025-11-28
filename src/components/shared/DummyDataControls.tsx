import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { loadDummyData, clearDummyData, hasDummyData, getDummyJoinCodes } from '../../services/dummyDataService';
import toast from 'react-hot-toast';

/**
 * DummyDataControls - Development utility component
 * 
 * Use this component in teacher dashboard during development to:
 * 1. Load dummy classroom data (including the classroom with joinCode 123456)
 * 2. Clear dummy data
 * 3. View available join codes
 * 
 * REMOVE THIS COMPONENT IN PRODUCTION
 */
export const DummyDataControls: React.FC = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [dataExists, setDataExists] = useState<boolean | null>(null);

    const handleLoadData = async () => {
        if (!user) {
            toast.error('Please sign in first');
            return;
        }

        setLoading(true);
        try {
            await loadDummyData(user.uid);
            await checkDataStatus();
            const codes = getDummyJoinCodes();
            console.log('Available join codes:', codes);
        } catch (error) {
            console.error('Load error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleClearData = async () => {
        setLoading(true);
        try {
            await clearDummyData();
            await checkDataStatus();
        } catch (error) {
            console.error('Clear error:', error);
        } finally {
            setLoading(false);
        }
    };

    const checkDataStatus = async () => {
        const exists = await hasDummyData();
        setDataExists(exists);
    };

    const showJoinCodes = () => {
        const codes = getDummyJoinCodes();
        const message = codes.map((c: { name: string; code: string }) => `${c.name}: ${c.code}`).join('\n');
        toast.success(`Join Codes:\n${message}`, { duration: 8000 });
        console.log('Join codes:', codes);
    };

    React.useEffect(() => {
        checkDataStatus();
    }, []);

    return (
        <div className="fixed bottom-5 right-5 p-4 bg-gray-800 rounded-xl border-[3px] border-blue-500 text-white min-w-[250px] z-toast">
            <h3 className="text-sm font-bold mb-3">
                🛠️ Dev Tools
            </h3>

            <div className="text-xs mb-2">
                Status: {dataExists === null ? '...' : dataExists ? '✅ Data loaded' : '❌ No data'}
            </div>

            <div className="flex flex-col gap-2">
                <button
                    onClick={handleLoadData}
                    disabled={loading}
                    className={`
                        px-3 py-2 bg-emerald-500 rounded-md text-white text-xs font-bold cursor-pointer transition-colors
                        ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-emerald-600'}
                    `}
                >
                    {loading ? 'Loading...' : 'Load Dummy Data'}
                </button>

                <button
                    onClick={showJoinCodes}
                    className="px-3 py-2 bg-blue-500 rounded-md text-white text-xs font-bold cursor-pointer transition-colors hover:bg-blue-600"
                >
                    Show Join Codes
                </button>

                <button
                    onClick={handleClearData}
                    disabled={loading}
                    className={`
                        px-3 py-2 bg-red-500 rounded-md text-white text-xs font-bold cursor-pointer transition-colors
                        ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-600'}
                    `}
                >
                    {loading ? 'Clearing...' : 'Clear Data'}
                </button>
            </div>

            <p className="text-[10px] mt-2 opacity-70">
                DEV ONLY - Remove in production
            </p>
        </div>
    );
};
