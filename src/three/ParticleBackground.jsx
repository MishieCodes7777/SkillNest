import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function Particles() {
    const meshRef = useRef();
    const count = 1500;

    const [positions, colors] = useMemo(() => {
        const pos = new Float32Array(count * 3);
        const col = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            pos[i * 3] = (Math.random() - 0.5) * 20;
            pos[i * 3 + 1] = (Math.random() - 0.5) * 20;
            pos[i * 3 + 2] = (Math.random() - 0.5) * 20;
            const t = Math.random();
            col[i * 3] = 0.9 + t * 0.1;
            col[i * 3 + 1] = 0.2 + t * 0.3;
            col[i * 3 + 2] = 0.5 + t * 0.5;
        }
        return [pos, col];
    }, []);

    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.rotation.y += 0.0003;
            meshRef.current.rotation.x += 0.0001;
        }
    });

    return (
        <points ref={meshRef}>
            <bufferGeometry>
                <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
                <bufferAttribute attach="attributes-color" count={count} array={colors} itemSize={3} />
            </bufferGeometry>
            <pointsMaterial size={0.03} vertexColors transparent opacity={0.7} blending={THREE.AdditiveBlending} />
        </points>
    );
}

function FloatingShapes() {
    const shapes = useRef([]);

    const meshes = useMemo(() => {
        return Array.from({ length: 5 }, (_, i) => ({
            position: [(Math.random() - 0.5) * 12, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 6 - 3],
            rotation: [Math.random() * Math.PI, Math.random() * Math.PI, 0],
            speed: { x: 0.002 + Math.random() * 0.005, y: 0.002 + Math.random() * 0.005 },
            floatSpeed: 0.3 + Math.random() * 0.5,
            floatOffset: Math.random() * Math.PI * 2,
            type: ['icosahedron', 'octahedron', 'tetrahedron'][Math.floor(Math.random() * 3)],
        }));
    }, []);

    useFrame((state) => {
        const time = state.clock.elapsedTime;
        shapes.current.forEach((mesh, i) => {
            if (mesh) {
                mesh.rotation.x += meshes[i].speed.x;
                mesh.rotation.y += meshes[i].speed.y;
                mesh.position.y += Math.sin(time * meshes[i].floatSpeed + meshes[i].floatOffset) * 0.003;
            }
        });
    });

    return meshes.map((m, i) => (
        <mesh key={i} ref={el => shapes.current[i] = el} position={m.position} rotation={m.rotation}>
            {m.type === 'icosahedron' && <icosahedronGeometry args={[0.5, 0]} />}
            {m.type === 'octahedron' && <octahedronGeometry args={[0.4, 0]} />}
            {m.type === 'tetrahedron' && <tetrahedronGeometry args={[0.4, 0]} />}
            <meshBasicMaterial color="#8b5cf6" wireframe transparent opacity={0.15} />
        </mesh>
    ));
}

export default function ParticleBackground({ style }) {
    return (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none', ...style }}>
            <Canvas camera={{ position: [0, 0, 5], fov: 75 }}>
                <Particles />
                <FloatingShapes />
            </Canvas>
        </div>
    );
}
