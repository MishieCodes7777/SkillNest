import { useEffect, useMemo, useRef, useCallback } from 'react';
import { useGesture } from '@use-gesture/react';
import './DomeGallery.css';

const DEFAULTS = { maxVerticalRotationDeg: 5, dragSensitivity: 20, enlargeTransitionMs: 300, segments: 35 };
const FALLBACK_IMG = 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400&h=400&fit=crop';
const clamp = (v, min, max) => Math.min(Math.max(v, min), max);
const normalizeAngle = d => ((d % 360) + 360) % 360;
const wrapAngleSigned = deg => { const a = (((deg + 180) % 360) + 360) % 360; return a - 180; };
const getDataNumber = (el, name, fallback) => { const attr = el.dataset[name] ?? el.getAttribute(`data-${name}`); const n = attr == null ? NaN : parseFloat(attr); return Number.isFinite(n) ? n : fallback; };

function buildItems(pool, seg) {
    const xCols = Array.from({ length: seg }, (_, i) => -37 + i * 2);
    const evenYs = [-4, -2, 0, 2, 4]; const oddYs = [-3, -1, 1, 3, 5];
    const coords = xCols.flatMap((x, c) => (c % 2 === 0 ? evenYs : oddYs).map(y => ({ x, y, sizeX: 2, sizeY: 2 })));
    const totalSlots = coords.length;
    if (pool.length === 0) return coords.map(c => ({ ...c, src: '', alt: '' }));
    const norm = pool.map(img => typeof img === 'string' ? { src: img, alt: '' } : { src: img.src || '', alt: img.alt || '' });
    const used = Array.from({ length: totalSlots }, (_, i) => norm[i % norm.length]);
    for (let i = 1; i < used.length; i++) { if (used[i].src === used[i - 1].src) { for (let j = i + 1; j < used.length; j++) { if (used[j].src !== used[i].src) { [used[i], used[j]] = [used[j], used[i]]; break; } } } }
    return coords.map((c, i) => ({ ...c, src: used[i].src, alt: used[i].alt }));
}

function computeItemBaseRotation(offsetX, offsetY, sizeX, sizeY, segments) {
    const unit = 360 / segments / 2;
    return { rotateX: unit * (offsetY - (sizeY - 1) / 2), rotateY: unit * (offsetX + (sizeX - 1) / 2) };
}

