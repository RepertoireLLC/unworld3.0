import { createApp } from './app';
import { config } from './config';

const app = createApp();

app.listen(config.port, () => {
  console.log(`Enclypse server running on port ${config.port}`);
});
