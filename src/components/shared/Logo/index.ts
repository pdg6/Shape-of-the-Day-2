/**
 * Logo Component System
 * 
 * 6 animated logo variants for use throughout the application:
 * - LogoStatic: Clean, no animation (headers, favicons)
 * - LogoBeam: Glowing beams + icon draw (hero sections, loading)
 * - LogoTrace: Blueprint-style border tracing (reveal animations)
 * - LogoCycleLoop: Sequential build that loops (backgrounds)
 * - LogoCycleOnce: Sequential build ending static (page load, onboarding)
 * - LogoSlide: Staggered slide-in from left (modern entrance)
 */

export { LogoStatic } from './LogoStatic';
export { LogoBeam } from './LogoBeam';
export { LogoTrace } from './LogoTrace';
export { LogoCycleLoop } from './LogoCycleLoop';
export { LogoCycleOnce } from './LogoCycleOnce';
export { LogoSlide } from './LogoSlide';

// Re-export base component for advanced usage
export { LogoSvg } from './LogoSvg';
