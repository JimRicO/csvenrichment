
# People Intelligence API Documentation for External Systems

## Overview

This document provides everything needed for an external system (CRM, dashboard, etc.) to integrate with the People Intelligence API. It includes endpoint specifications, data schemas, and a complete UI card template for rendering dossiers.

---

## Base URL

```text
https://etscplmovnooalqfbzvy.supabase.co/functions/v1
```

## Authentication

All requests require the `x-api-key` header with your CRM API key:

```text
x-api-key: YOUR_CRM_API_KEY
```

---

## API Endpoints

### 1. Create People Research Job

**Endpoint:** `POST /api-create-people-job`

Creates a research job for one or more people.

**Request (Single Person):**
```json
{
  "person_name": "John Smith",
  "context": "CEO at Acme Corp"
}
```

**Request (Bulk):**
```json
{
  "people": [
    { "person_name": "John Smith", "context": "CEO at Acme Corp" },
    { "person_name": "Jane Doe", "context": "CFO at TechCo" }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "job_id": "API_PEOPLE_1769740000000_abc123",
  "project_id": "api_project_1769740000000",
  "total_people": 2,
  "status_endpoint": "/api-get-people-status?job_id=API_PEOPLE_xxx",
  "results_endpoint": "/api-get-people?job_id=API_PEOPLE_xxx",
  "message": "People research job created with 2 person(s)"
}
```

---

### 2. Check Job Status

**Endpoint:** `GET /api-get-people-status?job_id=YOUR_JOB_ID`

Poll this endpoint to monitor research progress.

**Response:**
```json
{
  "job_id": "API_PEOPLE_xxx",
  "project_id": "api_project_xxx",
  "status": "processing",
  "total_rows": 5,
  "processed_rows": 3,
  "progress_percent": 60,
  "estimated_cost_usd": 0.30,
  "is_complete": false,
  "row_stats": {
    "pending": 2,
    "processing": 0,
    "completed": 3,
    "failed": 0
  }
}
```

**Polling Strategy:**
- Poll every 10-15 seconds
- Stop when `is_complete: true` or `status: "completed"`

---

### 3. Fetch Enriched People

**Endpoint:** `GET /api-get-people`

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `job_id` | string | Filter by specific job ID |
| `needs_enrichment` | boolean | If `true`, returns incomplete records only |
| `limit` | number | Max results (default: 50, max: 200) |
| `offset` | number | Pagination offset (default: 0) |

**Example:**
```text
GET /api-get-people?job_id=API_PEOPLE_xxx&limit=50
```

**Response:**
```json
{
  "people": [
    {
      "id": "uuid",
      "job_id": "API_PEOPLE_xxx",
      "person_name": "John Smith",
      "job_title": "Chief Executive Officer",
      "company": "Acme Corporation",
      "department": "Executive",
      "location": "San Francisco, CA",
      "biography": "John Smith is a seasoned technology executive...",
      "biography_source": "https://linkedin.com/in/johnsmith",
      "photo_url": "https://example.com/photo.jpg",
      "email": "john.smith@acme.com",
      "email_confidence": "pattern_based",
      "email_pattern": "firstname.lastname@domain",
      "phone": "+1-555-123-4567",
      "linkedin_url": "https://linkedin.com/in/johnsmith",
      "twitter_handle": "@johnsmith",
      "website": "https://johnsmith.com",
      "previous_roles": [
        { "title": "VP of Engineering", "company": "TechCo", "years": "2018-2022" },
        { "title": "Senior Engineer", "company": "StartupXYZ", "years": "2015-2018" }
      ],
      "education": [
        { "degree": "MBA", "institution": "Stanford GSB", "year": "2015" },
        { "degree": "BS Computer Science", "institution": "MIT", "year": "2010" }
      ],
      "recent_news": [
        {
          "headline": "Acme Corp Raises $50M Series C",
          "source": "TechCrunch",
          "date": "2024-01-15",
          "url": "https://techcrunch.com/..."
        }
      ],
      "notable_achievements": "Led company through IPO...",
      "communication_style": "Direct and data-driven communicator...",
      "key_interests": ["AI/ML", "Climate Tech", "Education"],
      "conversation_starters": ["Recent acquisition strategy", "Stanford MBA experience"],
      "quotes": ["Innovation requires calculated risk..."],
      "all_citations": ["https://linkedin.com/...", "https://forbes.com/..."],
      "confidence_score": "high",
      "research_summary": "Comprehensive profile with 12 sources...",
      "created_at": "2024-01-20T10:30:00Z",
      "updated_at": "2024-01-20T10:35:00Z"
    }
  ],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "returned": 1
  }
}
```

