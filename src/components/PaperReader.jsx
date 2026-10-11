import React, { useEffect, useRef, useState } from 'react';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
GlobalWorkerOptions.workerSrc = workerUrl;

export default function PaperReader({ url, title }) {
    const canvas = useRef(null);
    const [pdf, setPdf] = useState(null);
    const [page, setPage] = useState(1);
    const [zoom, setZoom] = useState(1);
    const [busy, setBusy] = useState(true);
    const [error, setError] = useState('');
    const [text, setText] = useState('');
    useEffect(() => {
        let alive = true;
        setPdf(null); setPage(1); setBusy(true); setError('');
        const task = getDocument({ url, isEvalSupported: false, disableRange: true, disableStream: true });
        task.promise.then(doc => { if (alive) setPdf(doc); }).catch(() => { if (alive) { setError('The PDF could not be loaded. Open the original paper link below.'); setBusy(false); } });
        return () => { alive = false; task.destroy(); };
    }, [url]);
    useEffect(() => {
        if (!pdf) return;
        let alive = true, rendering;
        setBusy(true); setError(''); setText('');
        (async () => {
            const documentPage = await pdf.getPage(page);
            if (!alive) return;
            const viewport = documentPage.getViewport({ scale: 1.3 * zoom });
            const target = canvas.current;
            const ratio = Math.min(window.devicePixelRatio || 1, 2);
            target.width = Math.floor(viewport.width * ratio); target.height = Math.floor(viewport.height * ratio);
            target.style.width = `${viewport.width}px`;
            rendering = documentPage.render({ canvasContext: target.getContext('2d'), viewport, transform: [ratio, 0, 0, ratio, 0, 0] });
            await rendering.promise;
            const content = await documentPage.getTextContent();
            if (alive) setText(content.items.map(item => item.str || '').join(' '));
        })().catch(e => { if (alive && e.name !== 'RenderingCancelledException') setError('This page could not be displayed. Try opening the original paper.'); }).finally(() => { if (alive) setBusy(false); });
        return () => { alive = false; rendering?.cancel(); };
    }, [pdf, page, zoom]);
    return <div className="paper-reader">
        <div className="research-form"><button className="learn-secondary" disabled={busy || page === 1} onClick={() => setPage(p => p - 1)}>Previous page</button><span aria-live="polite">Page {page} of {pdf?.numPages || '…'}</span><button className="learn-primary" disabled={busy || !pdf || page === pdf.numPages} onClick={() => setPage(p => p + 1)}>Next page</button><label>Zoom <select aria-label="Paper zoom" value={zoom} disabled={busy} onChange={e => setZoom(Number(e.target.value))}>{[.75, 1, 1.25, 1.5].map(value => <option value={value} key={value}>{value * 100}%</option>)}</select></label></div>
        {busy && <p role="status">Loading paper page…</p>}{error && <p role="alert" className="learn-alert">{error}</p>}
        <div className="paper-canvas-wrap"><canvas ref={canvas} aria-label={`${title}, page ${page}`} /></div>
        {text && <details className="learn-model"><summary>Read this page as text</summary><p className="paper-text">{text}</p></details>}
    </div>;
}
