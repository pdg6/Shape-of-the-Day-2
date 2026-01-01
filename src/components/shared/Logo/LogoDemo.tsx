import React from 'react';
import {
    LogoStatic,
    LogoBeam,
    LogoTrace,
    LogoCycleLoop,
    LogoCycleOnce,
    LogoSlide,
} from './index';

/**
 * Demo page to visually test all 6 logo variants.
 * Navigate to this component or embed it temporarily to verify animations.
 */
export const LogoDemo: React.FC = () => {
    const logoSize = 180;

    return (
        <div
            style={{
                backgroundColor: 'var(--color-page, #0f1115)',
                minHeight: '100vh',
                padding: '2rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '3rem',
            }}
        >
            <h1
                style={{
                    color: 'var(--color-brand-textPrimary, #F8FAFC)',
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    marginBottom: '1rem',
                }}
            >
                Logo Component Variants
            </h1>

            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: '2rem',
                    width: '100%',
                    maxWidth: '1200px',
                }}
            >
                {/* Static */}
                <div style={{ textAlign: 'center' }}>
                    <LogoStatic size={logoSize} />
                    <p
                        style={{
                            color: 'var(--color-brand-textSecondary, #94A3B8)',
                            marginTop: '1rem',
                            fontWeight: 600,
                        }}
                    >
                        Static
                    </p>
                </div>

                {/* Beam */}
                <div style={{ textAlign: 'center' }}>
                    <LogoBeam size={logoSize} />
                    <p
                        style={{
                            color: 'var(--color-brand-textSecondary, #94A3B8)',
                            marginTop: '1rem',
                            fontWeight: 600,
                        }}
                    >
                        Beam (Standard)
                    </p>
                </div>

                {/* Trace */}
                <div style={{ textAlign: 'center' }}>
                    <LogoTrace size={logoSize} />
                    <p
                        style={{
                            color: 'var(--color-brand-textSecondary, #94A3B8)',
                            marginTop: '1rem',
                            fontWeight: 600,
                        }}
                    >
                        Trace
                    </p>
                </div>

                {/* Cycle Loop */}
                <div style={{ textAlign: 'center' }}>
                    <LogoCycleLoop size={logoSize} />
                    <p
                        style={{
                            color: 'var(--color-brand-textSecondary, #94A3B8)',
                            marginTop: '1rem',
                            fontWeight: 600,
                        }}
                    >
                        Cycle (Loop)
                    </p>
                </div>

                {/* Cycle Once */}
                <div style={{ textAlign: 'center' }}>
                    <LogoCycleOnce size={logoSize} />
                    <p
                        style={{
                            color: 'var(--color-brand-textSecondary, #94A3B8)',
                            marginTop: '1rem',
                            fontWeight: 600,
                        }}
                    >
                        Cycle (1x)
                    </p>
                </div>

                {/* Slide */}
                <div style={{ textAlign: 'center' }}>
                    <LogoSlide size={logoSize} />
                    <p
                        style={{
                            color: 'var(--color-brand-textSecondary, #94A3B8)',
                            marginTop: '1rem',
                            fontWeight: 600,
                        }}
                    >
                        Slide
                    </p>
                </div>
            </div>

            <p
                style={{
                    color: 'var(--color-brand-textMuted, #64748B)',
                    fontSize: '0.875rem',
                    marginTop: '2rem',
                }}
            >
                Click to refresh and re-trigger animations
            </p>
        </div>
    );
};

export default LogoDemo;
