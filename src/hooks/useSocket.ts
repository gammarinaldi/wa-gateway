import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export const useSocket = (sessionId: string) => {
  const socketRef = useRef<Socket | null>(null);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'open' | 'close'>('idle');
  const [qr, setQr] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);

  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
    const socket = io(socketUrl);
    socketRef.current = socket;

    socket.emit('join', sessionId);

    socket.on('initial_data', (data: { messages: any[], status: string }) => {
      setMessages(data.messages);
      if (data.status !== 'idle') setStatus(data.status as any);
    });

    socket.on('status', (newStatus) => {
      setStatus(newStatus);
      if (newStatus === 'open') setQr(null);
    });

    socket.on('qr', (newQr) => {
      setQr(newQr);
      // Don't set status to idle if we are getting a QR, 
      // stay in 'connecting' but show QR
    });

    socket.on('message', (msg) => {
      setMessages((prev) => [msg, ...prev].slice(0, 50));
    });

    return () => {
      socket.disconnect();
    };
  }, [sessionId]);

  const connect = () => {
    socketRef.current?.emit('connect_wa', sessionId);
  };

  const disconnect = () => {
    socketRef.current?.emit('disconnect_wa', sessionId);
  };

  return { status, qr, messages, connect, disconnect };
};
