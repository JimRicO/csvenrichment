
# Create CRM API Endpoints for External Integration

## Overview

Create two secure API endpoints that allow another Lovable app to fetch clubs needing enrichment and push back enriched data. Both endpoints will be protected with API key authentication.

---

## New Edge Functions to Create

### 1. `api-get-clubs` - Fetch Clubs Needing Enrichment

**Purpose:** Returns a list of clubs that need enrichment data

**Endpoint:** `GET /api-get-clubs`

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `needs_enrichment` | boolean | If true, return only clubs missing key fields |
| `limit` | number | Max clubs to return (default: 50, max: 200) |
| `offset` | number | Pagination offset (default: 0) |

**Authentication:** Requires `x-api-key` header matching `CRM_API_KEY` secret

**Response:** JSON with clubs array containing id, club_name, website_url, instagram_handle, and all enriched fields (nulls indicate needs enrichment)

---

### 2. `api-update-clubs` - Push Enriched Data Back

**Purpose:** Receives enriched club data and updates the database

**Endpoint:** `POST /api-update-clubs`

**Request Body:**
```json
{
  "clubs": [
    {
      "id": "uuid-of-club",
      "perplexity_description": "...",
      "founder_info": "...",
      "founding_year": "2015",
      "recent_activities": [...],
      "perplexity_citations": [...]
    }
  ]
}
```

**Authentication:** Requires `x-api-key` header matching `CRM_API_KEY` secret

**Response:** JSON with success status and count of updated clubs

---

## Security Implementation

Both endpoints will:
1. Check for `x-api-key` header
2. Validate against `CRM_API_KEY` environment variable
3. Return 401 Unauthorized if invalid
4. Log all access attempts

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `supabase/functions/api-get-clubs/index.ts` | Create | GET endpoint for fetching clubs |
| `supabase/functions/api-update-clubs/index.ts` | Create | POST endpoint for updating clubs |
| `supabase/config.toml` | Modify | Add function configs with `verify_jwt = false` |

---

## Secret Required

A new secret `CRM_API_KEY` needs to be created. This key should be:
- Generated as a secure random string (e.g., 32+ characters)
- Shared securely with the other Lovable app
- Stored as a secret in both projects

---

## Integration Code for Other App

After implementation, the other Lovable app can integrate like this:

```typescript
const CRM_API_URL = "https://etscplmovnooalqfbzvy.supabase.co/functions/v1";
const API_KEY = Deno.env.get("CRM_API_KEY");

// Fetch clubs needing enrichment
const response = await fetch(
  `${CRM_API_URL}/api-get-clubs?needs_enrichment=true&limit=50`,
  { headers: { "x-api-key": API_KEY } }
);
const { clubs } = await response.json();

// After enrichment, push back
await fetch(`${CRM_API_URL}/api-update-clubs`, {
  method: "POST",
  headers: { 
    "x-api-key": API_KEY,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ clubs: enrichedClubs })
});
```

---

## Implementation Details

### api-get-clubs Logic

```text
1. Validate x-api-key header against CRM_API_KEY
2. Parse query parameters (needs_enrichment, limit, offset)
3. If needs_enrichment=true:
   - Query enriched_clubs WHERE perplexity_description IS NULL 
     OR founder_info IS NULL
4. Otherwise return all clubs
5. Apply limit/offset for pagination
6. Return JSON response with clubs array
```

### api-update-clubs Logic

```text
1. Validate x-api-key header against CRM_API_KEY
2. Parse request body with clubs array
3. For each club in array:
   - Validate required id field exists
   - Update enriched_clubs record with provided fields
4. Return success count and any errors
```

---

## Data Flow Diagram

```text
Other Lovable App                         This CRM
      │                                       │
      │  GET /api-get-clubs?needs_enrichment  │
      │ ─────────────────────────────────────►│
      │  (x-api-key: CRM_API_KEY)             │
      │                                       │
      │◄───────────────────────────────────── │
      │  { clubs: [...unenriched clubs] }     │
      │                                       │
      │  [Process & Enrich Data]              │
      │                                       │
      │  POST /api-update-clubs               │
      │ ─────────────────────────────────────►│
      │  { clubs: [...enriched data] }        │
      │                                       │
      │◄───────────────────────────────────── │
      │  { success: true, updated: 50 }       │
```
