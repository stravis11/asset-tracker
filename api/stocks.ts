import type { VercelRequest, VercelResponse } from '@vercel/node';

const TWELVE_DATA_BASE = 'https://api.twelvedata.com';

const RETRY_DELAYS = [1000, 2000, 5000];
const MAX_RETRIES = 3;

async function fetchWithRetry(url: string, retries = MAX_RETRIES): Promise<any> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url);
      if (res.ok) return res.json();
      if (res.status === 429 && attempt < retries) {
        const retryAfter = res.headers.get('Retry-After') || '60';
        await sleep(Math.min(parseInt(retryAfter) * 1000, 15000));
        continue;
      }
      if (attempt < retries) {
        await sleep(RETRY_DELAYS[attempt] || 2000);
        continue;
      }
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    } catch (err) {
      if (attempt < retries) {
        await sleep(RETRY_DELAYS[attempt] || 2000);
        continue;
      }
      throw err;
    }
  }
  throw new Error('Unexpected error');
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const apiKey = process.env.TWELVE_DATA_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'Twelve Data API key not configured' });
  }

  const { symbol, interval, outputsize } = req.query;

  if (!symbol) {
    return res.status(400).json({ error: 'symbol is required' });
  }

  try {
    const url = `${TWELVE_DATA_BASE}/time_series?symbol=${symbol}&interval=${interval || '1day'}&outputsize=${outputsize || '365'}&apikey=${apiKey}`;
    const data = await fetchWithRetry(url);

    if (data.status === 'error') {
      return res.status(400).json({ error: data.message });
    }

    return res.status(200).json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}