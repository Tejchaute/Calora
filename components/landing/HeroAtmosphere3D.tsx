'use client';

import { useEffect, useRef } from 'react';
import type { BufferGeometry, Material, Mesh, Object3D, PerspectiveCamera, Scene, WebGLRenderer } from 'three';

export function HeroAtmosphere3D() {
    const hostRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const host = hostRef.current;
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const desktop = window.matchMedia('(min-width: 1024px)').matches;
        if (!host || reduceMotion || !desktop) return;

        let renderer: WebGLRenderer | undefined;
        let frame = 0;
        let running = false;
        let disposed = false;
        let resizeObserver: ResizeObserver | undefined;
        let scene: Scene | undefined;
        let camera: PerspectiveCamera | undefined;
        let sceneRoot: Object3D | undefined;
        let cards: Mesh[] = [];
        let lastFrame = 0;

        const setup = async () => {
            if (renderer || disposed) return;
            const THREE = await import('three');
            if (disposed) return;

            scene = new THREE.Scene();
            camera = new THREE.PerspectiveCamera(34, 1, 0.1, 30);
            camera.position.set(0, 0, 8.2);
            renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.35));
            renderer.setClearColor(0x000000, 0);
            renderer.domElement.setAttribute('aria-hidden', 'true');
            host.appendChild(renderer.domElement);

            const root = new THREE.Group();
            root.rotation.x = -0.1;
            root.rotation.y = 0.08;
            scene.add(root);
            sceneRoot = root;

            const grid = new THREE.GridHelper(6.4, 8, 0x5146d8, 0xc9ced8);
            grid.rotation.x = Math.PI / 2;
            grid.position.z = -0.8;
            const gridMaterials = Array.isArray(grid.material) ? grid.material : [grid.material];
            gridMaterials.forEach((material) => { material.transparent = true; material.opacity = 0.18; });
            root.add(grid);

            const cardGeometry = new THREE.BoxGeometry(1.08, 0.42, 0.08);
            const purple = new THREE.MeshBasicMaterial({ color: 0x5146d8, transparent: true, opacity: 0.5 });
            const lavender = new THREE.MeshBasicMaterial({ color: 0xafaaF7, transparent: true, opacity: 0.42 });
            const green = new THREE.MeshBasicMaterial({ color: 0x087b65, transparent: true, opacity: 0.42 });
            const positions = [
                [-2.45, 1.5, 0.1, purple], [2.35, 1.25, 0.35, lavender],
                [-2.65, -1.35, 0.5, green], [2.5, -1.45, 0.15, purple],
            ] as const;
            cards = positions.map(([x, y, z, material], index) => {
                const card = new THREE.Mesh(cardGeometry, material);
                card.position.set(x, y, z);
                card.rotation.z = index % 2 === 0 ? -0.08 : 0.08;
                root.add(card);
                return card;
            });

            const nodeGeometry = new THREE.SphereGeometry(0.08, 10, 8);
            const nodeMaterial = new THREE.MeshBasicMaterial({ color: 0x5146d8, transparent: true, opacity: 0.6 });
            [[-3, 0.15, 0], [3, 0.45, 0.2], [-1.85, -2, 0.25], [1.8, 2, 0.1]].forEach(([x, y, z]) => {
                const node = new THREE.Mesh(nodeGeometry, nodeMaterial);
                node.position.set(x, y, z);
                root.add(node);
            });

            const resize = () => {
                if (!renderer || !camera) return;
                const width = host.clientWidth;
                const height = host.clientHeight;
                renderer.setSize(width, height, false);
                camera.aspect = width / Math.max(height, 1);
                camera.updateProjectionMatrix();
            };
            resizeObserver = new ResizeObserver(resize);
            resizeObserver.observe(host);
            resize();

            const render = (time: number) => {
                if (!running || disposed || !renderer || !scene || !camera || !sceneRoot) { frame = 0; return; }
                frame = requestAnimationFrame(render);
                if (time - lastFrame < 33) return;
                lastFrame = time;
                const seconds = time / 1000;
                sceneRoot.rotation.y = 0.08 + Math.sin(seconds * 0.32) * 0.035;
                cards.forEach((card, index) => { card.rotation.z = (index % 2 === 0 ? -0.08 : 0.08) + Math.sin(seconds * 0.55 + index) * 0.018; });
                renderer.render(scene, camera);
            };
            if (running) frame = requestAnimationFrame(render);
        };

        const observer = new IntersectionObserver(([entry]) => {
            running = Boolean(entry?.isIntersecting) && !document.hidden;
            if (running) {
                void setup();
                if (renderer && !frame) frame = requestAnimationFrame((time) => { lastFrame = time - 34; frame = requestAnimationFrame(function tick(nextTime) {
                    if (!running || disposed || !renderer || !scene || !camera || !sceneRoot) { frame = 0; return; }
                    frame = requestAnimationFrame(tick);
                    if (nextTime - lastFrame < 33) return;
                    lastFrame = nextTime;
                    const seconds = nextTime / 1000;
                    sceneRoot.rotation.y = 0.08 + Math.sin(seconds * 0.32) * 0.035;
                    cards.forEach((card, index) => { card.rotation.z = (index % 2 === 0 ? -0.08 : 0.08) + Math.sin(seconds * 0.55 + index) * 0.018; });
                    renderer.render(scene, camera);
                }); });
            } else if (frame) {
                cancelAnimationFrame(frame);
                frame = 0;
            }
        }, { threshold: 0.05 });
        observer.observe(host);

        const handleVisibility = () => {
            if (document.hidden && frame) {
                running = false;
                cancelAnimationFrame(frame);
                frame = 0;
            }
        };
        document.addEventListener('visibilitychange', handleVisibility);

        return () => {
            disposed = true;
            running = false;
            observer.disconnect();
            document.removeEventListener('visibilitychange', handleVisibility);
            resizeObserver?.disconnect();
            if (frame) cancelAnimationFrame(frame);
            sceneRoot?.traverse((object) => {
                const mesh = object as Mesh;
                (mesh.geometry as BufferGeometry | undefined)?.dispose?.();
                const materials = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
                materials.forEach((material) => (material as Material).dispose());
            });
            renderer?.dispose();
            renderer?.domElement.remove();
        };
    }, []);

    return <div ref={hostRef} className="pointer-events-none absolute -inset-16 z-0 hidden opacity-80 lg:block" aria-hidden="true" />;
}
