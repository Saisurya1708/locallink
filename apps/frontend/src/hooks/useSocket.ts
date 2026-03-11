import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useStore } from '../store/useStore';

let socketInstance: Socket | null = null;

export function useSocket(): Socket | null {
  const token = useStore((s) => s.accessToken);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!token) return;

    if (!socketInstance || !socketInstance.connected) {
      socketInstance = io(import.meta.env.VITE_SOCKET_URL || '', {
        auth: { token },
        transports: ['websocket'],
      });
    }

    socketRef.current = socketInstance;

    return () => {
      // Don't disconnect on component unmount — keep alive for notifications
    };
  }, [token]);

  return socketRef.current;
}

export function getSocket(): Socket | null {
  return socketInstance;
}
