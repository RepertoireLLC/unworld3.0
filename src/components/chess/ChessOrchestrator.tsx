import { useEffect } from 'react';
import { useMeshStore } from '../../store/meshStore';
import { useChessStore, type ChessNetworkEvent } from '../../store/chessStore';

export function ChessOrchestrator() {
  const registerChannelListener = useMeshStore((state) => state.registerChannelListener);

  useEffect(() => {
    const unregister = registerChannelListener('harmonia.chess', (_peerId, payload) => {
      if (!payload || typeof payload !== 'object') {
        return;
      }
      try {
        useChessStore.getState().handleNetworkEvent(payload as ChessNetworkEvent);
      } catch (error) {
        console.warn('Failed to process chess network event', error);
      }
    });
    return unregister;
  }, [registerChannelListener]);

  return null;
}
