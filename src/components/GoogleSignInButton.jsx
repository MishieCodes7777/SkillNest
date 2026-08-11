import React, { useEffect, useRef, useState } from 'react';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// onSuccess receives the same { success, user, token } shape as normal login/signup.
export default function GoogleSignInButton({ onSuccess, onError }) {
    const buttonRef = useRef(null);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        if (!CLIENT_ID) return;
        let cancelled = false;

        function init() {
            if (cancelled || !window.google?.accounts?.id || !buttonRef.current) return;
            window.google.accounts.id.initialize({
                client_id: CLIENT_ID,
                callback: async (response) => {
                    try {
                        const res = await fetch('/api/auth/google', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ credential: response.credential }),
                        });
                        const data = await res.json();
                        if (data.success) onSuccess?.(data);
                        else onError?.(data.message || 'Google sign-in failed.');
                    } catch (e) { onError?.('Could not connect to the server.'); }
                },
            });
            window.google.accounts.id.renderButton(buttonRef.current, {
                theme: 'filled_black', size: 'large', width: 320, text: 'continue_with',
            });
            setReady(true);
        }

        // The GIS script tag loads async — poll briefly until it's available.
        if (window.google?.accounts?.id) init();
        else {
            const interval = setInterval(() => {
                if (window.google?.accounts?.id) { clearInterval(interval); init(); }
            }, 150);
            const timeout = setTimeout(() => clearInterval(interval), 10000);
            return () => { cancelled = true; clearInterval(interval); clearTimeout(timeout); };
        }
        return () => { cancelled = true; };
    }, []);

    if (!CLIENT_ID) return null; // Not configured — callers fall back to their existing button.

    return <div ref={buttonRef} style={{ display: 'flex', justifyContent: 'center', opacity: ready ? 1 : 0, minHeight: ready ? 'auto' : 0 }} />;
}
