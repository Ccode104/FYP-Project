import 'dotenv/config';
import { startServer } from './server.js';

const port = Number(process.env.PORT || 5000);

startServer(port).catch((err) => {
  console.error('Failed to start server', err);
  process.exit(1);
});
