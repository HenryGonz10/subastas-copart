import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { API_URL } from '../lib/api';
import { syncServerTime } from '../lib/time';
import { useAuth } from './AuthContext';

const SocketContext = createContext({ socket: null, connected: false });

/** Una conexión Socket.IO por sesión; se recrea al iniciar/cerrar sesión. */
export function SocketProvider({ children }) {
  const { token } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const s = io(API_URL, { auth: token ? { token } : {}, transports: ['websocket', 'polling'] });
    const onConnect = () => {
      setConnected(true);
      s.emit('time:sync', ({ serverTime }) => syncServerTime(serverTime));
    };
    const onDisconnect = () => setConnected(false);
    s.on('connect', onConnect);
    s.on('disconnect', onDisconnect);
    setSocket(s);
    return () => {
      s.off('connect', onConnect);
      s.off('disconnect', onDisconnect);
      s.close();
    };
  }, [token]);

  return <SocketContext.Provider value={{ socket, connected }}>{children}</SocketContext.Provider>;
}

export const useSocket = () => useContext(SocketContext);
