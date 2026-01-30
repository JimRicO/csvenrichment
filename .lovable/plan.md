

# People Intelligence Module

## Overview

A new module to research individuals using Perplexity AI. Given a person's name and optional context (company, title, location), the system performs two web searches and synthesizes the results with **source URLs** so users can verify information.

---

## Source Verification (Simplified)

Each enriched field will have an associated source URL:

```text
biography: "John founded Acme Corp in 2015..."
biography_source: "https://forbes.com/article/john-smith-profile"
```

Users can click the URL to verify the information directly.

---

## Database Schema

### 1. `people_jobs` - Job tracking

| Column | Type | Description |
|--------|------|-------------|
| id | text PK | Job ID (e.g., `PEOPLE_1738...`) |
| project_id | text | Project identifier |
| status | text | pending, processing, completed, failed |
| total_rows | integer | Number of people to research |
| processed_rows | integer | Completed count |
| estimated_cost_usd | numeric | Running cost total |
| created_at | timestamptz | Job creation time |
| updated_at | timestamptz | Last update time |

### 2. `people_rows` - Processing queue

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | Row identifier |
| job_id | text FK | Reference to people_jobs |
| person_name | text | Full name to research |
| context | text | Optional context (company, title, etc.) |
| status | text | pending, processing, completed, failed |
| error_message | text | Error details if failed |
| created_at | timestamptz | Row creation time |

### 3. `enriched_people` - Research results with source URLs

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | Record identifier |
| job_id | text FK | Reference to people_jobs |
| people_row_id | uuid FK | Reference to people_rows |
| person_name | text | Full name |
| context | text | Original context provided |
| biography | text | Synthesized bio/background |
| biography_source | text | URL source for biography |
| current_role | text | Current job title |
| current_company | text | Current employer |
| role_source | text | URL source for role/company |
| previous_roles | jsonb | Array of `{title, company, years}` |
| education | jsonb | Array of `{degree, institution, year}` |
| notable_achievements | text | Key accomplishments |
| achievements_source | text | URL source for achievements |
| email | text | Email if found |
| email_source | text | URL source for email |
| phone | text | Phone if found |
| phone_source | text | URL source for phone |
| linkedin_url | text | LinkedIn profile URL |
| twitter_handle | text | Twitter/X handle |
| other_socials | jsonb | Other social media links |
| all_citations | jsonb | Complete list of all source URLs |
| confidence_score | text | low, medium, high |
| created_at | timestamptz | Record creation time |
| updated_at | timestamptz | Last update time |

---

## Edge Functions

### 1. `create-people-job`

Creates job, inserts rows into queue, triggers first worker invocation.

### 2. `people-worker`

1. Find next pending row
2. Run Perplexity search #1: "Who is [name] [context]?"
3. Run Perplexity search #2: "[name] contact email phone linkedin"
4. Claude synthesizes both responses with source attribution
5. Store in `enriched_people` with per-field source URLs
6. Update job progress

### 3. `get-people-status`

Returns job progress and recent results.

### 4. `download-people-csv`

Exports enriched data as CSV.

---

## Frontend Components

| Component | Purpose |
|-----------|---------|
| `PeopleIntelligenceSection.tsx` | Input form (name + context) |
| `PeopleJobsTable.tsx` | Job history with realtime updates |
| `EnrichedPeopleDialog.tsx` | Results with clickable source URLs |
| `ActivePeopleJobMonitor.tsx` | Live progress display |
| `usePeopleJobStatus.ts` | Polling hook for job status |

---

## UI Source Display

Each field shows a small link icon when a source exists:

```text
+------------------------------------------+
|  Biography                          [🔗] |
|  ---------------------------------------- |
|  John Smith is a serial entrepreneur...   |
+------------------------------------------+
```

Clicking the icon opens the source URL in a new tab.

---

## Files to Create

| File | Purpose |
|------|---------|
| `supabase/functions/create-people-job/index.ts` | Job creation |
| `supabase/functions/people-worker/index.ts` | Background processor |
| `supabase/functions/get-people-status/index.ts` | Status endpoint |
| `supabase/functions/download-people-csv/index.ts` | CSV export |
| `src/components/PeopleIntelligenceSection.tsx` | Input UI |
| `src/components/PeopleJobsTable.tsx` | Job history table |
| `src/components/EnrichedPeopleDialog.tsx` | Results viewer |
| `src/components/ActivePeopleJobMonitor.tsx` | Live monitor |
| `src/hooks/usePeopleJobStatus.ts` | Status hook |

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/config.toml` | Add new function configs |
| `src/pages/Index.tsx` | Add People Intelligence section |

---

## Cost Estimate

Per person: ~$0.014 (2x Perplexity + Claude synthesis)

---

## Implementation Order

1. Database: Create tables via migration
2. Edge Functions: create-people-job, people-worker, get-people-status
3. Frontend: PeopleIntelligenceSection + usePeopleJobStatus hook
4. Frontend: ActivePeopleJobMonitor
5. Frontend: PeopleJobsTable + EnrichedPeopleDialog
6. Edge Function: download-people-csv

