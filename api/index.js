let appPromise;

const loadApp = async () => {
  if (!appPromise) {
    appPromise = import('../backend/src/app.js').then(({ createApp }) => createApp());
  }
  return appPromise;
};

export default async function handler(req, res) {
  try {
    const app = await loadApp();
    return app(req, res);
  } catch (error) {
    console.error('Vercel API initialization failed:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: { message: 'API server initialization failed. Check the Vercel Function Logs.' } }));
  }
}
