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
        <div style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            padding: '16px',
            backgroundColor: '#1f2937',
            borderRadius: '12px',
            border: '3px solid #3b82f6',
            color: 'white',
            minWidth: '250px',
            zIndex: 9999
        }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 'bold' }}>
                🛠️ Dev Tools
            </h3>

            <div style={{ marginBottom: '8px', fontSize: '12px' }}>
                Status: {dataExists === null ? '...' : dataExists ? '✅ Data loaded' : '❌ No data'}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                    onClick={handleLoadData}
                    disabled={loading}
                    style={{
                        padding: '8px 12px',
                        backgroundColor: '#10b981',
                        border: 'none',
                        borderRadius: '6px',
                        color: 'white',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        fontSize: '12px',
                        fontWeight: 'bold'
                    }}
                >
                    {loading ? 'Loading...' : 'Load Dummy Data'}
                </button>

                <button
                    onClick={showJoinCodes}
                    style={{
                        padding: '8px 12px',
                        backgroundColor: '#3b82f6',
                        border: 'none',
                        borderRadius: '6px',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: 'bold'
                    }}
                >
                    Show Join Codes
                </button>

                <button
                    onClick={handleClearData}
                    disabled={loading}
                    style={{
                        padding: '8px 12px',
                        backgroundColor: '#ef4444',
                        border: 'none',
                        borderRadius: '6px',
                        color: 'white',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        fontSize: '12px',
                        fontWeight: 'bold'
                    }}
                >
                    {loading ? 'Clearing...' : 'Clear Data'}
                </button>
            </div>

            <p style={{ fontSize: '10px', marginTop: '8px', opacity: 0.7 }}>
                DEV ONLY - Remove in production
            </p>
        </div>
    );
};
