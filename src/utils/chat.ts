export const createChatId = (userId1: string, userId2: string) =>
  [userId1, userId2].sort().join('::');

export const formatTimestamp = (value: number) => {
  const date = new Date(value);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export const generateMessageId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `msg_${Date.now()}_${Math.random().toString(16).slice(2)}`;
