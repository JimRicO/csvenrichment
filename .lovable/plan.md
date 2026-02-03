# CRM Integration API Documentation

## Overview

This document provides the complete API specification for external CRM systems to integrate with the Club & People Intelligence platform.

---

## Authentication

All API endpoints require authentication via the `x-api-key` header:

```
x-api-key: YOUR_CRM_API_KEY
```

---

## Club Intelligence API

### Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api-create-enrichment-job` | POST | Create a new club enrichment job |
| `/api-get-enrichment-status` | GET | Check job status |
| `/api-get-clubs` | GET | Retrieve enriched club data |
| `/api-update-clubs` | POST | Update club records |

---

### `api-get-clubs` Response Schema

Returns **30 fields** per club:

```typescript
interface EnrichedClub {
  // === IDENTIFIERS ===
  id: string;                          // UUID
  job_id: string;                      // Enrichment job ID
  enrichment_row_id: string;           // Source row ID
  
  // === BASIC INFO ===
  club_name: string;                   // Club/business name
  website_url: string | null;          // Primary website
  description: string | null;          // AI-generated description (2-3 sentences)
  
  // === CONTACT INFO ===
  email: string | null;                // Primary email
  phone: string | null;                // Primary phone
  address: string | null;              // Physical address
  
  // === SOCIAL MEDIA ===
  instagram_handle: string | null;     // Instagram handle (e.g., "@clubname")
  instagram_url: string | null;        // Full Instagram URL (e.g., "https://instagram.com/clubname")
  facebook_url: string | null;         // Facebook page URL
  twitter_handle: string | null;       // Twitter/X handle or URL
  linkedin_url: string | null;         // LinkedIn company page URL
  
  // === INSTAGRAM METRICS ===
  instagram_followers: number | null;  // Follower count
  instagram_bio: string | null;        // Profile bio text
  instagram_profile_pic_url: string | null; // Persisted profile picture URL
  
  // === VISUAL BRANDING ===
  logo_storage_url: string | null;     // Persisted logo URL
  color_palette: {                     // Brand colors
    primary?: string;
    secondary?: string;
    accent?: string;
    background?: string;
    text?: string;
  } | null;
  fonts: {                             // Typography
    primary?: string;
    heading?: string;
    list?: string[];
  } | null;
  
  // === AI SYNTHESIS ===
  attitude: string | null;             // Brand personality/voice analysis
  aesthetics: string | null;           // Visual style analysis
  
  // === RESEARCH DATA (Perplexity) ===
  perplexity_description: string | null;  // Web-researched business description
  founder_info: string | null;            // Founder background & history
  founding_year: string | null;           // Year founded (e.g., "2015")
  recent_activities: Array<{              // Recent news/events
    title: string;
    date?: string;
  }>;
  perplexity_citations: string[];         // Source URLs for research
  
  // === LEADERSHIP ===
  key_people: Array<{                     // Owners, executives, key staff
    name: string;
    role: string;                         // e.g., "Owner", "CEO", "General Manager"
    context: string;                      // Background info (1-2 sentences)
  }>;
  
  // === RAW DATA ===
  raw_branding_data: object | null;       // Full Firecrawl branding response
  raw_instagram_data: object | null;      // Full Apify Instagram response
  scraped_content: string | null;         // Website markdown content
  
  // === METADATA ===
  created_at: string;                     // ISO timestamp
  updated_at: string;                     // ISO timestamp
}
```

---

### Query Parameters for `api-get-clubs`

| Parameter | Type | Description |
|-----------|------|-------------|
| `job_id` | string | Filter by specific job ID |
| `needs_enrichment` | boolean | Filter clubs missing research data |
| `limit` | number | Max results (default: 50, max: 200) |
| `offset` | number | Pagination offset |

**Example Request:**
```bash
curl -X GET \
  "https://etscplmovnooalqfbzvy.supabase.co/functions/v1/api-get-clubs?job_id=API_ENRICH_123&limit=10" \
  -H "x-api-key: YOUR_API_KEY"
```

