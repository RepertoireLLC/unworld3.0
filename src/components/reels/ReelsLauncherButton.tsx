import { Film } from 'lucide-react';
import { useModalStore } from '../../store/modalStore';

export function ReelsLauncherButton() {
  const setReelsOpen = useModalStore((state) => state.setReelsOverlayOpen);

  return (
    <button
      type="button"
      onClick={() => setReelsOpen(true)}
      className="ui-button ui-button--ghost flex items-center gap-2 text-xs uppercase tracking-[0.3em]"
      aria-label="Open Harmonia Reels"
    >
      <Film className="h-4 w-4" />
      Reels
    </button>
  );
}
