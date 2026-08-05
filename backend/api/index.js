import { createApp } from '../src/app.js';

// Vercel invokes this handler for every request matched by vercel.json.
// Database access is initialized by the existing repository operations; this
// module deliberately creates the application once and does not start a server.
const app = createApp();

export default app;
