import express from 'express';
import cors from 'cors';
import { DataStore } from './data/store';
import { createAuthRouter } from './routes/auth';
import { createAuthMiddleware } from './middleware/auth';
import { createUsersRouter } from './routes/users';
import { createFriendsRouter } from './routes/friends';
import { createChatsRouter } from './routes/chats';
import { createStoriesRouter } from './routes/stories';

const app = express();
const store = new DataStore();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '5mb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', createAuthRouter(store));

const authMiddleware = createAuthMiddleware(store);

app.use('/api/users', authMiddleware, createUsersRouter(store));
app.use('/api/friends', authMiddleware, createFriendsRouter(store));
app.use('/api/chats', authMiddleware, createChatsRouter(store));
app.use('/api/stories', authMiddleware, createStoriesRouter(store));

const port = Number(process.env.PORT) || 4000;
app.listen(port, () => {
  console.log(`Enclypse API ready on http://localhost:${port}`);
});
