import type React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Send,
  NotebookPen,
  PlusCircle,
  Save,
  Trash2,
  Languages,
  Sparkles,
  RefreshCcw,
  Pin,
  PinOff,
  Bluetooth,
  ShieldCheck,
  Paperclip,
  Image as ImageIcon,
  Video as VideoIcon,
  File as FileIcon,
} from 'lucide-react';
import { useChatStore } from '../../store/chatStore';
import { useUserStore } from '../../store/userStore';
import { useAuthStore } from '../../store/authStore';
import { useBluetoothStore } from '../../store/bluetoothStore';
import type { EncryptedAttachment, EncryptedMessage } from '../../store/chatStore';
import {
  encryptText,
  decryptText,
  encryptBuffer,
  decryptBuffer,
  bufferToDataUrl,
} from '../../utils/encryption';

interface ChatWindowProps {
  activeChatId: string | null;
}

const CHANNELS = [
  { id: 'broadcast', label: 'Broadcast' },
  { id: 'alliances', label: 'Alliances' },
  { id: 'operations', label: 'Operations' },
  { id: 'research', label: 'Research' },
];

interface Note {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
}

interface PendingAttachment {
  id: string;
  file: File;
  previewUrl: string;
  type: 'image' | 'video' | 'file';
}

interface DecryptedAttachment {
  id: string;
  name: string;
  type: 'image' | 'video' | 'file';
  size: number;
  mimeType: string;
  dataUrl: string;
}

interface DecryptedMessage extends Omit<EncryptedMessage, 'encryptedContent' | 'attachments'> {
  content: string;
  attachments: DecryptedAttachment[];
}

