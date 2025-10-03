import { Router } from 'express';
import { z } from 'zod';
import { storeEncryptedMessage, getConversationMessages } from '../services/messageService.js';

const sendSchema = z.object({
  conversationId: z.string(),
  senderId: z.string(),
  envelope: z.string(),
  payloadBase64: z.string(),
  mood: z.enum(['joy', 'fear', 'hope', 'pain', 'neutral']).optional(),
  weight: z.number().int().optional()
});

export const messageRouter = Router();

messageRouter.post('/', async (req, res) => {
  const parse = sendSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: parse.error.flatten() });
  }

  const payload = Buffer.from(parse.data.payloadBase64, 'base64');
  const stored = await storeEncryptedMessage({
    conversationId: parse.data.conversationId,
    senderId: parse.data.senderId,
    envelope: parse.data.envelope,
    payload,
    mood: parse.data.mood,
    weight: parse.data.weight
  });

  res.status(201).json(stored);
});

messageRouter.get('/:conversationId', (req, res) => {
  const messages = getConversationMessages(req.params.conversationId);
  res.json(messages);
});
