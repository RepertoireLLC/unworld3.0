import {
  useEffect,
  useMemo,
  useCallback,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react';
import {
  X,
  Globe2,
  RefreshCcw,
  Shield,
  ShieldOff,
  Power,
  Bell,
  Trash2,
  AlertTriangle,
  HelpCircle,
  Search,
  Mail,
  MessageCircle,
  Sparkles,
} from 'lucide-react';
import { useModalStore } from '../../store/modalStore';
import { useTimeStore, getEffectiveTimezone, getSystemTimezone } from '../../store/timeStore';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { useToastStore } from '../../store/toastStore';
import { ThemeCustomizationPanel } from './ThemeCustomizationPanel';
import { useMeshStore } from '../../store/meshStore';
import { useStorageStore } from '../../store/storageStore';
import { useAuthStore } from '../../store/authStore';

type SettingsCategory = 'account' | 'content' | 'privacy' | 'support';

type FaqEntry = {
  id: string;
  question: string;
  answer: string;
  category: SettingsCategory;
};

const FALLBACK_TIMEZONES = [
  'UTC',
  'Etc/UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Paris',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Asia/Singapore',
  'Australia/Sydney',
];

const SETTINGS_CATEGORIES: Array<{
  id: SettingsCategory;
  label: string;
  description: string;
}> = [
  {
    id: 'account',
    label: 'Account',
    description: 'Identity, localization, and control of your Harmonia profile.',
  },
  {
    id: 'content',
    label: 'Content',
    description: 'Tune what you experience and how Harmonia appears.',
  },
  {
    id: 'privacy',
    label: 'Privacy',
    description: 'Govern data visibility, peer discovery, and stored assets.',
  },
  {
    id: 'support',
    label: 'Support',
    description: 'Search answers or connect with the Harmonia support channel.',
  },
];

const FAQ_ENTRIES: FaqEntry[] = [
  {
    id: 'faq-sync',
    category: 'account',
    question: 'How does timezone auto-detection work?',
    answer:
      'Harmonia checks your device clock every session and aligns the interface scheduler to match. You can override the timezone at any moment from the Account tab.',
  },
  {
    id: 'faq-deactivate',
    category: 'account',
    question: 'What happens when I deactivate my account?',
    answer:
      'Deactivation signs you out, hides your presence from the mesh, and pauses all broadcasts. Your data remains encrypted and can be restored the moment you sign back in.',
  },
  {
    id: 'faq-nsfw',
    category: 'content',
    question: 'Will opting into NSFW content affect recommendations?',
    answer:
      'Yes. Harmonia immediately expands your discovery feed to include signals flagged as mature. Opting out instantly filters those posts from all panels.',
  },
  {
    id: 'faq-mesh',
    category: 'privacy',
    question: 'Who can find my node when public discovery is disabled?',
    answer:
      'Only peers you invite directly can establish a channel. Discovery beacons are silenced and trusted indexers cannot surface your node.',
  },
  {
    id: 'faq-support',
    category: 'support',
    question: 'How fast will support respond to my message?',
    answer:
      'Support triages messages continuously. Expect a reply within 24 hours, often sooner during core mission windows.',
  },
];

const resolveTimezones = () => {
  const intlAny = Intl as unknown as { supportedValuesOf?: (key: string) => string[] };
  if (typeof intlAny.supportedValuesOf === 'function') {
    try {
      const zones = intlAny.supportedValuesOf('timeZone');
      return zones.length > 0 ? zones : FALLBACK_TIMEZONES;
    } catch (error) {
      console.warn('Failed to resolve supported timezones', error);
    }
  }

  return FALLBACK_TIMEZONES;
};

const sendSupportEmail = (payload: { name: string; email: string; topic: string; message: string }) => {
  if (typeof document === 'undefined') {
    return false;
  }

  const bodyLines = [
    `From: ${payload.name || 'Anonymous Operator'} <${payload.email || 'unknown@harmonia'}>`,
    `Topic: ${payload.topic || 'General Inquiry'}`,
    '',
    payload.message,
  ];

  const params = new URLSearchParams({
    subject: `Harmonia Support // ${payload.topic || 'General Inquiry'}`,
    body: bodyLines.join('\n'),
  });

  const link = document.createElement('a');
  link.href = `mailto:matthew.denton222@gmail.com?${params.toString()}`;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  return true;
};

export function SettingsModal() {
  const isOpen = useModalStore((state) => state.isSettingsOpen);
  const setIsOpen = useModalStore((state) => state.setSettingsOpen);
  const settingsSection = useModalStore((state) => state.settingsActiveSection);
  const setSettingsSection = useModalStore((state) => state.setSettingsActiveSection);
  const autoDetect = useTimeStore((state) => state.autoDetect);
  const manualTimezone = useTimeStore((state) => state.manualTimezone);
  const detectedTimezone = useTimeStore((state) => state.detectedTimezone);
  const setAutoDetect = useTimeStore((state) => state.setAutoDetect);
  const setManualTimezone = useTimeStore((state) => state.setManualTimezone);
  const setDetectedTimezone = useTimeStore((state) => state.setDetectedTimezone);
  const addToast = useToastStore((state) => state.addToast);
  const themeSectionRef = useRef<HTMLDivElement | null>(null);
  const contentScrollRef = useRef<HTMLDivElement | null>(null);
  const meshPreferences = useMeshStore((state) => state.preferences);
  const setMeshPreferences = useMeshStore((state) => state.setPreferences);
  const assets = useStorageStore((state) => state.assets);
  const hydrateAssets = useStorageStore((state) => state.hydrate);
  const updateAssetVisibility = useStorageStore((state) => state.updateVisibility);
  const deleteAsset = useStorageStore((state) => state.deleteAsset);
  const currentUser = useAuthStore((state) => state.user);
  const deactivateAccount = useAuthStore((state) => state.deactivateAccount);
  const deleteAccount = useAuthStore((state) => state.deleteAccount);
  const updateContentPreferences = useAuthStore((state) => state.updateContentPreferences);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [faqQuery, setFaqQuery] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
  const [supportForm, setSupportForm] = useState({
    name: currentUser?.name ?? '',
    email: currentUser?.email ?? '',
    topic: 'General Inquiry',
    message: '',
  });
  const [isSendingSupport, setIsSendingSupport] = useState(false);

  const timezoneOptions = useMemo(() => resolveTimezones(), []);

  const activeTimezone = useMemo(
    () => getEffectiveTimezone(autoDetect, detectedTimezone, manualTimezone),
    [autoDetect, detectedTimezone, manualTimezone]
  );

  const resolvedTimezone = useMemo(() => {
    const candidate = activeTimezone;

    if (!candidate) {
      return 'UTC';
    }

    try {
      new Intl.DateTimeFormat(undefined, { timeZone: candidate }).format(new Date());
      return candidate;
    } catch (error) {
      console.warn(
        `Invalid timezone "${candidate}" detected in settings. Falling back to UTC.`,
        error
      );
      return 'UTC';
    }
  }, [activeTimezone]);

  const previewFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        weekday: 'short',
        month: 'short',
        day: '2-digit',
        timeZone: resolvedTimezone,
        hour12: false,
      }),
    [resolvedTimezone]
  );

  const fullNameFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        timeZone: resolvedTimezone,
        timeZoneName: 'longGeneric',
      }),
    [resolvedTimezone]
  );

  const preview = previewFormatter.format(new Date());
  const timezoneLabel =
    fullNameFormatter
      .formatToParts(new Date())
      .find((part) => part.type === 'timeZoneName')?.value ?? resolvedTimezone;

  const normalizedCategory: SettingsCategory =
    settingsSection === 'theme' ? 'content' : settingsSection;

  const nsfwOptIn = currentUser?.contentPreferences?.nsfw ?? false;
  const accountStatus = currentUser?.status ?? 'active';

  const filteredFaq = useMemo(() => {
    const query = faqQuery.trim().toLowerCase();
    if (query.length === 0) {
      return FAQ_ENTRIES;
    }
    return FAQ_ENTRIES.filter((entry) =>
      [entry.question, entry.answer, entry.category]
        .join(' ')
        .toLowerCase()
        .includes(query)
    );
  }, [faqQuery]);

  useEffect(() => {
    if (isOpen && autoDetect) {
      setDetectedTimezone(getSystemTimezone());
    }
  }, [autoDetect, isOpen, setDetectedTimezone]);

  useEffect(() => {
    if (isOpen) {
      void hydrateAssets();
    }
  }, [hydrateAssets, isOpen]);

  useEffect(() => {
    if (isOpen && settingsSection === 'theme' && themeSectionRef.current) {
      themeSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (normalizedCategory !== 'content') {
        setSettingsSection('content');
      }
    }
  }, [isOpen, normalizedCategory, settingsSection, setSettingsSection]);

  useEffect(() => {
    if (isOpen) {
      setSupportForm((form) => ({
        ...form,
        name: currentUser?.name ?? form.name,
        email: currentUser?.email ?? form.email,
      }));
    }
  }, [currentUser?.email, currentUser?.name, isOpen]);

  useEscapeKey(
    useCallback(() => {
      if (showDeleteConfirm) {
        setShowDeleteConfirm(false);
        setDeleteConfirmationInput('');
        return;
      }
      setIsOpen(false);
      setSettingsSection('account');
    }, [setIsOpen, setSettingsSection, showDeleteConfirm]),
    isOpen
  );

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setSettingsSection('account');
    setShowDeleteConfirm(false);
    setDeleteConfirmationInput('');
  }, [setIsOpen, setSettingsSection]);

  const handleAutoDetectChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const nextValue = event.target.checked;
      setAutoDetect(nextValue);
      addToast({
        title: nextValue ? 'Auto-detect enabled' : 'Manual mode enabled',
        variant: 'success',
        description: nextValue
          ? 'Harmonia is synchronizing with your system clock.'
          : 'Select a timezone override to customize the interface clock.',
      });
    },
    [addToast, setAutoDetect]
  );

  const handleManualTimezoneChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      const nextZone = event.target.value;
      setManualTimezone(nextZone);
      addToast({
        title: 'Timezone updated',
        variant: 'success',
        description: `Interface clock set to ${nextZone}.`,
      });
    },
    [addToast, setManualTimezone]
  );

  const handleRedetect = useCallback(() => {
    const systemZone = getSystemTimezone();
    setDetectedTimezone(systemZone);
    addToast({
      title: 'System timezone detected',
      variant: 'success',
      description: `Aligned with ${systemZone}.`,
    });
  }, [addToast, setDetectedTimezone]);

  const handleMeshDiscoveryToggle = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const allowPublicDiscovery = event.target.checked;
      setMeshPreferences({ allowPublicDiscovery });
      addToast({
        title: allowPublicDiscovery ? 'Discovery enabled' : 'Discovery disabled',
        variant: 'success',
        description: allowPublicDiscovery
          ? 'Your node will advertise availability to trusted indexers.'
          : 'Your node is now private. Only direct invites can connect.',
      });
    },
    [addToast, setMeshPreferences]
  );

  const handleAutoAcceptToggle = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const autoAcceptTrusted = event.target.checked;
      setMeshPreferences({ autoAcceptTrusted });
      addToast({
        title: autoAcceptTrusted ? 'Trusted auto-link enabled' : 'Manual approval required',
        variant: 'info',
        description: autoAcceptTrusted
          ? 'Trusted peers may establish channels instantly.'
          : 'Review each mesh request before connecting.',
      });
    },
    [addToast, setMeshPreferences]
  );

  const handleCategoryChange = useCallback(
    (category: SettingsCategory) => {
      setSettingsSection(category);
      if (contentScrollRef.current) {
        contentScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },
    [setSettingsSection]
  );

  const handleDeactivateAccount = useCallback(() => {
    deactivateAccount();
    addToast({
      title: 'Account deactivated',
      variant: 'warning',
      description: 'You have been signed out and your presence is now hidden from the mesh.',
    });
    handleClose();
  }, [addToast, deactivateAccount, handleClose]);

  const handleDeleteAccount = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!currentUser) {
        addToast({
          title: 'No account found',
          variant: 'error',
          description: 'Sign in to delete an account.',
        });
        return;
      }

      const normalizedConfirmation = deleteConfirmationInput.trim().toLowerCase();
      const expected = currentUser.email.toLowerCase();
      if (normalizedConfirmation !== 'delete' && normalizedConfirmation !== expected) {
        addToast({
          title: 'Confirmation required',
          variant: 'error',
          description: 'Type DELETE or your account email to confirm deletion.',
        });
        return;
      }

      setIsDeletingAccount(true);
      try {
        const success = deleteAccount();
        if (success) {
          addToast({
            title: 'Account deleted',
            variant: 'success',
            description: 'All user data, including encrypted vault items, has been purged.',
          });
          handleClose();
        } else {
          addToast({
            title: 'Deletion failed',
            variant: 'error',
            description: 'Harmonia could not remove the account. Try again shortly.',
          });
        }
      } finally {
        setIsDeletingAccount(false);
        setDeleteConfirmationInput('');
      }
    },
    [addToast, currentUser, deleteAccount, deleteConfirmationInput, handleClose]
  );

  const handleSupportSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!supportForm.message.trim()) {
        addToast({
          title: 'Message required',
          variant: 'error',
          description: 'Share a few details so the support team can respond.',
        });
        return;
      }

      setIsSendingSupport(true);
      try {
        const dispatched = sendSupportEmail(supportForm);
        console.info('Support request dispatched', supportForm);
        addToast({
          title: dispatched ? 'Signal sent to support' : 'Support message queued',
          variant: dispatched ? 'success' : 'info',
          description: dispatched
            ? 'Check your inbox for a confirmation from Harmonia support.'
            : 'Your message has been queued locally. We will resend when a mail client is available.',
        });
        setSupportForm((form) => ({ ...form, message: '' }));
      } finally {
        setIsSendingSupport(false);
      }
    },
    [addToast, supportForm]
  );

  const handleNsfwToggle = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const nextValue = event.target.checked;
      updateContentPreferences({ nsfw: nextValue });
      addToast({
        title: nextValue ? 'NSFW content enabled' : 'NSFW content filtered',
        variant: nextValue ? 'warning' : 'info',
        description: nextValue
          ? 'Mature posts now appear across the Agora feed and recommendations.'
          : 'Mature posts are hidden immediately from all discovery surfaces.',
      });
    },
    [addToast, updateContentPreferences]
  );

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[620] flex items-center justify-center overflow-y-auto bg-slate-950/85 p-6 backdrop-blur-xl"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-label="Harmonia settings"
    >
      <div
        className="relative w-full max-w-5xl overflow-hidden rounded-[28px] border border-white/12 bg-slate-950/80 shadow-[0_40px_140px_-60px_rgba(15,23,42,0.95)]"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex flex-col gap-6 border-b border-white/10 bg-white/5 px-10 py-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">Harmonia Settings</p>
            <h2 className="text-3xl font-semibold text-white">Command Nexus</h2>
            <p className="max-w-2xl text-sm text-white/60">
              Fine-tune your account, content curation, privacy posture, and support channels without
              disrupting live sessions.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="ui-button ui-button--ghost flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/60"
          >
            Collapse
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex flex-col gap-0 bg-slate-950/60 sm:flex-row">
          <aside className="w-full border-b border-white/10 bg-white/5 px-6 py-6 sm:w-72 sm:border-b-0 sm:border-r">
            <nav className="space-y-4">
              {SETTINGS_CATEGORIES.map((category) => {
                const isActive = normalizedCategory === category.id;
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => handleCategoryChange(category.id)}
                    className={`w-full rounded-[18px] border px-4 py-4 text-left transition ${
                      isActive
                        ? 'border-emerald-400/60 bg-emerald-500/10 text-white'
                        : 'border-white/10 bg-transparent text-white/70 hover:border-white/20 hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.28em]">
                          {category.label}
                        </p>
                        <p className="mt-2 text-xs text-white/50">{category.description}</p>
                      </div>
                      <ChevronPointer isActive={isActive} />
                    </div>
                  </button>
                );
              })}
            </nav>
          </aside>

          <section
            ref={contentScrollRef}
            className="max-h-[70vh] w-full overflow-y-auto px-8 py-10 sm:px-10"
          >
            {normalizedCategory === 'account' && (
              <div className="ui-stack gap-8">
                <div className="ui-card gap-6">
                  <p className="text-xs uppercase tracking-[0.3em] text-white/50">Chrono Alignment</p>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-white/50">Account status</p>
                      <h3 className="mt-1 text-2xl font-semibold text-white">
                        {currentUser?.name ?? 'Unknown Operator'}
                      </h3>
                      <p className="text-sm text-white/60">{currentUser?.email ?? 'No email on file'}</p>
                    </div>
                    <span
                      className={`ui-chip ${
                        accountStatus === 'active'
                          ? 'border-emerald-400/50 text-emerald-200'
                          : 'border-amber-400/50 text-amber-200'
                      }`}
                    >
                      {accountStatus === 'active' ? 'Active' : 'Deactivated'}
                    </span>
                  </div>

                  <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_280px]">
                    <div className="space-y-6">
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-white">Auto-Detect Timezone</p>
                            <p className="text-xs text-white/50">
                              Sync with this device's local time reference.
                            </p>
                          </div>
                          <label className="relative inline-flex cursor-pointer items-center">
                            <input
                              type="checkbox"
                              checked={autoDetect}
                              onChange={handleAutoDetectChange}
                              className="peer sr-only"
                            />
                            <span className="relative block h-6 w-11 rounded-full border border-white/20 bg-white/10 transition peer-checked:border-emerald-400/60 peer-checked:bg-emerald-500/20">
                              <span className="absolute left-1 top-1 block h-4 w-4 rounded-full bg-white transition-all duration-300 peer-checked:translate-x-5 peer-checked:bg-emerald-300" />
                            </span>
                          </label>
                        </div>

                        <div className="mt-5 space-y-3">
                          <label className="text-xs uppercase tracking-[0.3em] text-white/50">
                            Timezone Override
                          </label>
                          <select
                            value={manualTimezone}
                            onChange={handleManualTimezoneChange}
                            disabled={autoDetect}
                            className="w-full rounded-[16px] border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white focus:border-white/30 focus:outline-none disabled:cursor-not-allowed disabled:border-white/5 disabled:bg-white/5 disabled:text-white/40"
                          >
                            {timezoneOptions.map((zone) => (
                              <option key={zone} value={zone}>
                                {zone}
                              </option>
                            ))}
                          </select>
                          <p className="text-xs text-white/50">
                            Choose a reference timezone when manual mode is active.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={handleRedetect}
                          className="mt-4 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/60 transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
                        >
                          <RefreshCcw className="h-4 w-4" />
                          Re-detect
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
                        <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-white/50">
                          <span>Active Timezone</span>
                          <Globe2 className="h-4 w-4 text-emerald-300" />
                        </div>
                        <p className="mt-3 text-lg font-semibold text-white">{activeTimezone}</p>
                        <p className="text-xs text-white/50">{timezoneLabel}</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5 font-mono text-sm text-white">
                        <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-white/50">
                          <span>Temporal Preview</span>
                          <Sparkles className="h-4 w-4 text-sky-300" />
                        </div>
                        <p className="mt-3">{preview}</p>
                        <p className="text-xs text-white/50">Updated live every second.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="ui-card gap-6">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-white/50">Account controls</p>
                      <h3 className="mt-1 text-xl font-semibold text-white">Preserve or reset your Harmonia presence</h3>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleDeactivateAccount}
                        className="ui-button ui-button--ghost flex items-center gap-2 text-amber-200 hover:text-amber-100"
                      >
                        <Power className="h-4 w-4" />
                        Deactivate
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(true)}
                        className="ui-button ui-button--outline border-rose-500/40 text-rose-200 hover:bg-rose-500/10"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    </div>
                  </div>

                  <p className="text-sm text-white/60">
                    Deactivation is reversible and hides your signals immediately. Deleting your account permanently
                    erases all stored data, forum posts, and encrypted vault content.
                  </p>

                  {showDeleteConfirm && (
                    <form
                      onSubmit={handleDeleteAccount}
                      className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-6 text-sm text-rose-100"
                    >
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="mt-1 h-5 w-5 flex-shrink-0 text-rose-300" />
                        <div className="space-y-3">
                          <div>
                            <p className="text-base font-semibold uppercase tracking-[0.3em]">Confirm deletion</p>
                            <p className="mt-2 text-rose-100/80">
                              This action cannot be undone. Type <strong>DELETE</strong> or your email address to
                              confirm and purge all data.
                            </p>
                          </div>
                          <input
                            type="text"
                            value={deleteConfirmationInput}
                            onChange={(event) => setDeleteConfirmationInput(event.target.value)}
                            className="w-full rounded-[14px] border border-rose-400/50 bg-rose-500/20 px-4 py-3 text-white placeholder:text-rose-100/60 focus:border-white/50 focus:outline-none"
                            placeholder={currentUser?.email ?? 'Type DELETE to confirm'}
                          />
                          <div className="flex flex-wrap justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setShowDeleteConfirm(false);
                                setDeleteConfirmationInput('');
                              }}
                              className="ui-button ui-button--ghost"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={isDeletingAccount}
                              className="ui-button ui-button--primary bg-rose-500/80 text-rose-50 hover:bg-rose-500"
                            >
                              {isDeletingAccount ? 'Deleting…' : 'Delete Account'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            )}

            {normalizedCategory === 'content' && (
              <div className="ui-stack gap-8">
                <div className="ui-card gap-6">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-white/50">Content filters</p>
                      <h3 className="mt-1 text-2xl font-semibold text-white">Curate mature discoveries</h3>
                      <p className="mt-2 text-sm text-white/60">
                        Toggle NSFW visibility to instantly expand or contract the Agora recommendations shown to you.
                      </p>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        checked={nsfwOptIn}
                        onChange={handleNsfwToggle}
                        className="peer sr-only"
                      />
                      <span className="relative block h-7 w-12 rounded-full border border-white/15 bg-white/10 transition peer-checked:border-rose-400/60 peer-checked:bg-rose-500/30">
                        <span className="absolute left-1 top-1 block h-5 w-5 rounded-full bg-white transition-all duration-300 peer-checked:translate-x-5 peer-checked:bg-rose-200" />
                      </span>
                    </label>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
                      <div className="flex items-center gap-3 text-sm font-semibold text-white">
                        <Shield className="h-5 w-5 text-emerald-300" />
                        <span>Safe feed</span>
                      </div>
                      <p className="mt-3 text-xs text-white/60">
                        Keep immersive missions PG-13. Harmonia filters flagged topics and reframes recommendations.
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
                      <div className="flex items-center gap-3 text-sm font-semibold text-white">
                        <ShieldOff className="h-5 w-5 text-rose-300" />
                        <span>NSFW expansion</span>
                      </div>
                      <p className="mt-3 text-xs text-white/60">
                        Opting in surfaces mature artwork, language, and simulations directly inside the Agora feed.
                      </p>
                    </div>
                  </div>
                </div>

                <div ref={themeSectionRef} className="ui-card gap-6">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-white/50">Theme studio</p>
                      <h3 className="mt-1 text-2xl font-semibold text-white">Customize Harmonia&apos;s palette</h3>
                      <p className="mt-2 text-sm text-white/60">
                        Build new themes or refine existing palettes. Changes sync instantly with your profile.
                      </p>
                    </div>
                    <Sparkles className="h-6 w-6 text-emerald-300" />
                  </div>
                  <ThemeCustomizationPanel />
                </div>
              </div>
            )}

            {normalizedCategory === 'privacy' && (
              <div className="ui-stack gap-8">
                <div className="ui-card gap-6">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-white/50">Mesh Governance</p>
                      <h3 className="mt-1 text-2xl font-semibold text-white">Control who can discover your node</h3>
                      <p className="mt-2 text-sm text-white/60">
                        Adjust discovery beacons and trusted peer automation to match your mission posture.
                      </p>
                    </div>
                    <Bell className="h-6 w-6 text-sky-300" />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-white">Public discovery opt-in</p>
                          <p className="text-xs text-white/60">
                            Allow trusted indexers to relay your presence.
                          </p>
                        </div>
                        <label className="relative inline-flex cursor-pointer items-center">
                          <input
                            type="checkbox"
                            checked={meshPreferences.allowPublicDiscovery}
                            onChange={handleMeshDiscoveryToggle}
                            className="peer sr-only"
                          />
                          <span className="relative block h-6 w-11 rounded-full border border-white/20 bg-white/10 transition peer-checked:border-cyan-400/60 peer-checked:bg-cyan-500/20">
                            <span className="absolute left-1 top-1 block h-4 w-4 rounded-full bg-white transition-all duration-300 peer-checked:translate-x-5 peer-checked:bg-cyan-300" />
                          </span>
                        </label>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-white">Auto-link trusted peers</p>
                          <p className="text-xs text-white/60">
                            Skip approval when a trusted node initiates contact.
                          </p>
                        </div>
                        <label className="relative inline-flex cursor-pointer items-center">
                          <input
                            type="checkbox"
                            checked={meshPreferences.autoAcceptTrusted}
                            onChange={handleAutoAcceptToggle}
                            className="peer sr-only"
                          />
                          <span className="relative block h-6 w-11 rounded-full border border-white/20 bg-white/10 transition peer-checked:border-emerald-400/60 peer-checked:bg-emerald-500/20">
                            <span className="absolute left-1 top-1 block h-4 w-4 rounded-full bg-white transition-all duration-300 peer-checked:translate-x-5 peer-checked:bg-emerald-300" />
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="ui-card gap-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-white/50">Encrypted vault</p>
                      <h3 className="mt-1 text-2xl font-semibold text-white">Manage secure storage</h3>
                      <p className="mt-2 text-sm text-white/60">
                        Review locally stored assets and adjust their visibility within trusted circles.
                      </p>
                    </div>
                    <span className="ui-chip border-white/10 text-white/60">
                      {assets.length} stored asset{assets.length === 1 ? '' : 's'}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {assets.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-6 text-center text-sm text-white/60">
                        No encrypted files stored yet. Uploads remain on this device only.
                      </div>
                    ) : (
                      assets.slice(0, 6).map((asset) => (
                        <div
                          key={asset.id}
                          className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-slate-950/60 p-4 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-white">{asset.name}</p>
                            <p className="text-xs text-white/50">
                              {(asset.size / 1024).toFixed(1)} KB • {asset.mimeType || 'binary'} •{' '}
                              {new Date(asset.createdAt).toLocaleString()}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/50">
                            <select
                              value={asset.visibility}
                              onChange={(event) =>
                                void updateAssetVisibility(asset.id, event.target.value as typeof asset.visibility)
                              }
                              className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-1"
                            >
                              <option value="private">Private</option>
                              <option value="trusted">Trusted Peers</option>
                            </select>
                            <button
                              type="button"
                              onClick={() => void deleteAsset(asset.id)}
                              className="rounded-xl border border-rose-400/40 bg-rose-500/10 px-3 py-1 text-rose-200 transition hover:bg-rose-500/20"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {normalizedCategory === 'support' && (
              <div className="ui-stack gap-8">
                <div className="ui-card gap-6">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-white/50">Help center</p>
                      <h3 className="mt-1 text-2xl font-semibold text-white">Instant guidance & direct contact</h3>
                      <p className="mt-2 text-sm text-white/60">
                        Search the FAQ, expand answers, and escalate to the support collective when you need a
                        dedicated response.
                      </p>
                    </div>
                    <HelpCircle className="h-6 w-6 text-sky-300" />
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                    <div className="flex items-center gap-3">
                      <Search className="h-4 w-4 text-white/40" />
                      <input
                        type="search"
                        value={faqQuery}
                        onChange={(event) => setFaqQuery(event.target.value)}
                        placeholder="Search support topics"
                        className="flex-1 bg-transparent text-sm text-white placeholder:text-white/40 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    {filteredFaq.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-6 text-center text-sm text-white/60">
                        No results. Adjust your search terms or contact support directly below.
                      </div>
                    ) : (
                      filteredFaq.map((entry) => {
                        const isExpanded = expandedFaq === entry.id;
                        return (
                          <div
                            key={entry.id}
                            className="rounded-2xl border border-white/10 bg-slate-950/60"
                          >
                            <button
                              type="button"
                              onClick={() => setExpandedFaq(isExpanded ? null : entry.id)}
                              className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left text-sm font-medium text-white"
                            >
                              <span>{entry.question}</span>
                              <span className="text-xs uppercase tracking-[0.3em] text-white/40">
                                {isExpanded ? 'Hide' : 'Show'}
                              </span>
                            </button>
                            {isExpanded && (
                              <div className="border-t border-white/10 px-5 py-4 text-sm text-white/70">
                                {entry.answer}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <form onSubmit={handleSupportSubmit} className="ui-card gap-6">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-white/50">Contact support</p>
                      <h3 className="mt-1 text-2xl font-semibold text-white">Send a message to mission control</h3>
                      <p className="mt-2 text-sm text-white/60">
                        Messages route directly to matthew.denton222@gmail.com with your selected topic.
                      </p>
                    </div>
                    <Mail className="h-6 w-6 text-emerald-300" />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
                      <label className="text-[11px] uppercase tracking-[0.3em] text-white/40">Name</label>
                      <input
                        type="text"
                        value={supportForm.name}
                        onChange={(event) =>
                          setSupportForm((form) => ({ ...form, name: event.target.value }))
                        }
                        className="mt-1 w-full bg-transparent text-sm text-white focus:outline-none"
                        placeholder="Operator alias"
                      />
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
                      <label className="text-[11px] uppercase tracking-[0.3em] text-white/40">Email</label>
                      <input
                        type="email"
                        value={supportForm.email}
                        onChange={(event) =>
                          setSupportForm((form) => ({ ...form, email: event.target.value }))
                        }
                        required
                        className="mt-1 w-full bg-transparent text-sm text-white focus:outline-none"
                        placeholder="you@collective.io"
                      />
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
                      <label className="text-[11px] uppercase tracking-[0.3em] text-white/40">Topic</label>
                      <select
                        value={supportForm.topic}
                        onChange={(event) =>
                          setSupportForm((form) => ({ ...form, topic: event.target.value }))
                        }
                        className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-white focus:border-white/30 focus:outline-none"
                      >
                        <option value="General Inquiry">General Inquiry</option>
                        <option value="Account Assistance">Account Assistance</option>
                        <option value="Privacy Concern">Privacy Concern</option>
                        <option value="Feedback">Feedback</option>
                      </select>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
                      <label className="text-[11px] uppercase tracking-[0.3em] text-white/40">Priority</label>
                      <p className="mt-1 text-sm text-white/60">
                        Support responds within 24 hours. Mark urgent topics in the message below.
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
                    <label className="text-[11px] uppercase tracking-[0.3em] text-white/40">Message</label>
                    <textarea
                      value={supportForm.message}
                      onChange={(event) =>
                        setSupportForm((form) => ({ ...form, message: event.target.value }))
                      }
                      className="mt-2 h-36 w-full resize-none rounded-lg border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-white focus:border-white/30 focus:outline-none"
                      placeholder="Describe your question, request, or issue. Include timestamps if relevant."
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/40">
                      <MessageCircle className="h-4 w-4" />
                      Direct transmission to support
                    </div>
                    <button
                      type="submit"
                      className="ui-button ui-button--primary flex items-center gap-2"
                      disabled={isSendingSupport}
                    >
                      {isSendingSupport ? 'Sending…' : 'Send message'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function ChevronPointer({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full border text-xs uppercase tracking-[0.3em] transition ${
        isActive ? 'border-emerald-400/60 bg-emerald-500/10 text-emerald-200' : 'border-white/10 text-white/40'
      }`}
      aria-hidden="true"
    >
      {isActive ? 'GO' : 'SET'}
    </span>
  );
}
