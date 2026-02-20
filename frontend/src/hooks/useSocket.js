import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { SOCKET_URL } from '@utils/constants';

// ─── Module-level singleton ────────────────────────────────────────────────────
// One Socket.io connection for the whole app lifetime.  Multiple useSocket()
// callers share this single instance; the socket only disconnects when the
// last consumer unmounts.

/** @type {import('socket.io-client').Socket | null} */
let _socket     = null;
let _refCount   = 0;

function acquireSocket() {
  if (!_socket || _socket.disconnected) {
    _socket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      autoConnect: true,
    });

    _socket.on('connect',         () => console.debug('[Socket] connected',    _socket.id));
    _socket.on('disconnect',      (r) => console.debug('[Socket] disconnected', r));
    _socket.on('connect_error',   (e) => console.warn('[Socket] connect error', e.message));
    _socket.on('reconnect',       (n) => console.debug('[Socket] reconnected after', n, 'attempts'));
  }
  return _socket;
}

function releaseSocket() {
  _refCount -= 1;
  if (_refCount <= 0 && _socket) {
    _socket.disconnect();
    _socket    = null;
    _refCount  = 0;
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
/**
 * Returns the shared Socket.io client instance and room-join helpers.
 *
 * Usage:
 *   const { socket, joinIssueRoom, leaveIssueRoom } = useSocket();
 *   useEffect(() => {
 *     socket?.on('issueCreated', handler);
 *     return () => socket?.off('issueCreated', handler);
 *   }, [socket]);
 */
export function useSocket() {
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = acquireSocket();
    socketRef.current = socket;
    _refCount += 1;

    return () => {
      releaseSocket();
    };
  }, []);

  // ─── Room helpers (emit wrappers) ──────────────────────────────────────────
  const joinIssueRoom  = (id)   => socketRef.current?.emit('join_issue',  id);
  const leaveIssueRoom = (id)   => socketRef.current?.emit('leave_issue', id);
  const joinAreaRoom   = (city) => socketRef.current?.emit('join_area',   city);
  const leaveAreaRoom  = (city) => socketRef.current?.emit('leave_area',  city);

  return {
    socket:        socketRef.current,
    joinIssueRoom,
    leaveIssueRoom,
    joinAreaRoom,
    leaveAreaRoom,
  };
}
