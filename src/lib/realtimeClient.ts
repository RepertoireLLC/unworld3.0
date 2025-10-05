import { resolveWebSocketUrl } from './api';

type RealtimeEvent = { type: string; payload?: any };
type Listener = (event: RealtimeEvent) => void;
type Status = 'disconnected' | 'connecting' | 'connected';
type StatusListener = (status: Status) => void;

interface IdentifyMetadata {
  name?: string;
  color?: string;
}

const MAX_QUEUE_LENGTH = 100;
const BASE_DELAY = 500;
const MAX_DELAY = 8000;

class RealtimeClient {
  private socket: WebSocket | null = null;
  private listeners: Set<Listener> = new Set();
  private statusListeners: Set<StatusListener> = new Set();
  private queue: RealtimeEvent[] = [];
  private status: Status = 'disconnected';
  private reconnectAttempts = 0;
  private userId: string | null = null;
  private metadata: IdentifyMetadata = {};
  private reconnectTimer: number | null = null;
  private ready = false;
  private manualClose = false;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        if (this.status !== 'connected' && this.userId) {
          this.connect(this.userId, this.metadata);
        }
      });
      window.addEventListener('offline', () => {
        this.updateStatus('disconnected');
      });
    }
  }

  connect(userId: string, metadata: IdentifyMetadata = {}) {
    this.userId = userId;
    this.metadata = metadata;
    this.manualClose = false;
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }
    this.openSocket();
  }

  disconnect() {
    this.manualClose = true;
    this.reconnectAttempts = 0;
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.updateStatus('disconnected');
  }

  send(event: RealtimeEvent) {
    if (!event || typeof event.type !== 'string') return;
    if (this.ready && this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(event));
      return;
    }
    if (this.queue.length >= MAX_QUEUE_LENGTH) {
      this.queue.shift();
    }
    this.queue.push(event);
  }

  onEvent(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  onStatusChange(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    listener(this.status);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  getStatus(): Status {
    return this.status;
  }

  private openSocket() {
    const url = resolveWebSocketUrl();
    try {
      this.updateStatus('connecting');
      this.ready = false;
      const socket = new WebSocket(url);
      this.socket = socket;

      socket.addEventListener('open', () => {
        this.reconnectAttempts = 0;
        this.updateStatus('connected');
        this.send({
          type: 'identify',
          payload: {
            userId: this.userId,
            ...this.metadata,
          },
        });
      });

      socket.addEventListener('message', (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data?.type === 'session:ready') {
            this.ready = true;
            this.flushQueue();
          }
          this.listeners.forEach((listener) => listener(data));
        } catch (error) {
          console.error('Failed to parse realtime payload', error);
        }
      });

      socket.addEventListener('close', () => {
        this.updateStatus('disconnected');
        this.ready = false;
        if (!this.manualClose) {
          this.scheduleReconnect();
        }
      });

      socket.addEventListener('error', () => {
        socket.close();
      });
    } catch (error) {
      console.error('Failed to open websocket', error);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (!this.userId || this.manualClose) return;
    if (typeof navigator !== 'undefined' && 'onLine' in navigator && !navigator.onLine) {
      return;
    }
    this.reconnectAttempts += 1;
    const delay = Math.min(BASE_DELAY * 2 ** (this.reconnectAttempts - 1), MAX_DELAY);
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    this.reconnectTimer = window.setTimeout(() => {
      this.openSocket();
    }, delay);
  }

  private flushQueue() {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN || !this.ready) {
      return;
    }
    const pending = [...this.queue];
    this.queue = [];
    pending.forEach((event) => {
      this.socket?.send(JSON.stringify(event));
    });
  }

  private updateStatus(status: Status) {
    this.status = status;
    this.statusListeners.forEach((listener) => listener(status));
  }
}

export const realtimeClient = new RealtimeClient();
export type { RealtimeEvent, Status as RealtimeStatus };
