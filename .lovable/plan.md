

## API Endpoints for Logo/Profile Picture Extraction + UI Rename

This plan adds two new API endpoints for external integration and renames the button text in the UI.

### Overview

We'll create two new API-secured edge functions that wrap the existing extraction capabilities, allowing external Lovable instances (or any external system) to extract logos/profile pictures via API calls.

### Changes

#### 1. Rename "Extract PFP" to "Extract Profile Picture" (UI)

**File: `src/components/InstagramIntelligenceSection.tsx`**

Change the button text from "Extract PFP" to "Extract Profile Picture" for better clarity.

```text
Before: "Extract PFP"
After:  "Extract Profile Picture"
```

---

#### 2. New API: Website Logo Extraction

**File: `supabase/functions/api-extract-logo/index.ts`** (new)

Creates a new edge function that:
- Authenticates requests via `x-api-key` header (validates against `CRM_API_KEY` secret)
- Accepts a `url` parameter (website URL)
- Calls the existing `extract-branding` function with `logoOnly: true`
- Returns the persisted logo URL

**Request:**
```json
POST /api-extract-logo
Headers: { "x-api-key": "your-crm-api-key" }
Body: { "url": "https://example.com" }
```

**Response:**
```json
{
  "success": true,
  "logo_url": "https://storage.url/brand-images/example-com/logo-123.png",
  "source_url": "https://example.com",
  "extracted_at": "2026-01-30T12:00:00.000Z"
}
```

---

#### 3. New API: Instagram Profile Picture Extraction

**File: `supabase/functions/api-extract-instagram-pfp/index.ts`** (new)

Creates a new edge function that:
- Authenticates requests via `x-api-key` header (validates against `CRM_API_KEY` secret)
- Accepts an `instagram_url` or `username` parameter
- Calls the existing `instagram-scraper` function with `profilePicOnly: true`
- Returns the persisted profile picture URL

**Request:**
```json
POST /api-extract-instagram-pfp
Headers: { "x-api-key": "your-crm-api-key" }
Body: { "instagram_url": "https://instagram.com/username" }
// OR
Body: { "username": "username" }
```

**Response:**
```json
{
  "success": true,
  "profile_pic_url": "https://storage.url/instagram-profile-pics/username_123.jpg",
  "username": "username",
  "extracted_at": "2026-01-30T12:00:00.000Z"
}
```

---

### Configuration Update

**File: `supabase/config.toml`**

Add the two new functions with `verify_jwt = false` (authentication handled in code via API key).

---

### Files Summary

| File | Action | Description |
|------|--------|-------------|
| `src/components/InstagramIntelligenceSection.tsx` | Modify | Rename "Extract PFP" → "Extract Profile Picture" |
| `supabase/functions/api-extract-logo/index.ts` | Create | API endpoint for website logo extraction |
| `supabase/functions/api-extract-instagram-pfp/index.ts` | Create | API endpoint for Instagram profile picture extraction |
| `supabase/config.toml` | Modify | Register both new edge functions |

---

### How to Call from Another Lovable Instance

From your other Lovable project, you can call these APIs like this:

```typescript
// In an edge function on the other project
const response = await fetch(
  'https://etscplmovnooalqfbzvy.supabase.co/functions/v1/api-extract-logo',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': Deno.env.get('CRM_API_KEY')!
    },
    body: JSON.stringify({ url: 'https://example.com' })
  }
);
const data = await response.json();
// data.logo_url contains the persisted logo URL
```

### Cost Reference

- **Website Logo Extraction**: ~$0.001-0.003 per extraction (Firecrawl branding format)
- **Instagram Profile Picture**: ~$0.0027 per extraction (Apify Instagram scraper)

