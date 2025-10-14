/*
 * Harmonia Peer Mesh
 * -------------------
 * A lightweight WebRTC manager that coordinates encrypted peer-to-peer data channels.
 * The module is browser-safe and exposes helper utilities used by meshStore.
 */

export type PeerSignalType = 'offer' | 'answer' | 'candidate';

export interface PeerSignal {
  type: PeerSignalType;
  sdp?: string;
  candidate?: RTCIceCandidateInit;
}

export interface MeshCallbacks {
  onStatusChange: (peerId: string, status: RTCPeerConnectionState | 'connecting') => void;
  onMessage: (peerId: string, channel: string, payload: unknown) => void;
  onError: (peerId: string, error: Error) => void;
}

interface ConnectionEntry {
  peerId: string;
  connection: RTCPeerConnection;
  dataChannel?: RTCDataChannel;
  pendingCandidates: RTCIceCandidateInit[];
  callbacks: MeshCallbacks;
}

const connections = new Map<string, ConnectionEntry>();
let meshCallbacks: MeshCallbacks | null = null;

function createConnection(peerId: string): ConnectionEntry {
  if (typeof window === 'undefined') {
    throw new Error('Peer mesh is only available in browser environments.');
  }

  const configuration: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:global.stun.twilio.com:3478?transport=udp' },
    ],
  };

  const connection = new RTCPeerConnection(configuration);
  const entry: ConnectionEntry = {
    peerId,
    connection,
    dataChannel: undefined,
    pendingCandidates: [],
    callbacks: meshCallbacks ?? {
      onStatusChange: () => undefined,
      onMessage: () => undefined,
      onError: () => undefined,
    },
  };

  connection.onicecandidate = (event) => {
    if (event.candidate) {
      entry.pendingCandidates.push(event.candidate.toJSON());
    }
  };

  connection.onconnectionstatechange = () => {
    entry.callbacks.onStatusChange(peerId, connection.connectionState);
  };

  connection.ondatachannel = (event) => {
    const channel = event.channel;
    bindDataChannel(entry, channel);
  };

  connections.set(peerId, entry);
  return entry;
}

function bindDataChannel(entry: ConnectionEntry, channel: RTCDataChannel) {
  channel.binaryType = 'arraybuffer';
  entry.dataChannel = channel;
  channel.onopen = () => {
    entry.callbacks.onStatusChange(entry.peerId, 'connected');
  };
  channel.onclose = () => {
    entry.callbacks.onStatusChange(entry.peerId, 'disconnected');
  };
  channel.onerror = (event) => {
    const error = event instanceof ErrorEvent ? new Error(event.message) : new Error('Unknown channel error');
    entry.callbacks.onError(entry.peerId, error);
  };
  channel.onmessage = (event) => {
    try {
      const { channel: channelName, payload } = JSON.parse(event.data as string) as {
        channel: string;
        payload: unknown;
      };
      entry.callbacks.onMessage(entry.peerId, channelName, payload);
    } catch (error) {
      entry.callbacks.onError(entry.peerId, error as Error);
    }
  };
}

function getEntry(peerId: string) {
  const entry = connections.get(peerId);
  if (!entry) {
    throw new Error(`Peer connection for ${peerId} not found.`);
  }
  return entry;
}

async function waitForIceGathering(connection: RTCPeerConnection, entry: ConnectionEntry) {
  if (connection.iceGatheringState === 'complete') {
    return entry.pendingCandidates.splice(0);
  }

  return new Promise<RTCIceCandidateInit[]>((resolve) => {
    const checkState = () => {
      if (connection.iceGatheringState === 'complete') {
        connection.removeEventListener('icegatheringstatechange', checkState);
        resolve(entry.pendingCandidates.splice(0));
      }
    };
    connection.addEventListener('icegatheringstatechange', checkState);
  });
}

export function configurePeerMesh(callbacks: MeshCallbacks) {
  meshCallbacks = callbacks;
  connections.forEach((entry) => {
    entry.callbacks = callbacks;
  });
}

export async function createOffer(peerId: string): Promise<PeerSignal[]> {
  const entry = connections.get(peerId) ?? createConnection(peerId);
  entry.callbacks.onStatusChange(peerId, 'connecting');
  const channel = entry.connection.createDataChannel('harmonia.mesh', { ordered: true });
  bindDataChannel(entry, channel);

  const offer = await entry.connection.createOffer();
  await entry.connection.setLocalDescription(offer);
  const candidates = await waitForIceGathering(entry.connection, entry);
  const signals: PeerSignal[] = [{ type: 'offer', sdp: offer.sdp }];
  candidates.forEach((candidate) => signals.push({ type: 'candidate', candidate }));
  return signals;
}

export async function acceptOffer(peerId: string, sdp: string): Promise<PeerSignal[]> {
  const entry = connections.get(peerId) ?? createConnection(peerId);
  entry.callbacks.onStatusChange(peerId, 'connecting');
  await entry.connection.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp }));
  const answer = await entry.connection.createAnswer();
  await entry.connection.setLocalDescription(answer);
  const candidates = await waitForIceGathering(entry.connection, entry);
  const signals: PeerSignal[] = [{ type: 'answer', sdp: answer.sdp }];
  candidates.forEach((candidate) => signals.push({ type: 'candidate', candidate }));
  return signals;
}

export async function acceptAnswer(peerId: string, sdp: string) {
  const entry = getEntry(peerId);
  await entry.connection.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp }));
}

export async function addRemoteCandidate(peerId: string, candidate: RTCIceCandidateInit) {
  const entry = getEntry(peerId);
  await entry.connection.addIceCandidate(new RTCIceCandidate(candidate));
}

export function sendToPeer(peerId: string, channel: string, payload: unknown) {
  const entry = getEntry(peerId);
  if (!entry.dataChannel || entry.dataChannel.readyState !== 'open') {
    throw new Error('Peer channel is not ready.');
  }
  entry.dataChannel.send(JSON.stringify({ channel, payload }));
}

export function closePeer(peerId: string) {
  const entry = connections.get(peerId);
  if (!entry) {
    return;
  }
  if (entry.dataChannel && entry.dataChannel.readyState !== 'closed') {
    entry.dataChannel.close();
  }
  entry.connection.close();
  connections.delete(peerId);
}

export function getPeerStatus(peerId: string): RTCPeerConnectionState | 'idle' {
  const entry = connections.get(peerId);
  if (!entry) {
    return 'idle';
  }
  return entry.connection.connectionState;
}
