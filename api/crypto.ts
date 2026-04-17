import type { VercelRequest, VercelResponse } from '@vercel/node';

const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';

const RETRY_DELAYS = [1000, 2000, 5000];
const MAX_RETRIES = 3;

async function fetchWithRetry(url: string, retries = MAX_RETRIES): Promise<any> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url);
      if (res.ok) return res.json();
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
  const apiKey = process.env.COINGECKO_API_KEY;
  const { ids, vs_currencies, include_24h_change, days, interval, coinId } = req.query;

  if (!apiKey) {
    return res.status(500).json({ error: 'CoinGecko API key not configured' });
  }

  try {
    let url: string;

    if (coinId) {
      url = `${COINGECKO_BASE}/coins/${coinId}/market_chart?vs_currency=usd&days=${days || 30}&interval=${interval || 'daily'}&x_cg_demo_api_key=${apiKey}`;
    } else {
      url = `${COINGECKO_BASE}/simple/price?ids=${ids}&vs_currencies=${vs_currencies || 'usd'}&include_24h_change=${include_24h_change !== 'false' ? 'true' : 'false'}&x_cg_demo_api_key=${apiKey}`;
    }

    const data = await fetchWithRetry(url);
    return res.status(200).json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}