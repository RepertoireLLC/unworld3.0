import { useNavigationStore } from '../../store/navigationStore';
import { DashboardWorkspace } from '../workspaces/DashboardWorkspace';
import { CommerceWorkspace } from '../workspaces/CommerceWorkspace';
import { PublicRegistryWorkspace } from '../workspaces/PublicRegistryWorkspace';

export function BroadcastPanel() {
  const activeView = useNavigationStore((state) => state.activeView);

  switch (activeView) {
    case 'commerce':
      return <CommerceWorkspace />;
    case 'registry':
      return <PublicRegistryWorkspace />;
    default:
      return <DashboardWorkspace />;
  }
}
