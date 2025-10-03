import { useState, useEffect, useRef } from 'react';
import { X, Send, Bluetooth, Wifi, RefreshCw } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';
import { useUserStore } from '../../store/userStore';
import { useAuthStore } from '../../store/authStore';
import { useConnectivityStore } from '../../store/connectivityStore';
import { encryptWithKey, decryptWithKey } from '../../utils/encryption';

interface ChatWindowProps {
  userId: string;
  onClose: () => void;
}

export function ChatWindow({ userId, onClose }: ChatWindowProps) {
  const [message, setMessage] = useState('');
  const [showConnectionPanel, setShowConnectionPanel] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentUser = useAuthStore((state) => state.user);
  const otherUser = useUserStore((state) => state.users.find((u) => u.id === userId));
  const { sendMessage, getMessagesForChat, updateTransportForChat } = useChatStore();
  const {
    scanning,
    availableDevices,
    connectedDevice,
    connectionMedium,
    encryptionKey,
    lastSyncedAt,
    error,
    scanForDevices,
    connectToDevice,
    switchToWifi,
    disconnect,
    clearError,
  } = useConnectivityStore();

  const messages = currentUser ? getMessagesForChat(currentUser.id, userId) : [];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (
      showConnectionPanel &&
      !connectedDevice &&
      availableDevices.length === 0 &&
      !scanning
    ) {
      scanForDevices();
    }
  }, [
    showConnectionPanel,
    connectedDevice,
    availableDevices.length,
    scanning,
    scanForDevices,
  ]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !currentUser) return;

    const trimmed = message.trim();
    const usingBluetooth = connectionMedium === 'bluetooth' && Boolean(encryptionKey);
    const encryptedPayload = usingBluetooth && encryptionKey ? encryptWithKey(trimmed, encryptionKey) : null;
    const displayContent = usingBluetooth ? 'Encrypted message' : trimmed;

    sendMessage(currentUser.id, userId, displayContent, {
      transport: connectionMedium,
      encrypted: usingBluetooth,
      encryptedPayload,
    });
    setMessage('');
  };

  const handleConnect = async (deviceId: string) => {
    await connectToDevice(deviceId);
  };

  const handleSwitchToWifi = () => {
    if (!currentUser) return;
    switchToWifi();
    updateTransportForChat(currentUser.id, userId, 'wifi');
  };

  if (!currentUser || !otherUser) return null;

  return (
    <div className="fixed bottom-4 right-4 w-96 max-w-[95vw] bg-white/10 backdrop-blur-md rounded-xl shadow-xl flex flex-col overflow-hidden">
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full" style={{ backgroundColor: otherUser.color }} />
          <div className="flex flex-col">
            <span className="text-white font-medium">{otherUser.name}</span>
            <button
              onClick={() => setShowConnectionPanel((prev) => !prev)}
              className="flex items-center gap-2 text-xs text-white/60 hover:text-white transition"
            >
              {connectionMedium === 'bluetooth' ? <Bluetooth className="w-3 h-3" /> : <Wifi className="w-3 h-3" />}
              {connectionMedium === 'bluetooth'
                ? connectedDevice
                  ? `Connected to ${connectedDevice.name}`
                  : 'Bluetooth ready'
                : 'Synced over Wi-Fi'}
            </button>
          </div>
        </div>
        <button onClick={onClose} className="text-white/60 hover:text-white">
          <X className="w-5 h-5" />
        </button>
      </div>

      {showConnectionPanel && (
        <div className="border-b border-white/10 bg-slate-900/60">
          <div className="px-4 py-3 flex items-center justify-between text-white/80 text-sm">
            <span>
              {connectedDevice
                ? `Secure key: ${encryptionKey?.slice(0, 6)}•••`
                : 'Scan for nearby Bluetooth devices'}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => scanForDevices()}
                className="flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 transition"
              >
                <RefreshCw className={`w-3 h-3 ${scanning ? 'animate-spin' : ''}`} />
                Scan
              </button>
              {connectedDevice && (
                <button
                  onClick={disconnect}
                  className="text-xs px-2 py-1 rounded-md bg-red-500/20 hover:bg-red-500/30 text-red-200 transition"
                >
                  Disconnect
                </button>
              )}
            </div>
          </div>

          <div className="px-4 pb-3 space-y-2 text-white/70 text-sm">
            {error && (
              <div className="bg-red-500/20 text-red-200 px-3 py-2 rounded-md flex justify-between items-center">
                <span>{error}</span>
                <button onClick={clearError} className="text-xs uppercase tracking-wide">Dismiss</button>
              </div>
            )}

            {connectedDevice ? (
              <div className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                <div className="flex flex-col">
                  <span className="font-medium text-white">{connectedDevice.name}</span>
                  <span className="text-xs text-white/60">
                    Encrypted over Bluetooth · Signal {connectedDevice.signal}%
                  </span>
                  {lastSyncedAt && (
                    <span className="text-xs text-white/40">
                      Last Wi-Fi sync {new Date(lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
                <button
                  onClick={handleSwitchToWifi}
                  className="text-xs px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 transition"
                >
                  Switch to Wi-Fi
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {scanning && <p className="text-xs text-white/40">Scanning for devices...</p>}
                {!scanning && availableDevices.length === 0 && (
                  <p className="text-xs text-white/40">No devices nearby yet.</p>
                )}
                {availableDevices.map((device) => (
                  <button
                    key={device.id}
                    onClick={() => handleConnect(device.id)}
                    className="w-full flex items-center justify-between px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition"
                  >
                    <div className="flex flex-col items-start">
                      <span className="text-white font-medium">{device.name}</span>
                      <span className="text-xs text-white/50">Signal {device.signal}%</span>
                    </div>
                    <span className="text-xs uppercase tracking-wide text-white/60">Connect</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 p-4 space-y-4 overflow-y-auto max-h-96">
        {messages.map((msg) => {
          const isOwn = msg.fromUserId === currentUser.id;
          const displayContent =
            msg.encrypted && msg.encryptedPayload
              ? encryptionKey
                ? decryptWithKey(msg.encryptedPayload, encryptionKey)
                : 'Encrypted message · reconnect with Bluetooth to view'
              : msg.content;
          return (
            <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] p-3 rounded-lg border border-white/10 ${
                  isOwn ? 'bg-white/20 text-white' : 'bg-white/10 text-white'
                }`}
              >
                <div className="text-sm whitespace-pre-wrap break-words">{displayContent}</div>
                <div className="mt-1 text-[0.65rem] uppercase tracking-wide text-white/60 flex items-center gap-1">
                  {msg.transport === 'bluetooth' ? <Bluetooth className="w-3 h-3" /> : <Wifi className="w-3 h-3" />}
                  <span>{msg.transport === 'bluetooth' ? 'Bluetooth · Encrypted' : 'Wi-Fi'}</span>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t border-white/10">
        <div className="flex space-x-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-white/30"
          />
          <button
            type="submit"
            className="p-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
}