---

### 4. Update People Records

**Endpoint:** `POST /api-update-people`

Update enriched person records with new data.

**Request:**
```json
{
  "people": [
    {
      "id": "uuid-of-person-record",
      "email": "updated@email.com",
      "phone": "+1-555-999-8888",
      "biography": "Updated biography text..."
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "updated": 1,
  "failed": 0,
  "results": [
    { "id": "uuid", "success": true }
  ]
}
```

---

## Complete Data Schema

### EnrichedPerson Object

```typescript
interface EnrichedPerson {
  // Core Identity
  id: string;                          // UUID
  job_id: string;                      // Research job ID
  people_row_id: string;               // Source row ID
  person_name: string;                 // Full name
  context: string | null;              // Original search context
  aliases: string[];                   // Alternative names

  // Photo
  photo_url: string | null;            // Profile photo URL

  // Current Role
  job_title: string | null;            // Current job title
  company: string | null;              // Current company
  department: string | null;           // Department/Division
  location: string | null;             // City, State/Country
  start_date: string | null;           // Role start date
  reports_to: string | null;           // Manager name
  role_source: string | null;          // Source URL for role

  // Biography
  biography: string | null;            // 3-5 paragraph narrative
  biography_source: string | null;     // Source URL

  // Career History
  previous_roles: PreviousRole[];      // Array of past positions
  career_highlights: string[];         // Key achievements

  // Education
  education: Education[];              // Array of degrees

  // Achievements
  notable_achievements: string | null; // Summary of achievements
  achievements_source: string | null;  // Source URL

  // Contact Information
  email: string | null;                // Work email
  email_confidence: string | null;     // "verified" | "pattern_based" | "not_found"
  email_pattern: string | null;        // e.g., "firstname.lastname@domain"
  email_source: string | null;         // Source URL
  phone: string | null;                // Phone number
  phone_source: string | null;         // Source URL

  // Social Profiles
  linkedin_url: string | null;         // LinkedIn profile URL
  twitter_handle: string | null;       // Twitter @handle
  website: string | null;              // Personal website
  other_socials: Record<string, string>; // { "github": "url", "medium": "url" }
  notable_content: NotableContent[];   // Published articles, talks

  // Recent News
  recent_news: NewsItem[];             // Recent mentions/articles

  // Sales Insights
  communication_style: string | null;  // How they prefer to communicate
  key_interests: string[];             // Professional interests
  conversation_starters: string[];     // Topics to open with
  quotes: string[];                    // Notable quotes

  // Research Quality
  all_citations: string[];             // All source URLs
  confidence_score: string | null;     // "high" | "medium" | "low"
  research_summary: string | null;     // Summary of research quality

  // Timestamps
  created_at: string;                  // ISO timestamp
  updated_at: string;                  // ISO timestamp
}

interface PreviousRole {
  title: string;
  company: string;
  years?: string;       // e.g., "2018-2022"
}

interface Education {
  degree: string;
  institution: string;
  year?: string;
  field?: string;
}

interface NewsItem {
  headline: string;
  source: string;       // Publication name
  date: string;
  url: string;
}

interface NotableContent {
  title?: string;
  url?: string;
}
// Note: notable_content can be string[] or NotableContent[]
// Always check typeof before rendering
```

---

## UI Card Template (React/TypeScript)

A complete card component for rendering person dossiers:

```tsx
import React from 'react';

interface PersonCardProps {
  person: EnrichedPerson;
}

const PersonCard: React.FC<PersonCardProps> = ({ person }) => {
  // Helper for confidence badge colors
  const getConfidenceColor = (score: string | null) => {
    switch (score) {
      case 'high': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
      {/* Header with Photo */}
      <div className="flex items-start gap-4">
        {person.photo_url ? (
          <img 
            src={person.photo_url} 
            alt={person.person_name}
            className="w-20 h-20 rounded-full object-cover"
          />
        ) : (
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <span className="text-2xl font-bold text-white">
              {person.person_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </span>
          </div>
        )}
        
        <div className="flex-1">
          <h2 className="text-xl font-bold">{person.person_name}</h2>
          {person.aliases?.length > 0 && (
            <p className="text-sm text-gray-500">
              Also known as: {person.aliases.join(', ')}
            </p>
          )}
          
          {/* Current Role */}
          {(person.job_title || person.company) && (
            <p className="text-gray-700 mt-1">
              {person.job_title}
              {person.job_title && person.company && ' at '}
              <span className="font-medium">{person.company}</span>
            </p>
          )}
          
          {/* Location & Department */}
          <div className="flex gap-3 text-sm text-gray-500 mt-1">
            {person.department && <span>📁 {person.department}</span>}
            {person.location && <span>📍 {person.location}</span>}
            {person.start_date && <span>📅 Since {person.start_date}</span>}
          </div>
        </div>
        
        {/* Confidence Badge */}
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getConfidenceColor(person.confidence_score)}`}>
          {person.confidence_score || 'Unknown'} confidence
        </span>
      </div>

      {/* Research Summary */}
      {person.research_summary && (
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-medium text-blue-900 mb-1">Research Summary</h3>
          <p className="text-sm text-blue-800">{person.research_summary}</p>
          <p className="text-xs text-blue-600 mt-1">
            {person.all_citations?.length || 0} sources verified
          </p>
        </div>
      )}

      {/* Biography */}
      {person.biography && (
        <div>
          <h3 className="font-medium mb-2 flex items-center gap-2">
            👤 Biography
            {person.biography_source && (
              <a href={person.biography_source} target="_blank" className="text-blue-500 text-sm">
                ↗
              </a>
            )}
          </h3>
          <p className="text-gray-700 whitespace-pre-wrap">{person.biography}</p>
        </div>
      )}

      {/* Contact Grid */}
      <div className="grid grid-cols-2 gap-3">
        {person.email && (
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-xs text-gray-500">Email</p>
            <a href={`mailto:${person.email}`} className="text-blue-600 hover:underline">
              {person.email}
            </a>
            {person.email_confidence && (
              <span className="text-xs text-gray-400 ml-2">
                ({person.email_confidence.replace('_', ' ')})
              </span>
            )}
          </div>
        )}
        
        {person.phone && (
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-xs text-gray-500">Phone</p>
            <a href={`tel:${person.phone}`} className="text-blue-600 hover:underline">
              {person.phone}
            </a>
          </div>
        )}
        
        {person.linkedin_url && (
          <a href={person.linkedin_url} target="_blank" className="bg-blue-50 p-3 rounded-lg hover:bg-blue-100">
            <p className="text-xs text-gray-500">LinkedIn</p>
            <span className="text-blue-600">View Profile →</span>
          </a>
        )}
        
        {person.twitter_handle && (
          <a href={`https://twitter.com/${person.twitter_handle.replace('@', '')}`} target="_blank" className="bg-sky-50 p-3 rounded-lg hover:bg-sky-100">
            <p className="text-xs text-gray-500">Twitter</p>
            <span className="text-sky-600">{person.twitter_handle}</span>
          </a>
        )}
        
        {person.website && (
          <a href={person.website} target="_blank" className="bg-gray-50 p-3 rounded-lg hover:bg-gray-100">
            <p className="text-xs text-gray-500">Website</p>
            <span className="text-gray-600">Visit →</span>
          </a>
        )}
      </div>

      {/* Recent News */}
      {person.recent_news?.length > 0 && (
        <div>
          <h3 className="font-medium mb-2">📰 Recent News</h3>
          <div className="space-y-2">
            {person.recent_news.map((news, idx) => (
              <a 
                key={idx}
                href={news.url}
                target="_blank"
                className="block bg-gray-50 p-3 rounded-lg hover:bg-gray-100"
              >
                <p className="font-medium text-sm">{news.headline}</p>
                <p className="text-xs text-gray-500">
                  {news.source} • {news.date}
                </p>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Sales Insights */}
      {(person.communication_style || person.key_interests?.length > 0) && (
        <div className="bg-purple-50 p-4 rounded-lg space-y-3">
          <h3 className="font-medium text-purple-900">💡 Sales Insights</h3>
          
          {person.communication_style && (
            <div>
              <p className="text-xs text-purple-700 uppercase">Communication Style</p>
              <p className="text-sm text-purple-900">{person.communication_style}</p>
            </div>
          )}
          
          {person.key_interests?.length > 0 && (
            <div>
              <p className="text-xs text-purple-700 uppercase">Key Interests</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {person.key_interests.map((interest, idx) => (
                  <span key={idx} className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">
                    {interest}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {person.conversation_starters?.length > 0 && (
            <div>
              <p className="text-xs text-purple-700 uppercase">Conversation Starters</p>
              <ul className="text-sm text-purple-900 list-disc list-inside mt-1">
                {person.conversation_starters.map((starter, idx) => (
                  <li key={idx}>{starter}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Career History */}
      {person.previous_roles?.length > 0 && (
        <div>
          <h3 className="font-medium mb-2">💼 Career History</h3>
          <div className="space-y-2">
            {person.previous_roles.map((role, idx) => (
              <div key={idx} className="flex items-start gap-3 pl-2 border-l-2 border-gray-200">
                <div>
                  <p className="font-medium text-sm">{role.title}</p>
                  <p className="text-sm text-gray-600">{role.company}</p>
                  {role.years && <p className="text-xs text-gray-400">{role.years}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Education */}
      {person.education?.length > 0 && (
        <div>
          <h3 className="font-medium mb-2">🎓 Education</h3>
          <div className="flex flex-wrap gap-2">
            {person.education.map((edu, idx) => (
              <span key={idx} className="px-3 py-1.5 bg-gray-100 rounded-lg text-sm">
                {edu.degree}{edu.field ? ` in ${edu.field}` : ''} - {edu.institution}
                {edu.year && ` (${edu.year})`}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Notable Quotes */}
      {person.quotes?.length > 0 && (
        <div>
          <h3 className="font-medium mb-2">💬 Notable Quotes</h3>
          <div className="space-y-2">
            {person.quotes.map((quote, idx) => (
              <blockquote key={idx} className="border-l-4 border-gray-300 pl-4 italic text-gray-600">
                "{quote}"
              </blockquote>
            ))}
          </div>
        </div>
      )}

      {/* Sources */}
      {person.all_citations?.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
            View all {person.all_citations.length} sources
          </summary>
          <ul className="mt-2 space-y-1 text-gray-500">
            {person.all_citations.map((url, idx) => (
              <li key={idx} className="truncate">
                <a href={url} target="_blank" className="hover:text-blue-600">
                  {url}
                </a>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
};

export default PersonCard;
```

---

## Complete Integration Example

```typescript
const API_BASE = 'https://etscplmovnooalqfbzvy.supabase.co/functions/v1';
const API_KEY = 'your-crm-api-key';

// 1. Create a research job
async function createPeopleJob(people: { person_name: string; context?: string }[]) {
  const response = await fetch(`${API_BASE}/api-create-people-job`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY
    },
    body: JSON.stringify({ people })
  });
  return response.json();
}

// 2. Poll for status
async function pollJobStatus(jobId: string): Promise<void> {
  while (true) {
    const response = await fetch(
      `${API_BASE}/api-get-people-status?job_id=${jobId}`,
      { headers: { 'x-api-key': API_KEY } }
    );
    const status = await response.json();
    
    console.log(`Progress: ${status.processed_rows}/${status.total_rows}`);
    
    if (status.is_complete) break;
    
    await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10s
  }
}

// 3. Fetch results
async function fetchPeople(jobId: string) {
  const response = await fetch(
    `${API_BASE}/api-get-people?job_id=${jobId}`,
    { headers: { 'x-api-key': API_KEY } }
  );
  const data = await response.json();
  return data.people;
}

// Full workflow
async function researchPeople() {
  // Start job
  const { job_id } = await createPeopleJob([
    { person_name: 'Elon Musk', context: 'CEO Tesla, SpaceX' },
    { person_name: 'Satya Nadella', context: 'CEO Microsoft' }
  ]);
  
  console.log(`Job created: ${job_id}`);
  
  // Wait for completion
  await pollJobStatus(job_id);
  
  // Get results
  const people = await fetchPeople(job_id);
  
  // Render cards
  people.forEach(person => {
    console.log(`Dossier: ${person.person_name}`);
    console.log(`  Title: ${person.job_title} at ${person.company}`);
    console.log(`  Email: ${person.email} (${person.email_confidence})`);
    console.log(`  LinkedIn: ${person.linkedin_url}`);
    console.log(`  Sources: ${person.all_citations?.length || 0}`);
  });
}
```

---

## Cost Estimates

| Item | Cost |
|------|------|
| Per person researched | ~$0.10 - $0.15 |
| API calls | Unlimited (rate limited) |
| Storage | Included |

---

## Error Handling

All endpoints return consistent error responses:

```json
{
  "error": "Error message here",
  "details": "Additional context if available"
}
```

| Status Code | Meaning |
|-------------|---------|
| 401 | Invalid or missing API key |
| 400 | Bad request (missing parameters) |
| 404 | Resource not found |
| 500 | Server error |