const generateNoteId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `note-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const TRANSLATION_LANGUAGES = [
  { id: 'es', label: 'Spanish' },
  { id: 'fr', label: 'French' },
  { id: 'de', label: 'German' },
  { id: 'ja', label: 'Japanese' },
];

const translationDictionary: Record<string, Record<string, string>> = {
  es: {
    hello: 'hola',
    hi: 'hola',
    mission: 'misión',
    update: 'actualización',
    meeting: 'reunión',
    ready: 'listo',
    yes: 'sí',
    no: 'no',
    soon: 'pronto',
    later: 'luego',
    thanks: 'gracias',
    please: 'por favor',
    intel: 'informe',
    secure: 'seguro',
    link: 'enlace',
  },
  fr: {
    hello: 'bonjour',
    hi: 'salut',
    mission: 'mission',
    update: 'mise à jour',
    meeting: 'réunion',
    ready: 'prêt',
    yes: 'oui',
    no: 'non',
    soon: 'bientôt',
    later: 'plus tard',
    thanks: 'merci',
    please: 's’il vous plaît',
    intel: 'rapport',
    secure: 'sécurisé',
    link: 'liaison',
  },
  de: {
    hello: 'hallo',
    hi: 'hallo',
    mission: 'mission',
    update: 'update',
    meeting: 'besprechung',
    ready: 'bereit',
    yes: 'ja',
    no: 'nein',
    soon: 'bald',
    later: 'später',
    thanks: 'danke',
    please: 'bitte',
    intel: 'bericht',
    secure: 'sicher',
    link: 'verbindung',
  },
  ja: {
    hello: 'こんにちは',
    hi: 'やあ',
    mission: '任務',
    update: '更新',
    meeting: '会議',
    ready: '準備完了',
    yes: 'はい',
    no: 'いいえ',
    soon: 'まもなく',
    later: '後で',
    thanks: 'ありがとう',
    please: 'お願いします',
    intel: '情報',
    secure: '安全',
    link: 'リンク',
  },
};

function translateText(text: string, language: string) {
  const dictionary = translationDictionary[language];
  if (!dictionary) return text;

  return text
    .split(/(\b)/)
    .map((segment) => {
      const lower = segment.toLowerCase();
      if (!dictionary[lower]) {
        return segment;
      }

      const translated = dictionary[lower];
      if (segment === segment.toUpperCase()) {
        return translated.toUpperCase();
      }

      if (segment[0] && segment[0] === segment[0].toUpperCase()) {
        return translated.charAt(0).toUpperCase() + translated.slice(1);
      }

      return translated;
    })
    .join('');
}

function generateRecap(
  messages: { content: string; fromUserId: string; timestamp: number }[],
  currentUserId: string
) {
  if (!messages.length) {
    return 'No transmissions yet. Once the channel warms up, Enclypse will condense the highlights for you.';
  }

  const mostRecent = messages.slice(-5);
  const uniqueSenders = Array.from(new Set(messages.map((msg) => msg.fromUserId)));
  const allyCount = uniqueSenders.filter((id) => id !== currentUserId).length;
  const lastMessage = mostRecent[mostRecent.length - 1]?.content ?? '';

  return `Exchanged ${messages.length} encrypted bursts with ${allyCount || 'no other'} operatives. Latest signal: “${lastMessage.slice(0, 120)}${lastMessage.length > 120 ? '…' : ''}”.`;
}

export function ChatWindow({ activeChatId }: ChatWindowProps) {
  const [message, setMessage] = useState('');
  const [activeChannel, setActiveChannel] = useState(CHANNELS[0].id);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [autoTranslate, setAutoTranslate] = useState(false);
  const [translationLanguage, setTranslationLanguage] = useState(TRANSLATION_LANGUAGES[0].id);
  const [recap, setRecap] = useState('');
  const [isGeneratingRecap, setIsGeneratingRecap] = useState(false);
  const [lastRecapAt, setLastRecapAt] = useState<number | null>(null);
  const [pinnedMessageIds, setPinnedMessageIds] = useState<string[]>([]);

  const currentUser = useAuthStore((state) => state.user);
  const otherUser = useUserStore((state) =>
    state.users.find((user) => user.id === activeChatId)
  );
  const { sendMessage, getMessagesForChat } = useChatStore();
  const { ensureConnection, updateSignalStrength, connections, getConnection } = useBluetoothStore((state) => ({
    ensureConnection: state.ensureConnection,
    updateSignalStrength: state.updateSignalStrength,
    connections: state.connections,
    getConnection: state.getConnection,
  }));

  const connection = useMemo(() => {
    if (!currentUser || !activeChatId) return undefined;
    return getConnection(currentUser.id, activeChatId);
  }, [getConnection, currentUser?.id, activeChatId, connections]);

  const encryptedMessages = useMemo(() => {
    if (!currentUser || !activeChatId) return [];
    return getMessagesForChat(currentUser.id, activeChatId);
  }, [currentUser, activeChatId, getMessagesForChat]);

  const [displayMessages, setDisplayMessages] = useState<DecryptedMessage[]>([]);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [linkAlert, setLinkAlert] = useState<string | null>(null);
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);

  const pinnedMessages = useMemo(() => {
    if (!pinnedMessageIds.length) return [];
    return displayMessages.filter((msg) => pinnedMessageIds.includes(msg.id));
  }, [displayMessages, pinnedMessageIds]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [displayMessages, activeChannel]);

  useEffect(() => {
    if (!currentUser || !activeChatId || typeof window === 'undefined') {
      setPinnedMessageIds([]);
      return;
    }

    const storedPins = window.localStorage.getItem(
      `enclypse-pins-${currentUser.id}-${activeChatId}`
    );
    if (storedPins) {
      try {
        const parsed: string[] = JSON.parse(storedPins);
        setPinnedMessageIds(parsed);
      } catch (error) {
        console.warn('Failed to parse pinned messages', error);
        setPinnedMessageIds([]);
      }
    } else {
      setPinnedMessageIds([]);
    }
  }, [currentUser?.id, activeChatId]);

  useEffect(() => {
    if (!currentUser || !activeChatId || typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(
      `enclypse-pins-${currentUser.id}-${activeChatId}`,
      JSON.stringify(pinnedMessageIds)
    );
  }, [pinnedMessageIds, currentUser?.id, activeChatId]);

  useEffect(() => {
    if (!currentUser || !activeChatId) return;
    setLinkAlert(null);
    ensureConnection(currentUser.id, activeChatId);
  }, [currentUser?.id, activeChatId, ensureConnection]);

  useEffect(() => {
    if (!currentUser || !activeChatId) return;
    const interval = window.setInterval(() => {
      const latest = getConnection(currentUser.id, activeChatId);
      const baseStrength = latest?.signalStrength ?? 80;
      const variation = Math.random() * 14 - 7;
      updateSignalStrength(currentUser.id, activeChatId, baseStrength + variation);
    }, 6000);

    return () => window.clearInterval(interval);
  }, [currentUser?.id, activeChatId, updateSignalStrength, getConnection]);

  useEffect(() => {
    let isActive = true;

    const decryptMessages = async () => {
      if (!connection?.key) {
        setDisplayMessages([]);
        return;
      }

      if (encryptedMessages.length === 0) {
        setDisplayMessages([]);
        return;
      }

      setIsDecrypting(true);
      setLinkAlert(null);

      try {
        const resolved = await Promise.all(
          encryptedMessages.map(async (msg) => {
            const content = await decryptText(connection.key, msg.encryptedContent, msg.iv);
            const attachments = await Promise.all(
              msg.attachments.map(async (attachment) => {
                const buffer = await decryptBuffer(connection.key, attachment.encryptedData, attachment.iv);
                return {
                  id: attachment.id,
                  name: attachment.name,
                  type: attachment.type,
                  size: attachment.size,
                  mimeType: attachment.mimeType,
                  dataUrl: bufferToDataUrl(buffer, attachment.mimeType),
                };
              })
            );

            return {
              ...msg,
              content,
              attachments,
            } satisfies DecryptedMessage;
          })
        );

        if (isActive) {
          setDisplayMessages(resolved);
        }
      } catch (error) {
        console.error('Failed to decrypt bluetooth messages', error);
        if (isActive) {
          setLinkAlert('Bluetooth link disrupted. Unable to decrypt latest packets.');
        }
      } finally {
        if (isActive) {
          setIsDecrypting(false);
        }
      }
    };

    decryptMessages();

    return () => {
      isActive = false;
    };
  }, [encryptedMessages, connection?.key]);

  useEffect(() => {
    if (!currentUser) {
      setNotes([]);
      setSelectedNoteId(null);
      setNoteTitle('');
      setNoteContent('');
      return;
    }

    if (typeof window === 'undefined') {
      return;
    }

    const stored = window.localStorage.getItem(`enclypse-notes-${currentUser.id}`);
    if (stored) {
      try {
        const parsed: Note[] = JSON.parse(stored);
        const ordered = [...parsed].sort((a, b) => b.updatedAt - a.updatedAt);
        setNotes(ordered);
        if (ordered.length > 0) {
          setSelectedNoteId(ordered[0].id);
          setNoteTitle(ordered[0].title);
          setNoteContent(ordered[0].content);
        }
      } catch (error) {
        console.warn('Failed to parse stored notes', error);
        setNotes([]);
        setSelectedNoteId(null);
        setNoteTitle('');
        setNoteContent('');
      }
    } else {
      setNotes([]);
      setSelectedNoteId(null);
      setNoteTitle('');
      setNoteContent('');
    }
  }, [currentUser?.id]);

  useEffect(() => {
    if (!currentUser || typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(
      `enclypse-notes-${currentUser.id}`,
      JSON.stringify(notes)
    );
  }, [notes, currentUser?.id]);

  useEffect(() => {
    if (!selectedNoteId) {
      setNoteTitle('');
      setNoteContent('');
      return;
    }

    const activeNote = notes.find((note) => note.id === selectedNoteId);
    if (activeNote) {
      setNoteTitle(activeNote.title);
      setNoteContent(activeNote.content);
    }
  }, [selectedNoteId, notes]);

  useEffect(() => {
    setRecap('');
    setLastRecapAt(null);
    setIsGeneratingRecap(false);
  }, [activeChatId]);

  const handleChannelKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const focusable = channelButtonRefs.current.filter(
      (button): button is HTMLButtonElement => Boolean(button)
    );

    if (!focusable.length) {
      return;
    }

    const currentIndex = focusable.indexOf(document.activeElement as HTMLButtonElement);
    let nextIndex = currentIndex;

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      nextIndex = (currentIndex + 1 + focusable.length) % focusable.length;
    }

    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      nextIndex = (currentIndex - 1 + focusable.length) % focusable.length;
    }

    if (nextIndex !== currentIndex && focusable[nextIndex]) {
      focusable[nextIndex].focus();
    }
  };

  if (!currentUser) {
    return (
      <div className="chat-window h-full w-full">
        <div className="chat-window__empty">
          <h2>Authenticate to engage the sphere.</h2>
          <p>Once linked, encrypted channels will appear here.</p>
        </div>
      </div>
    );
  }

  const readFileAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Unable to preview file.'));
        }
      };
      reader.onerror = () => {
        reject(reader.error ?? new Error('Failed to read file.'));
      };
      reader.readAsDataURL(file);
    });

  const formatFileSize = (size: number) => {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleAttachmentClick = () => {
    if (!activeChatId) {
      setLinkAlert('Select an operator to initiate a Bluetooth payload transfer.');
      return;
    }
    setLinkAlert(null);
    fileInputRef.current?.click();
  };

  const handleAttachmentSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!event.target.files || event.target.files.length === 0) return;

    const files = Array.from(event.target.files);
    const additions: PendingAttachment[] = [];

    for (const file of files) {
      try {
        const previewUrl = await readFileAsDataUrl(file);
        const type = file.type.startsWith('image')
          ? 'image'
          : file.type.startsWith('video')
          ? 'video'
          : 'file';

        additions.push({
          id: `${Date.now()}-${file.name}-${Math.random().toString(16).slice(2)}`,
          file,
          previewUrl,
          type,
        });
      } catch (error) {
        console.error('Failed to buffer attachment preview', error);
        setLinkAlert('One of the selected files could not be prepared. Please try again.');
      }
    }

    if (additions.length > 0) {
      setPendingAttachments((previous) => [...previous, ...additions]);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveAttachment = (attachmentId: string) => {
    setPendingAttachments((previous) =>
      previous.filter((attachment) => attachment.id !== attachmentId)
    );
  };

  const handleTransmit = async () => {
    if (!currentUser || !activeChatId || !connection?.key) {
      setLinkAlert('Secure the Bluetooth pairing before transmitting.');
      return;
    }

    if (!message.trim() && pendingAttachments.length === 0) {
      setLinkAlert('Compose a message or attach intel before sending.');
      return;
    }

    setIsTransmitting(true);
    setLinkAlert(null);

    try {
      const payloadText = message;
      const { ciphertext, iv } = await encryptText(connection.key, payloadText);

      const encryptedAttachments: EncryptedAttachment[] = [];

      for (const attachment of pendingAttachments) {
        try {
          const buffer = await attachment.file.arrayBuffer();
          const encrypted = await encryptBuffer(connection.key, buffer);
          encryptedAttachments.push({
            id: attachment.id,
            name: attachment.file.name,
            type: attachment.type,
            size: attachment.file.size,
            mimeType: attachment.file.type || 'application/octet-stream',
            encryptedData: encrypted.ciphertext,
            iv: encrypted.iv,
          });
        } catch (error) {
          console.error('Failed to encrypt attachment', error);
          setLinkAlert('Attachment encryption failed. Remove the item and retry.');
          setIsTransmitting(false);
          return;
        }
      }

      await sendMessage({
        fromUserId: currentUser.id,
        toUserId: activeChatId,
        encryptedContent: ciphertext,
        iv,
        attachments: encryptedAttachments,
        algorithm: 'AES-GCM',
      });

      setMessage('');
      setPendingAttachments([]);
    } catch (error) {
      console.error('Bluetooth transmission failure', error);
      setLinkAlert('Transmission failed. Try adjusting proximity and send again.');
    } finally {
      setIsTransmitting(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await handleTransmit();
  };

  const handleSaveNote = () => {
    if (!noteTitle.trim() && !noteContent.trim()) {
      return;
    }

    const timestamp = Date.now();

    if (selectedNoteId) {
      setNotes((previousNotes) =>
        previousNotes
          .map((note) =>
            note.id === selectedNoteId
              ? { ...note, title: noteTitle.trim(), content: noteContent.trim(), updatedAt: timestamp }
              : note
          )
          .sort((a, b) => b.updatedAt - a.updatedAt)
      );
    } else {
      const newNote: Note = {
        id: generateNoteId(),
        title: noteTitle.trim() || 'Untitled note',
        content: noteContent.trim(),
        updatedAt: timestamp,
      };
      setNotes((previousNotes) => [newNote, ...previousNotes]);
      setSelectedNoteId(newNote.id);
    }
  };

  const handleNewNote = () => {
    setSelectedNoteId(null);
    setNoteTitle('');
    setNoteContent('');
  };

  const handleDeleteNote = (noteId: string) => {
    setNotes((previousNotes) => {
      const updated = previousNotes.filter((note) => note.id !== noteId);
      if (selectedNoteId === noteId) {
        const nextNote = updated[0];
        setSelectedNoteId(nextNote ? nextNote.id : null);
        if (nextNote) {
          setNoteTitle(nextNote.title);
          setNoteContent(nextNote.content);
        } else {
          setNoteTitle('');
          setNoteContent('');
        }
      }
      return updated;
    });
  };

  const handleTogglePin = (messageId: string) => {
    setPinnedMessageIds((previous) => {
      if (previous.includes(messageId)) {
        return previous.filter((id) => id !== messageId);
      }
      return [messageId, ...previous];
    });
  };

  const handleGenerateRecap = () => {
    if (!currentUser) return;
    setIsGeneratingRecap(true);
    const finalize = () => {
      setRecap(generateRecap(displayMessages, currentUser.id));
      setLastRecapAt(Date.now());
      setIsGeneratingRecap(false);
    };

    if (typeof window === 'undefined') {
      finalize();
      return;
    }

    window.setTimeout(finalize, 500);
  };

  const translationLabel = useMemo(() => {
    const selected = TRANSLATION_LANGUAGES.find((language) => language.id === translationLanguage);
    return selected?.label ?? 'Translation';
  }, [translationLanguage]);

  const signalStrength = Math.max(0, Math.min(100, Math.round(connection?.signalStrength ?? 0)));
  const signalQuality = useMemo(() => {
    if (signalStrength >= 80) return 'Excellent';
    if (signalStrength >= 60) return 'Strong';
    if (signalStrength >= 40) return 'Moderate';
    if (signalStrength >= 20) return 'Weak';
    return 'Critical';
  }, [signalStrength]);
  const signalBars = [25, 50, 75, 100];

  return (
    <div className="chat-window">
      <header className="chat-window__header">
        <div>
          <p className="chat-window__eyebrow">Encrypted Relay · {CHANNELS.find((c) => c.id === activeChannel)?.label}</p>
          <h1>Quantum Link Console</h1>
        </div>
        <div className="chat-window__header-status" role="status" aria-live="polite">
          <div className="chat-window__link-indicator">
            <Bluetooth className="h-4 w-4" aria-hidden="true" />
            <span>{connection?.connected ? 'Bluetooth link secured' : 'Link offline'}</span>
          </div>
          <div className="chat-window__signal" aria-label={`Signal strength ${signalStrength}%`}>
            <div className="chat-window__signal-bars">
              {signalBars.map((threshold) => (
                <span
                  key={threshold}
                  className={`chat-window__signal-bar ${signalStrength >= threshold ? 'active' : ''}`}
                  aria-hidden="true"
                />
              ))}
            </div>
            <span className="chat-window__signal-metric">{signalStrength}% · {signalQuality}</span>
          </div>
          <div className="chat-window__encryption">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            <span>End-to-end AES-GCM</span>
          </div>
        </div>
        {otherUser ? (
          <div className="chat-window__recipient">
            <span className="chat-window__recipient-avatar" style={{ backgroundColor: otherUser.color }} />
            <div>
              <p className="chat-window__recipient-name">{otherUser.name}</p>
              <span className={`chat-window__recipient-status ${otherUser.online ? 'online' : ''}`}>
                {otherUser.online ? 'Online now' : 'Offline'}
              </span>
            </div>
          </div>
        ) : (
          <div className="chat-window__recipient ghost">
            <span className="chat-window__recipient-name">Select an operator to begin.</span>
          </div>
        )}
      </header>

      <div className="chat-window__channels">
        <div
          className="chat-window__channel-list"
          role="tablist"
          aria-label="Channel filters"
          onKeyDown={handleChannelKeyDown}
        >
          {CHANNELS.map((channel, index) => (
            <button
              key={channel.id}
              type="button"
              onClick={() => setActiveChannel(channel.id)}
              className={`chat-window__channel ${activeChannel === channel.id ? 'active' : ''}`}
              aria-selected={activeChannel === channel.id}
              role="tab"
              ref={(element) => {
                channelButtonRefs.current[index] = element;
              }}
            >
              {channel.label}
            </button>
          ))}
        </div>
      </div>

      <div className="chat-window__utilities" role="group" aria-label="Conversation enhancements">
        <div className="chat-window__utility">
          <button
            type="button"
            className={`chat-window__utility-toggle ${autoTranslate ? 'active' : ''}`}
            onClick={() => setAutoTranslate((previous) => !previous)}
            aria-pressed={autoTranslate}
          >
            <Languages className="h-4 w-4" aria-hidden="true" />
            <span>Auto-translate</span>
            <span className="chat-window__utility-label">{translationLabel}</span>
          </button>
          {autoTranslate && (
            <div className="chat-window__utility-options" role="radiogroup" aria-label="Select translation language">
              {TRANSLATION_LANGUAGES.map((language) => (
                <button
                  key={language.id}
                  type="button"
                  role="radio"
                  aria-checked={translationLanguage === language.id}
                  className={`chat-window__utility-option ${
                    translationLanguage === language.id ? 'active' : ''
                  }`}
                  onClick={() => setTranslationLanguage(language.id)}
                >
                  {language.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="chat-window__utility">
          <button
            type="button"
            className="chat-window__utility-toggle"
            onClick={handleGenerateRecap}
            disabled={isGeneratingRecap || displayMessages.length === 0}
          >
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            <span>{isGeneratingRecap ? 'Synthesizing recap…' : 'Generate recap'}</span>
            {lastRecapAt && !isGeneratingRecap && (
              <span className="chat-window__utility-label">
                Updated {new Date(lastRecapAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="chat-window__body">
        <div className="chat-window__conversation">
          {pinnedMessages.length > 0 && (
            <div className="chat-window__pinned" aria-live="polite">
              <div className="chat-window__pinned-header">
                <Pin className="h-4 w-4" aria-hidden="true" />
                <h2>Pinned intel</h2>
                <span>{pinnedMessages.length}</span>
              </div>
              <ul>
                {pinnedMessages.map((msg) => (
                  <li key={msg.id}>
                    <button
                      type="button"
                      onClick={() => {
                        if (typeof document === 'undefined') return;
                        const element = document.getElementById(`enclypse-message-${msg.id}`);
                        element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        element?.focus({ preventScroll: true });
                      }}
                    >
                      <span>
                        {msg.content.slice(0, 96)}
                        {msg.content.length > 96 ? '…' : ''}
                      </span>
                      <span className="chat-window__pinned-meta">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {linkAlert && (
            <div className="chat-window__alert" role="status">
              {linkAlert}
            </div>
          )}

          {isDecrypting && (
            <div className="chat-window__status" role="status">
              Decoding encrypted bursts…
            </div>
          )}

          <div className="chat-window__messages" role="log" aria-live="polite">
            {activeChatId && displayMessages.length > 0 ? (
              displayMessages.map((msg) => {
                const isOwn = msg.fromUserId === currentUser.id;
                const isPinned = pinnedMessageIds.includes(msg.id);
                return (
                  <div
                    key={msg.id}
                    className={`chat-window__message ${isOwn ? 'self' : 'remote'} ${isPinned ? 'pinned' : ''}`}
                    id={`enclypse-message-${msg.id}`}
                    tabIndex={-1}
                  >
                    <div className="chat-window__message-toolbar">
                      <button
                        type="button"
                        onClick={() => handleTogglePin(msg.id)}
                        aria-pressed={isPinned}
                        className={`chat-window__pin-button ${isPinned ? 'active' : ''}`}
                        aria-label={isPinned ? 'Unpin message' : 'Pin message'}
                      >
                        {isPinned ? (
                          <PinOff className="h-4 w-4" aria-hidden="true" />
                        ) : (
                          <Pin className="h-4 w-4" aria-hidden="true" />
                        )}
                      </button>
                    </div>
                    <div className="chat-window__bubble">
                      {msg.content && <p>{msg.content}</p>}
                      {msg.attachments.length > 0 && (
                        <div className="chat-window__attachments" role="group" aria-label="Shared attachments">
                          {msg.attachments.map((attachment) => (
                            <div key={attachment.id} className={`chat-window__attachment chat-window__attachment--${attachment.type}`}>
                              <div className="chat-window__attachment-meta">
                                {attachment.type === 'image' && <ImageIcon className="h-4 w-4" aria-hidden="true" />}
                                {attachment.type === 'video' && <VideoIcon className="h-4 w-4" aria-hidden="true" />}
                                {attachment.type === 'file' && <FileIcon className="h-4 w-4" aria-hidden="true" />}
                                <span>{attachment.name}</span>
                                <span>{formatFileSize(attachment.size)}</span>
                              </div>
                              {attachment.type === 'image' && (
                                <img src={attachment.dataUrl} alt={attachment.name} loading="lazy" />
                              )}
                              {attachment.type === 'video' && (
                                <video src={attachment.dataUrl} controls preload="metadata" />
                              )}
                              {attachment.type === 'file' && (
                                <a href={attachment.dataUrl} download={attachment.name}>
                                  Download {attachment.name}
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {autoTranslate && msg.content && (
                      <p className="chat-window__translation" aria-label={`Translated to ${translationLabel}`}>
                        {translateText(msg.content, translationLanguage)}
                      </p>
                    )}
                    <span className="chat-window__timestamp">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                );
              })
            ) : (
            <div className="chat-window__placeholder">
              <h2>No transmissions yet.</h2>
              <p>Choose a contact on the left to establish a secure channel.</p>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {pendingAttachments.length > 0 && (
          <div className="chat-window__pending-attachments" role="list" aria-label="Pending attachments">
            {pendingAttachments.map((attachment) => (
              <div key={attachment.id} className="chat-window__pending-attachment" role="listitem">
                <div className="chat-window__pending-preview">
                  {attachment.type === 'image' && (
                    <img src={attachment.previewUrl} alt={attachment.file.name} loading="lazy" />
                  )}
                  {attachment.type === 'video' && (
                    <video src={attachment.previewUrl} muted loop playsInline />
                  )}
                  {attachment.type === 'file' && <FileIcon className="h-6 w-6" aria-hidden="true" />}
                </div>
                <div className="chat-window__pending-meta">
                  <p>{attachment.file.name}</p>
                  <span>{formatFileSize(attachment.file.size)}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveAttachment(attachment.id)}
                  className="chat-window__pending-remove"
                  aria-label={`Remove ${attachment.file.name}`}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="chat-window__composer" aria-label="Send a message">
          <button
            type="button"
            className="chat-window__composer-attachment"
            onClick={handleAttachmentClick}
            disabled={!activeChatId || isTransmitting}
            aria-label="Attach files via Bluetooth"
          >
            <Paperclip className="h-5 w-5" aria-hidden="true" />
          </button>
          <input
            type="text"
            value={message}
            disabled={!activeChatId}
            onChange={(event) => setMessage(event.target.value)}
              placeholder={activeChatId ? 'Compose your transmission…' : 'Select a contact to begin'}
              aria-label={
                activeChatId
                  ? 'Message input. Press enter to send or shift plus enter for a new line.'
                  : 'Message input disabled until a contact is selected.'
              }
            />
            <button
              type="submit"
              disabled={(!message.trim() && pendingAttachments.length === 0) || !activeChatId || isTransmitting}
              aria-label="Send message"
            >
              <Send className="h-5 w-5" />
            </button>
        </form>
        <input
          ref={fileInputRef}
          type="file"
          className="chat-window__file-input"
          multiple
          onChange={handleAttachmentSelect}
          accept="image/*,video/*,application/pdf,application/zip,application/json,.doc,.docx,.ppt,.pptx"
        />
        <p className="chat-window__composer-hint" role="note">
          Press <kbd>Shift</kbd> + <kbd>Enter</kbd> for a new line.
        </p>
      </div>

        <aside className="chat-window__tools chat-window__notepad" aria-label="Personal notepad">
          <div className="chat-window__intel">
            <div className="chat-window__intel-header">
              <Sparkles className="h-5 w-5" aria-hidden="true" />
              <div>
                <h2>Enclypse Recap</h2>
                <p>Summaries tuned to your latest transmissions.</p>
              </div>
            </div>
            <div className="chat-window__intel-body">
              {recap ? (
                <p>{recap}</p>
              ) : (
                <p>Trigger a recap to condense chatter into next-step clarity.</p>
              )}
            </div>
            <button
              type="button"
              className="chat-window__intel-refresh"
              onClick={handleGenerateRecap}
              disabled={isGeneratingRecap || displayMessages.length === 0}
            >
              <RefreshCcw className="h-4 w-4" aria-hidden="true" />
              {isGeneratingRecap ? 'Synthesizing…' : 'Refresh recap'}
            </button>
          </div>

          <div className="chat-window__notepad-header">
            <NotebookPen className="h-5 w-5" aria-hidden="true" />
            <div>
              <h2>Enclypse Notepad</h2>
              <p>Capture private intel, hypotheses, and follow-ups.</p>
            </div>
          </div>
          <div className="chat-window__notepad-actions">
            <button type="button" onClick={handleNewNote} className="chat-window__note-action">
              <PlusCircle className="h-4 w-4" aria-hidden="true" />
              New note
            </button>
            <button
              type="button"
              onClick={handleSaveNote}
              className="chat-window__note-action primary"
              disabled={!noteTitle.trim() && !noteContent.trim() && !selectedNoteId}
            >
              <Save className="h-4 w-4" aria-hidden="true" />
              Save
            </button>
          </div>
          <div className="chat-window__note-grid">
            <div className="chat-window__note-list" role="list" aria-label="Saved notes">
              {notes.length === 0 ? (
                <p className="chat-window__note-empty">No saved notes yet.</p>
              ) : (
                notes.map((note) => (
                  <button
                    key={note.id}
                    type="button"
                    className={`chat-window__note ${selectedNoteId === note.id ? 'active' : ''}`}
                    onClick={() => setSelectedNoteId(note.id)}
                  >
                    <div>
                      <p className="chat-window__note-title">{note.title || 'Untitled note'}</p>
                      <span className="chat-window__note-meta">
                        Updated {new Date(note.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="chat-window__note-delete"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleDeleteNote(note.id);
                      }}
                      aria-label={`Delete ${note.title || 'note'}`}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </button>
                ))
              )}
            </div>
            <div className="chat-window__note-editor" aria-label="Note editor">
              <label htmlFor="note-title" className="chat-window__note-label">
                Title
              </label>
              <input
                id="note-title"
                type="text"
                value={noteTitle}
                onChange={(event) => setNoteTitle(event.target.value)}
                placeholder="Mission thread, contact insight…"
              />
              <label htmlFor="note-body" className="chat-window__note-label">
                Details
              </label>
              <textarea
                id="note-body"
                value={noteContent}
                onChange={(event) => setNoteContent(event.target.value)}
                placeholder="Capture context, follow-ups, or quick reminders."
                rows={6}
              />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
