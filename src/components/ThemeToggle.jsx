import React,{useState} from 'react';
export default function ThemeToggle(){
    const [theme,setTheme]=useState(document.documentElement.dataset.theme||'dark');
    function toggle(){const next=theme==='dark'?'light':'dark';document.documentElement.dataset.theme=next;document.documentElement.style.colorScheme=next;try{localStorage.setItem('skillnest-theme',next);}catch{}setTheme(next);}
    return <button className="sn-theme-toggle" onClick={toggle} aria-label={`Switch to ${theme==='dark'?'light':'dark'} mode`} title={`Switch to ${theme==='dark'?'light':'dark'} mode`}><span aria-hidden="true">{theme==='dark'?'☀':'☾'}</span><span>{theme==='dark'?'Light mode':'Dark mode'}</span></button>;
}
