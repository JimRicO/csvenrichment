export const clubEnrichmentDiagram = `flowchart TD
    A[Input: club_name / website / instagram] --> B{Has website<br/>or instagram?}
    B -- No --> C[Step 0: Perplexity Sonar<br/>Social Discovery]
    C --> D
    B -- Yes --> D[Step 1: Firecrawl<br/>Website Scrape]
    D --> E[Step 2: Firecrawl<br/>Branding Extraction<br/>colors + fonts]
    E --> F[Step 3: Apify<br/>Instagram Scrape<br/>up to 12 posts]
    F --> G[Step 4: Perplexity Sonar<br/>4 parallel research queries]
    G --> H[Step 5: Claude Sonnet 4.5<br/>AI Synthesis]
    H --> I[Step 6: Auto-trigger<br/>Visual DNA Analysis]
    I --> J[(enriched_clubs)]
`;

export const visualDnaDiagram = `flowchart TD
    A[Input: enriched_club_id<br/>or instagram_handle] --> B{Cached Instagram<br/>data exists?}
    B -- Yes --> D[Load latest_posts]
    B -- No --> C[Apify Instagram<br/>Profile Scraper]
    C --> D
    D --> E[Download up to 12 images<br/>Resize to 512px]
    E --> F[Upload to Supabase Storage<br/>instagram-post-images bucket]
    F --> G[Gemini 2.0 Flash<br/>Visual Analysis<br/>colors, style, composition]
    F --> H[Claude Sonnet 4.5<br/>Voice Analysis<br/>captions, tone, hashtags]
    G --> I[Claude Sonnet 4.5<br/>CTLT Style Matching]
    H --> J[Score Calculation<br/>Invisibility Score 0-100]
    I --> J
    J --> K[(enriched_clubs<br/>visual_dna, voice_dna,<br/>ctlt_matches, score)]
`;

export const peopleInstagramDiagram = `flowchart TD
    subgraph People[People Intelligence]
      P1[CSV Upload / API] --> P2[create-people-job]
      P2 --> P3[people-worker<br/>find + enrich]
      P3 --> P4[Perplexity + Claude<br/>dossier synthesis]
      P4 --> P5[(enriched_people<br/>42 columns)]
    end

    subgraph Instagram[Instagram Intelligence]
      I1[Handles input] --> I2[create-instagram-job]
      I2 --> I3[instagram-worker]
      I3 --> I4[Apify Profile Scraper]
      I4 --> I5[(instagram_company_data)]
    end

    P2 -.shared jobs table.-> J[(jobs / rows tables<br/>progress tracking)]
    I2 -.-> J
`;

export const crmApiDiagram = `sequenceDiagram
    participant CRM as External CRM
    participant API as api-* Edge Function
    participant Auth as x-api-key check
    participant Core as Worker / DB / AI
    participant DB as enriched_clubs / people

    CRM->>API: POST /api-analyze-visual-dna<br/>x-api-key + body
    API->>Auth: Validate against CRM_API_KEY
    Auth-->>API: OK
    API->>Core: invoke analyze-visual-dna
    Core->>Core: Scrape + Gemini + Claude + Score
    Core->>DB: UPDATE enriched_clubs
    Core-->>API: analysis result
    API->>DB: SELECT full record
    DB-->>API: visual_dna, voice_dna,<br/>ctlt_matches, media_urls...
    API-->>CRM: 200 JSON payload<br/>(no polling needed)
`;