**Example Response:**
```json
{
  "clubs": [
    {
      "id": "abc123",
      "club_name": "Elite Fitness Club",
      "website_url": "https://elitefitness.com",
      "instagram_handle": "@elitefitness",
      "instagram_url": "https://instagram.com/elitefitness",
      "facebook_url": "https://facebook.com/elitefitness",
      "twitter_handle": "@elitefitness",
      "linkedin_url": "https://linkedin.com/company/elite-fitness",
      "instagram_followers": 15000,
      "instagram_bio": "Premium fitness experience since 2010",
      "logo_storage_url": "https://..../logo.png",
      "key_people": [
        {
          "name": "John Smith",
          "role": "Founder & CEO",
          "context": "Former Olympic athlete with 20 years in fitness industry"
        }
      ],
      "founding_year": "2010",
      "perplexity_description": "Elite Fitness Club is a premium gym chain...",
      "recent_activities": [
        {"title": "Opened 5th location in downtown", "date": "January 2025"}
      ]
    }
  ],
  "pagination": {
    "limit": 10,
    "offset": 0,
    "returned": 1
  }
}
```

---

### `api-create-enrichment-job` Request

**Single Club:**
```json
{
  "club_name": "Fitness Club",
  "website_url": "https://example.com",
  "instagram_handle": "@fitnessclub"
}
```

**Bulk Clubs:**
```json
{
  "clubs": [
    {"club_name": "Club 1", "website_url": "https://club1.com"},
    {"club_name": "Club 2", "website_url": "https://club2.com", "instagram_handle": "@club2"}
  ]
}
```

---

## People Intelligence API

### Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api-create-people-job` | POST | Create person research job |
| `/api-get-people-status` | GET | Check job status |
| `/api-get-people` | GET | Retrieve enriched person data |
| `/api-update-people` | POST | Update person records |

---

### `api-get-people` Response Schema

Returns **42 fields** per person. See existing documentation for full schema.

---

## Quick Extraction APIs

### `api-extract-logo`

Extract and persist a website logo.

```bash
POST /api-extract-logo
{
  "website_url": "https://example.com"
}
```

**Response:**
```json
{
  "success": true,
  "logo_url": "https://..../persisted-logo.png"
}
```

---

### `api-extract-instagram-pfp`

Extract and persist an Instagram profile picture.

```bash
POST /api-extract-instagram-pfp
{
  "instagram_handle": "@username"
}
```

**Response:**
```json
{
  "success": true,
  "profile_pic_url": "https://..../persisted-pfp.jpg"
}
```

---

## TypeScript Utilities

### Parse Key People

```typescript
interface KeyPerson {
  name: string;
  role: string;
  context: string;
}

function parseKeyPeople(keyPeople: unknown): KeyPerson[] {
  if (!keyPeople) return [];
  
  let parsed = keyPeople;
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return [];
    }
  }
  
  if (!Array.isArray(parsed)) return [];
  
  return parsed.filter(
    (p): p is KeyPerson =>
      typeof p === 'object' &&
      p !== null &&
      typeof p.name === 'string' &&
      typeof p.role === 'string'
  );
}
```

### Parse Enriched Club

```typescript
function parseEnrichedClub(raw: any): EnrichedClub {
  return {
    ...raw,
    key_people: parseKeyPeople(raw.key_people),
    recent_activities: Array.isArray(raw.recent_activities) ? raw.recent_activities : [],
    color_palette: typeof raw.color_palette === 'object' ? raw.color_palette : {},
    fonts: typeof raw.fonts === 'object' ? raw.fonts : {},
    perplexity_citations: Array.isArray(raw.perplexity_citations) ? raw.perplexity_citations : []
  };
}
```

---

## Rate Limits

- Enrichment jobs: 2 second delay between worker calls
- API calls: Standard Supabase limits apply

---

## Changelog

**2025-02-03**
- Added social media fields: `instagram_url`, `facebook_url`, `twitter_handle`, `linkedin_url`
- Total fields per club increased from 26 to 30
