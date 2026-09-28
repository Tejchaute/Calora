'use client';

import React, { type PointerEvent, type PropsWithChildren } from 'react';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { motion, useMotionValue, useScroll, useSpring, useTransform } from 'motion/react';

const HeroAtmosphere3D = dynamic(
    () => import('./HeroAtmosphere3D').then((module) => module.HeroAtmosphere3D),
    { ssr: false },
);

type MotionBlockProps = PropsWithChildren<{ className?: string; delay?: number; direction?: 'up' | 'left' | 'right' }>;
const ease = [0.22, 1, 0.36, 1] as const;
type MotionMode = 'pending' | 'reduced' | 'enabled';
const LandingMotionContext = createContext<MotionMode>('pending');

export function LandingMotionProvider({ children }: PropsWithChildren) {
    const [mode, setMode] = useState<MotionMode>('pending');

    useEffect(() => {
        const query = window.matchMedia('(prefers-reduced-motion: reduce)');
        const update = () => setMode(query.matches ? 'reduced' : 'enabled');
        update();
        query.addEventListener('change', update);
        return () => query.removeEventListener('change', update);
    }, []);

    return <LandingMotionContext.Provider value={mode}>{children}</LandingMotionContext.Provider>;
}

function useLandingMotion() {
    return useContext(LandingMotionContext);
}

function useDesktopMotion() {
    const [enabled, setEnabled] = useState(false);
    useEffect(() => {
        const query = window.matchMedia('(min-width: 1024px) and (hover: hover) and (pointer: fine)');
        const update = () => setEnabled(query.matches);
        update();
        query.addEventListener('change', update);
        return () => query.removeEventListener('change', update);
    }, []);
    return enabled;
}

export function Reveal({ children, className, delay = 0, direction = 'up' }: MotionBlockProps) {
    const mode = useLandingMotion();
    const offset = direction === 'left' ? { x: -34, y: 0 } : direction === 'right' ? { x: 34, y: 0 } : { x: 0, y: 36 };
    if (mode !== 'enabled') return <div className={className}>{children}</div>;
    return <motion.div className={className} initial={{ opacity: 0, ...offset, scale: 0.975 }} whileInView={{ opacity: 1, x: 0, y: 0, scale: 1 }} viewport={{ once: true, amount: 0.12, margin: '0px 0px -5% 0px' }} transition={{ duration: 0.7, delay, ease }}>{children}</motion.div>;
}

export function RevealGroup({ children, className, delay = 0 }: MotionBlockProps) {
    const mode = useLandingMotion();
    if (mode !== 'enabled') return <div className={className}>{children}</div>;
    return <motion.div className={className} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.12, margin: '0px 0px -5% 0px' }} variants={{ hidden: { opacity: 0, y: 38 }, visible: { opacity: 1, y: 0, transition: { duration: 0.68, delay, ease, staggerChildren: 0.09 } } }}>{children}</motion.div>;
}

export function RevealItem({ children, className }: Omit<MotionBlockProps, 'delay' | 'direction'>) {
    const mode = useLandingMotion();
    if (mode !== 'enabled') return <div className={className}>{children}</div>;
    return <motion.div className={className} variants={{ hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.62, ease } } }}>{children}</motion.div>;
}

export function ScrollFloat({ children, className, distance = 22 }: PropsWithChildren<{ className?: string; distance?: number }>) {
    const ref = useRef<HTMLDivElement>(null);
    const mode = useLandingMotion();
    const desktop = useDesktopMotion();
    const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
    const y = useTransform(scrollYProgress, [0, 1], [distance, -distance]);
    if (mode !== 'enabled' || !desktop) return <div ref={ref} className={className}>{children}</div>;
    return <motion.div ref={ref} className={className} style={{ y }}>{children}</motion.div>;
}

export function ProductLayer({ children, className, depth = 0, delay = 0 }: PropsWithChildren<{ className?: string; depth?: number; delay?: number }>) {
    const mode = useLandingMotion();
    if (mode !== 'enabled') return <div className={className}>{children}</div>;
    return <motion.div className={className} style={{ z: depth }} initial={{ opacity: 0, y: 18, scale: 0.98 }} whileInView={{ opacity: 1, y: 0, scale: 1 }} viewport={{ once: true, amount: 0.45 }} transition={{ duration: 0.62, delay, ease }}>{children}</motion.div>;
}

export function HeroDepth({ children, className }: PropsWithChildren<{ className?: string }>) {
    const ref = useRef<HTMLDivElement>(null);
    const mode = useLandingMotion();
    const desktop = useDesktopMotion();
    const rawRotateX = useMotionValue(0);
    const rawRotateY = useMotionValue(0);
    const rotateX = useSpring(rawRotateX, { stiffness: 130, damping: 22, mass: 0.7 });
    const rotateY = useSpring(rawRotateY, { stiffness: 130, damping: 22, mass: 0.7 });
    const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
    const parallaxY = useTransform(scrollYProgress, [0, 1], [0, -26]);

    const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
        if (!desktop || mode !== 'enabled' || event.pointerType !== 'mouse') return;
        const rect = event.currentTarget.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        rawRotateX.set(-y * 4);
        rawRotateY.set(x * 6);
    };

    const resetTilt = () => {
        rawRotateX.set(0);
        rawRotateY.set(0);
    };

    if (mode !== 'enabled') return <div ref={ref} className={`relative ${className ?? ''}`}>{children}</div>;

    return (
        <div ref={ref} className={`relative [perspective:1400px] ${className ?? ''}`} onPointerMove={handlePointerMove} onPointerLeave={resetTilt}>
            <HeroAtmosphere3D />
            <motion.div className="relative z-10" style={{ y: desktop ? parallaxY : 0 }}>
                <motion.div initial={{ opacity: 0, y: 34, scale: 0.965 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.82, delay: 0.16, ease }}>
                    <motion.div animate={desktop ? { y: [0, -6, 0] } : undefined} transition={{ duration: 6.2, repeat: Infinity, ease: 'easeInOut' }}>
                        <motion.div className="relative [transform-style:preserve-3d]" style={{ rotateX: desktop ? rotateX : 0, rotateY: desktop ? rotateY : 0 }}>{children}</motion.div>
                    </motion.div>
                </motion.div>
            </motion.div>
        </div>
    );
}
