import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    define: {
        'process.env': {},
        global: 'globalThis',
    },
    resolve: {
        alias: {
            buffer: 'buffer',
            // simple-peer's regular entry point has circular readable-stream requires
            // across several files that Vite/esbuild's dependency pre-bundler doesn't
            // reliably resolve — it leaves `Readable` undefined by the time `Duplex`'s
            // constructor needs it, crashing every peer connection on creation with
            // "Cannot read properties of undefined (reading 'call')". The package ships
            // its own pre-flattened browserify bundle specifically to avoid this; use it.
            'simple-peer': 'simple-peer/simplepeer.min.js',
        },
    },
    server: {
        port: 5173,
        proxy: {
            '/api': {
                target: 'http://localhost:3000',
            },
            '/socket.io': {
                target: 'http://localhost:3000',
                ws: true,
            },
        },
    },
    build: {
        outDir: 'dist',
    },
});
