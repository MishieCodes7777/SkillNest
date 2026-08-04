import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { isLoggedIn } from '../utils/auth';

export default function AppLayout({ children }) {
    const navigate = useNavigate();

    useEffect(() => {
        if (!isLoggedIn()) {
            navigate('/login');
        }
    }, []);

    if (!isLoggedIn()) return null;

    return (
        <>
            <Sidebar />
            <TopBar />
            <div style={{ paddingTop: '20px' }}>
                {children}
            </div>
        </>
    );
}
