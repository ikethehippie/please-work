// api/ebay-sold.js
// Vercel function: returns up to 5 most-recent SOLD prices for a query from eBay Finding API.
export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const appId = process.env.EBAY_APP_ID; // eBay App ID (Client ID)
  if (!appId) return res.status(500).json({ error: 'Missing EBAY_APP_ID env var' });

  const q = String(req.query.q || '').trim();
  const site = String(req.query.site || 'US').toUpperCase();
  if (!q) return res.status(400).json({ error: 'Missing q' });

  // Build Finding API URL
  const params = new URLSearchParams({
    'OPERATION-NAME': 'findCompletedItems',
    'SERVICE-VERSION': '1.13.0',
    'SECURITY-APPNAME': appId,
    'RESPONSE-DATA-FORMAT': 'JSON',
    'REST-PAYLOAD': 'true',
    'GLOBAL-ID': site === 'US' ? 'EBAY-US' : 'EBAY-US',
    'keywords': q,
    'paginationInput.entriesPerPage': '20',
    'sortOrder': 'EndTimeSoonest'
  });

  // Sold only + Used condition
  params.append('itemFilter(0).name', 'SoldItemsOnly');
  params.append('itemFilter(0).value', 'true');
  params.append('itemFilter(1).name', 'Condition');
  params.append('itemFilter(1).value', 'Used');

  const url = `https://svcs.ebay.com/services/search/FindingService/v1?${params.toString()}`;

  try {
    const controller = new AbortController();
    const to = setTimeout(() => controller.abort(), 8000);
    const resp = await fetch(url, { signal: controller.signal });
    clearTimeout(to);

    if (!resp.ok) return res.status(resp.status).json({ error: `eBay HTTP ${resp.status}` });

    const data = await resp.json();
    const result = data?.findCompletedItemsResponse?.[0]?.searchResult?.[0];
    const itemsRaw = result?.item || [];

    // Map to { title, price } (USD only)
    const items = [];
    for (const it of itemsRaw) {
      try {
        const title = (it?.title?.[0] || '').toString();
        const priceNode = it?.sellingStatus?.[0]?.currentPrice?.[0];
        const currency = priceNode?._currencyId;
        const valueStr = priceNode?.__value__;
        if (!valueStr) continue;
        const val = parseFloat(valueStr);
        if (!isFinite(val)) continue;
        if (currency && currency !== 'USD') continue;
        items.push({ title, price: val });
      } catch {}
    }

    // Up to 5 most recent
    const trimmed = items.slice(0, 5);
    return res.status(200).json({ items: trimmed });
  } catch (e) {
    const msg = e?.name === 'AbortError' ? 'Upstream timeout' : (e?.message || 'Fetch error');
    return res.status(502).json({ error: msg });
  }
}