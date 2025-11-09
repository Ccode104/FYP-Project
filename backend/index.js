import 'dotenv/config';
import { startServer } from './server.js';

const PORT = process.env.PORT || 4000;

// Start the server using the full server configuration
startServer(PORT).catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
