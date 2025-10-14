import { SearchBar } from '../SearchBar';
import { FriendRequests } from '../FriendRequests';
import { ThemeSelector } from '../ThemeSelector';
import { ProfileIcon } from '../ProfileIcon';
import { AIIntegrationButton } from '../ai/AIIntegrationButton';
export function HeaderBar() {
  return (
    <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="space-y-1">
        <h1 className="text-3xl font-semibold text-white">Harmonia</h1>
      </div>

      <div className="flex w-full flex-col gap-3 lg:w-auto lg:flex-row lg:items-center lg:justify-end">
        <SearchBar className="w-full lg:w-80" />
        <div className="flex items-center justify-end gap-3">
          <AIIntegrationButton />
          <FriendRequests />
          <ThemeSelector />
          <ProfileIcon />
        </div>
      </div>
    </header>
  );
}
