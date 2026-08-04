import React, { useRef, useEffect, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import './Shuffle.css';

gsap.registerPlugin(ScrollTrigger, SplitText);

const Shuffle = ({
    text,
    className = '',
    style = {},
    tag = 'h1',
    textAlign = 'center',
    duration = 0.5,
    stagger = 0.03,
    ease = 'power3.out',
    colorFrom,
    colorTo,
    triggerOnce = true,
    triggerOnHover = true,
    threshold = 0.1,
}) => {
    const ref = useRef(null);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        if (!ref.current || !text) return;

        const el = ref.current;
        el.textContent = text;

        // Wait for fonts
        document.fonts.ready.then(() => {
            const split = new SplitText(el, { type: 'chars' });
            const chars = split.chars;

            // Set initial state
            gsap.set(chars, {
                opacity: 0,
                y: 20,
                rotateX: -90,
                color: colorFrom || undefined,
            });

            setReady(true);

            // Animate on scroll
            const st = ScrollTrigger.create({
                trigger: el,
                start: `top ${(1 - threshold) * 100}%`,
                once: triggerOnce,
                onEnter: () => animateIn(chars),
            });

            // Hover replay
            if (triggerOnHover) {
                el.addEventListener('mouseenter', () => {
                    gsap.set(chars, { opacity: 0, y: 20, rotateX: -90, color: colorFrom || undefined });
                    animateIn(chars);
                });
            }

            function animateIn(chars) {
                gsap.to(chars, {
                    opacity: 1,
                    y: 0,
                    rotateX: 0,
                    color: colorTo || undefined,
                    duration,
                    stagger,
                    ease,
                });
            }

            return () => {
                st.kill();
                split.revert();
            };
        });
    }, [text]);

    const Tag = tag;
    const classes = `shuffle-parent ${ready ? 'is-ready' : ''} ${className}`;

    return <Tag ref={ref} className={classes} style={{ textAlign, ...style }}>{text}</Tag>;
};

export default Shuffle;
