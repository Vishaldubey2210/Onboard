'use client';

import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { ToastContainer, showToast } from './ui';

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const socketUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const socket = io(socketUrl);

    socket.on('connect', () => {
      console.log('Connected to real-time updates');
    });

    socket.on('dashboard_update', (data) => {
      if (data.eventName === 'timeline_update') {
        const msg = data.data?.message || 'Activity occurred';
        showToast(msg, 'info');
      }
    });

    return () => { socket.disconnect(); };
  }, []);

  return (
    <>
      <Toaster />
      <ToastContainer />
      {children}
    </>
  );
}
