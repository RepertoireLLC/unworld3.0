import type { Libp2p, ServiceMap } from 'libp2p';
import { loadOrCreateIdentity, signPayload } from '../security/identity';
import { persistGossip } from '../storage/localDatabase';
import type { GossipMessage, NodeRole, P2PNodeContext, SynchronizerOptions } from './types';

interface P2PNodeDependencies {
  createLibp2p: typeof import('libp2p').createLibp2p;
  webRTC: typeof import('@libp2p/webrtc').webRTC;
  webSockets: typeof import('@libp2p/websockets').webSockets;
  mplex: typeof import('@chainsafe/libp2p-mplex').mplex;
  noise: typeof import('@chainsafe/libp2p-noise').noise;
  gossipsub: typeof import('@libp2p/gossipsub').gossipsub;
  kadDHT: typeof import('@libp2p/kad-dht').kadDHT;
  bootstrap: typeof import('@libp2p/bootstrap').bootstrap;
}

async function loadDependencies(): Promise<P2PNodeDependencies> {
  const [libp2pCore, rtc, websockets, mplexModule, noiseModule, gossipModule, dhtModule, bootstrapModule] =
    await Promise.all([
      import('libp2p'),
      import('@libp2p/webrtc'),
      import('@libp2p/websockets'),
      import('@chainsafe/libp2p-mplex'),
      import('@chainsafe/libp2p-noise'),
      import('@libp2p/gossipsub'),
      import('@libp2p/kad-dht'),
      import('@libp2p/bootstrap'),
    ]);

  return {
    createLibp2p: libp2pCore.createLibp2p,
    webRTC: rtc.webRTC,
    webSockets: websockets.webSockets,
    mplex: mplexModule.mplex,
    noise: noiseModule.noise,
    gossipsub: gossipModule.gossipsub,
    kadDHT: dhtModule.kadDHT,
    bootstrap: bootstrapModule.bootstrap,
  };
}

async function createNode(options: SynchronizerOptions, role: NodeRole): Promise<Libp2p<ServiceMap>> {
  const deps = await loadDependencies();
  const identity = await loadOrCreateIdentity();

  const node = await deps.createLibp2p({
    transports: [deps.webRTC(), deps.webSockets()],
    connectionEncryption: [deps.noise()],
    streamMuxers: [deps.mplex()],
    peerDiscovery: options.bootstrapOnions?.length
      ? [
          deps.bootstrap({
            list: options.bootstrapOnions.map((address) => `/dns4/${address}/tcp/443/wss/p2p-webrtc-star`),
          }),
        ]
      : [],
    services: {
      pubsub: deps.gossipsub(),
      dht: deps.kadDHT({ clientMode: role !== 'relay' }),
    },
  });

  await node.start();
  return node;
}

export async function initializeP2PNode(
  options: SynchronizerOptions = {},
  role: NodeRole = 'standard',
): Promise<P2PNodeContext> {
  const identity = await loadOrCreateIdentity();
  let node: Libp2p<ServiceMap> | undefined;
  try {
    node = await createNode(options, role);
  } catch (error) {
    console.error('Failed to start libp2p node', error);
  }

  return {
    node,
    identity,
    peers: [],
    role,
    tor: {
      status: 'offline',
    },
    stop: async () => {
      if (node) {
        await node.stop();
      }
    },
  };
}

export async function broadcastMessage<TPayload>(
  context: P2PNodeContext,
  topic: string,
  payload: TPayload,
): Promise<GossipMessage<TPayload> | undefined> {
  if (!context.node) {
    console.warn('Attempted to broadcast without an active node');
    return undefined;
  }

  const message: GossipMessage<TPayload> = {
    id: crypto.randomUUID(),
    topic,
    createdAt: Date.now(),
    author: context.identity.peerId,
    signature: signPayload(payload, context.identity.secretKey),
    payload,
  };

  const pubsub = context.node.services.pubsub as { publish: (topic: string, data: Uint8Array) => Promise<void> } | undefined;
  if (!pubsub) {
    throw new Error('PubSub service not available on this node');
  }

  await pubsub.publish(topic, new TextEncoder().encode(JSON.stringify(message)));
  await persistGossip({ messageId: message.id, topic, payload, receivedAt: Date.now() });
  return message;
}