export default function DomeGallery({ images = [], fit = 0.5, fitBasis = 'auto', minRadius = 600, maxRadius = Infinity, padFactor = 0.25, overlayBlurColor = '#050816', maxVerticalRotationDeg = DEFAULTS.maxVerticalRotationDeg, dragSensitivity = DEFAULTS.dragSensitivity, enlargeTransitionMs = DEFAULTS.enlargeTransitionMs, segments = DEFAULTS.segments, dragDampening = 2, openedImageWidth = '250px', openedImageHeight = '350px', imageBorderRadius = '30px', openedImageBorderRadius = '30px', grayscale = true, onTileClick }) {
    const rootRef = useRef(null); const mainRef = useRef(null); const sphereRef = useRef(null);
    const frameRef = useRef(null); const viewerRef = useRef(null); const scrimRef = useRef(null);
    const focusedElRef = useRef(null); const originalTilePositionRef = useRef(null);
    const rotationRef = useRef({ x: 0, y: 0 }); const startRotRef = useRef({ x: 0, y: 0 });
    const startPosRef = useRef(null); const draggingRef = useRef(false); const movedRef = useRef(false);
    const inertiaRAF = useRef(null); const openingRef = useRef(false);
    const openStartedAtRef = useRef(0); const lastDragEndAt = useRef(0); const scrollLockedRef = useRef(false);

    const lockScroll = useCallback(() => { if (scrollLockedRef.current) return; scrollLockedRef.current = true; document.body.classList.add('dg-scroll-lock'); }, []);
    const unlockScroll = useCallback(() => { if (!scrollLockedRef.current) return; if (rootRef.current?.getAttribute('data-enlarging') === 'true') return; scrollLockedRef.current = false; document.body.classList.remove('dg-scroll-lock'); }, []);
    const items = useMemo(() => buildItems(images, segments), [images, segments]);
    const applyTransform = (xDeg, yDeg) => { if (sphereRef.current) sphereRef.current.style.transform = `translateZ(calc(var(--radius) * -1)) rotateX(${xDeg}deg) rotateY(${yDeg}deg)`; };

    useEffect(() => {
        const root = rootRef.current; if (!root) return;
        const ro = new ResizeObserver(entries => {
            const cr = entries[0].contentRect; const w = Math.max(1, cr.width), h = Math.max(1, cr.height);
            const minDim = Math.min(w, h), aspect = w / h;
            let basis; switch (fitBasis) { case 'min': basis = minDim; break; case 'max': basis = Math.max(w, h); break; case 'width': basis = w; break; case 'height': basis = h; break; default: basis = aspect >= 1.3 ? w : minDim; }
            let radius = clamp(Math.min(basis * fit, h * 1.35), minRadius, maxRadius);
            root.style.setProperty('--radius', `${Math.round(radius)}px`);
            root.style.setProperty('--viewer-pad', `${Math.max(8, Math.round(minDim * padFactor))}px`);
            root.style.setProperty('--overlay-blur-color', overlayBlurColor);
            root.style.setProperty('--tile-radius', imageBorderRadius);
            root.style.setProperty('--enlarge-radius', openedImageBorderRadius);
            root.style.setProperty('--image-filter', grayscale ? 'grayscale(1)' : 'none');
            applyTransform(rotationRef.current.x, rotationRef.current.y);
        });
        ro.observe(root); return () => ro.disconnect();
    }, [fit, fitBasis, minRadius, maxRadius, padFactor, overlayBlurColor, grayscale, imageBorderRadius, openedImageBorderRadius]);

    useEffect(() => { applyTransform(0, 0); }, []);
    const stopInertia = useCallback(() => { if (inertiaRAF.current) { cancelAnimationFrame(inertiaRAF.current); inertiaRAF.current = null; } }, []);
    const startInertia = useCallback((vx, vy) => {
        let vX = clamp(vx, -1.4, 1.4) * 80, vY = clamp(vy, -1.4, 1.4) * 80; let frames = 0;
        const d = clamp(dragDampening ?? 0.6, 0, 1); const frictionMul = 0.94 + 0.055 * d; const maxFrames = Math.round(90 + 270 * d);
        const step = () => {
            vX *= frictionMul; vY *= frictionMul; if (Math.abs(vX) < 0.01 && Math.abs(vY) < 0.01) return; if (++frames > maxFrames) return;
            rotationRef.current = { x: clamp(rotationRef.current.x - vY / 200, -maxVerticalRotationDeg, maxVerticalRotationDeg), y: wrapAngleSigned(rotationRef.current.y + vX / 200) };
            applyTransform(rotationRef.current.x, rotationRef.current.y); inertiaRAF.current = requestAnimationFrame(step);
        };
        stopInertia(); inertiaRAF.current = requestAnimationFrame(step);
    }, [dragDampening, maxVerticalRotationDeg, stopInertia]);

    useGesture({
        onDragStart: ({ event }) => { if (focusedElRef.current) return; stopInertia(); draggingRef.current = true; movedRef.current = false; startRotRef.current = { ...rotationRef.current }; startPosRef.current = { x: event.clientX, y: event.clientY }; },
        onDrag: ({ event, last, velocity = [0, 0], direction = [0, 0], movement }) => {
            if (focusedElRef.current || !draggingRef.current || !startPosRef.current) return;
            const dx = event.clientX - startPosRef.current.x, dy = event.clientY - startPosRef.current.y;
            if (!movedRef.current && dx * dx + dy * dy > 16) movedRef.current = true;
            const nextX = clamp(startRotRef.current.x - dy / dragSensitivity, -maxVerticalRotationDeg, maxVerticalRotationDeg);
            const nextY = wrapAngleSigned(startRotRef.current.y + dx / dragSensitivity);
            rotationRef.current = { x: nextX, y: nextY }; applyTransform(nextX, nextY);
            if (last) {
                draggingRef.current = false; let [vMagX, vMagY] = velocity; const [dirX, dirY] = direction; let vx = vMagX * dirX, vy = vMagY * dirY;
                if (Math.abs(vx) < 0.001 && Math.abs(vy) < 0.001 && Array.isArray(movement)) { vx = clamp((movement[0] / dragSensitivity) * 0.02, -1.2, 1.2); vy = clamp((movement[1] / dragSensitivity) * 0.02, -1.2, 1.2); }
                if (Math.abs(vx) > 0.005 || Math.abs(vy) > 0.005) startInertia(vx, vy); if (movedRef.current) lastDragEndAt.current = performance.now(); movedRef.current = false;
            }
        },
    }, { target: mainRef, eventOptions: { passive: true } });

    const handleTileClick = useCallback(item => e => {
        if (draggingRef.current || movedRef.current || performance.now() - lastDragEndAt.current < 80 || openingRef.current) return;
        onTileClick?.(item);
    }, [onTileClick]);

    useEffect(() => () => { document.body.classList.remove('dg-scroll-lock'); }, []);

    return (
        <div ref={rootRef} className="sphere-root" style={{ '--segments-x': segments, '--segments-y': segments, '--overlay-blur-color': overlayBlurColor, '--tile-radius': imageBorderRadius, '--enlarge-radius': openedImageBorderRadius, '--image-filter': grayscale ? 'grayscale(1)' : 'none' }}>
            <main ref={mainRef} className="sphere-main">
                <div className="stage"><div ref={sphereRef} className="sphere">
                    {items.map((it, i) => (
                        <div key={`${it.x},${it.y},${i}`} className="item" data-src={it.src} data-offset-x={it.x} data-offset-y={it.y} data-size-x={it.sizeX} data-size-y={it.sizeY} style={{ '--offset-x': it.x, '--offset-y': it.y, '--item-size-x': it.sizeX, '--item-size-y': it.sizeY }}>
                            <div className="item__image" role="button" tabIndex={0} title={it.alt} onClick={handleTileClick(it)}><img src={it.src} draggable={false} alt={it.alt} onError={e => { e.target.onerror = null; e.target.src = FALLBACK_IMG; }} /></div>
                        </div>))}
                </div></div>
                <div className="overlay" /><div className="overlay overlay--blur" />
                <div className="edge-fade edge-fade--top" /><div className="edge-fade edge-fade--bottom" />
                <div className="viewer" ref={viewerRef}><div ref={scrimRef} className="scrim" /><div ref={frameRef} className="frame" /></div>
            </main>
        </div>);
}
