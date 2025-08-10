# Road to Riches Backend (Vercel)

Fetch recent **eBay US completed + sold** comps using the Finding API (`findCompletedItems`).
Returns up to the **5 most recent** sold prices (and titles) in USD. CORS enabled.

## Deploy
1) Create/import this folder as a Vercel project.
2) In **Settings → Environment Variables** set:
   - `EBAY_APP_ID` = your eBay **App ID (Client ID)** (Production)
3) Deploy.

## Test
Open:
```
https://<your-app>.vercel.app/api/ebay-sold?q=LaZBoy recliner&site=US
```
You should get JSON like:
```json
{ "items": [ { "title": "…", "price": 199.99 }, ... ] }
```

## Notes
- Filters to **US** (`GLOBAL-ID=EBAY-US`) and **SoldItemsOnly=true`.
- Adds `Condition=Used` by default.
- We return items (title + price) so the extension can apply extra filters.
