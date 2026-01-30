
# People Intelligence API Integration

## Overview

Add a secure external API integration for the People Intelligence module, mirroring the existing Club Intelligence API pattern. This enables CRM systems and external integrations to programmatically research individuals.

## API Endpoints to Create

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `api-get-people` | GET | Fetch enriched people records with filtering |
| `api-create-people-job` | POST | Create bulk people research jobs |
| `api-get-people-status` | GET | Check job progress and status |
| `api-update-people` | POST | Update enriched person records |

All endpoints secured via `x-api-key` header validated against the existing `CRM_API_KEY` secret.

## Technical Implementation

### 1. `api-get-people` Edge Function

Fetch enriched people with optional filtering:

```text
GET /api-get-people
Query params:
  - job_id (optional): Filter by specific job
  - needs_enrichment=true (optional): Return pending rows
  - limit (default: 50, max: 200)
  - offset (default: 0)

Response:
{
  "people": [...],
  "pagination": { "limit": 50, "offset": 0, "returned": 25 }
}
```

Returns all 42 columns from `enriched_people` including: identity, biography, career history, education, contact info, social profiles, recent news, and sales insights.

### 2. `api-create-people-job` Edge Function

Create research jobs programmatically:

```text
POST /api-create-people-job
Body (single):
  { "person_name": "John Smith", "context": "CEO at Acme Corp" }

Body (bulk):
  { "people": [{ "person_name": "...", "context": "..." }, ...] }

Response:
{
  "success": true,
  "job_id": "API_PEOPLE_xxx",
  "total_people": 5,
  "status_endpoint": "/api-get-people-status?job_id=xxx",
  "results_endpoint": "/api-get-people?job_id=xxx"
}
```

Jobs created via API will have `API_PEOPLE_` prefix for identification.

### 3. `api-get-people-status` Edge Function

Check job progress:

```text
GET /api-get-people-status?job_id=API_PEOPLE_xxx

Response:
{
  "job_id": "API_PEOPLE_xxx",
  "status": "processing",
  "total_rows": 10,
  "processed_rows": 4,
  "progress_percent": 40,
  "estimated_cost_usd": 0.40,
  "row_stats": { "pending": 6, "processing": 0, "completed": 4, "failed": 0 },
  "is_complete": false
}
```

### 4. `api-update-people` Edge Function

Update enriched person records externally:

```text
POST /api-update-people
Body:
{
  "people": [
    {
      "id": "uuid-here",
      "biography": "Updated bio...",
      "email": "new@email.com",
      "linkedin_url": "https://linkedin.com/in/..."
    }
  ]
}

Response:
{
  "success": true,
  "updated": 3,
  "failed": 0
}
```

Updatable fields: All 42 columns in `enriched_people` table.

## Configuration Updates

Add to `supabase/config.toml`:

```toml
[functions.api-get-people]
verify_jwt = false

[functions.api-create-people-job]
verify_jwt = false

[functions.api-get-people-status]
verify_jwt = false

[functions.api-update-people]
verify_jwt = false
```

## Security

- All endpoints validate `x-api-key` header against `CRM_API_KEY` secret (already configured)
- Returns 401 Unauthorized for missing/invalid keys
- Logs all unauthorized access attempts
- Uses service role key for database operations

## Files to Create

| File | Description |
|------|-------------|
| `supabase/functions/api-get-people/index.ts` | Fetch enriched people |
| `supabase/functions/api-create-people-job/index.ts` | Create research jobs |
| `supabase/functions/api-get-people-status/index.ts` | Check job status |
| `supabase/functions/api-update-people/index.ts` | Update people records |

## Files to Modify

| File | Change |
|------|--------|
| `supabase/config.toml` | Add 4 new function configurations |

## API Usage Examples

**Create a single person research job:**
```bash
curl -X POST https://etscplmovnooalqfbzvy.supabase.co/functions/v1/api-create-people-job \
  -H "x-api-key: YOUR_CRM_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"person_name": "Elon Musk", "context": "CEO Tesla, SpaceX"}'
```

**Check job status:**
```bash
curl "https://etscplmovnooalqfbzvy.supabase.co/functions/v1/api-get-people-status?job_id=API_PEOPLE_xxx" \
  -H "x-api-key: YOUR_CRM_API_KEY"
```

**Fetch results:**
```bash
curl "https://etscplmovnooalqfbzvy.supabase.co/functions/v1/api-get-people?job_id=API_PEOPLE_xxx" \
  -H "x-api-key: YOUR_CRM_API_KEY"
```

## Integration with UI

Jobs created via API will appear in the People Intelligence jobs table with an "API" badge, just like enrichment jobs.
