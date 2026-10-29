import { Buffer } from 'buffer';
window.Buffer = Buffer;

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/global.css';
import './styles/theme.css';
let savedTheme='dark';try{const value=localStorage.getItem('skillnest-theme');if(value==='light'||value==='dark')savedTheme=value;}catch{}
document.documentElement.dataset.theme=savedTheme;
document.documentElement.style.colorScheme=savedTheme;

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
