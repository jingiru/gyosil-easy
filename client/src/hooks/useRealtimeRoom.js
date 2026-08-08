import { useCallback, useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import { apiRequest, serverUrl } from '../lib/api.js';

function upsert(items, message) {
  return [message, ...items.filter((item) => item.id !== message.id)].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}

export function useRealtimeRoom(room) {
  const [state, setState] = useState({ active: [], history: [] });
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      const nextState = await apiRequest(`/api/state?room=${encodeURIComponent(room)}`);
      setState({ active: nextState.active, history: nextState.history });
      setError('');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [room]);

  useEffect(() => {
    setLoading(true);
    refresh();

    const socket = io(serverUrl || undefined, {
      auth: { room },
      reconnection: true,
      reconnectionDelayMax: 5000,
    });

    socket.on('connect', () => {
      setConnected(true);
      refresh();
    });
    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', () => setConnected(false));
    socket.on('server:error', ({ message }) => setError(message));

    socket.on('message:new', (message) => {
      setState((current) => ({
        active: upsert(current.active, message),
        history: upsert(current.history, message),
      }));
    });

    socket.on('response:new', ({ message }) => {
      setState((current) => ({
        active: upsert(current.active, message),
        history: upsert(current.history, message),
      }));
    });

    socket.on('message:closed', (message) => {
      setState((current) => ({
        active: current.active.filter((item) => item.id !== message.id),
        history: upsert(current.history, message),
      }));
    });

    return () => socket.disconnect();
  }, [refresh, room]);

  return useMemo(
    () => ({ ...state, loading, connected, error, refresh }),
    [state, loading, connected, error, refresh],
  );
}
