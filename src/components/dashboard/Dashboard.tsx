import { useEffect, useMemo, useState } from 'react';
import { NavigationRail } from './NavigationRail';
import { ConsolePanel } from './ConsolePanel';
import { FieldNotesPanel } from './FieldNotesPanel';
import { useUserStore } from '../../store/userStore';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';

export function Dashboard() {
  const contacts = useUserStore((state) => state.users);
  const user = useAuthStore((state) => state.user);
  const activeChat = useChatStore((state) => state.activeChat);
  const setActiveChat = useChatStore((state) => state.setActiveChat);
  const [activeSection, setActiveSection] = useState('sphere');

  const orderedContacts = useMemo(
    () => contacts.filter((contact) => contact.id !== user?.id),
    [contacts, user?.id]
  );

  useEffect(() => {
    if (!activeChat && orderedContacts.length > 0) {
      setActiveChat(orderedContacts[0].id);
    }
  }, [activeChat, orderedContacts, setActiveChat]);

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-[1600px] gap-8 px-6 py-8 lg:px-12">
        <NavigationRail
          activeSection={activeSection}
          onSectionChange={(section) => setActiveSection(section)}
          onSelectContact={(contactId) => setActiveChat(contactId)}
          selectedContactId={activeChat}
        />
        <div className="flex flex-1 flex-col gap-8 lg:flex-row">
          <ConsolePanel activeSection={activeSection} />
          <FieldNotesPanel />
        </div>
      </div>
    </div>
  );
}
