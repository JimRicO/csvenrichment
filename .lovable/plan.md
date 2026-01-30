

## Add Logo Extractor Button to Website Visual Identity Scraper

This plan adds a dedicated "Extract Logo" button that quickly extracts just the logo from a website using Firecrawl's branding engine.

### What Will Change

**Frontend (WebsiteBrandingScraper.tsx):**
- Add a new "Extract Logo" button next to the existing "Extract Identity" button
- Add state for loading and displaying the extracted logo separately
- Show the extracted logo in a prominent display area
- The logo extraction will be faster since it only focuses on the logo

**Backend (extract-branding/index.ts):**
- Add a `logoOnly` parameter option
- When `logoOnly` is true, still use the branding format but only process and return the logo image
- This keeps it simple by reusing the same Firecrawl call but filtering the response

### User Experience

You'll see two buttons next to the URL input:
- **Extract Identity** (existing): Full brand extraction (colors, fonts, images, etc.)
- **Extract Logo**: Quick logo-only extraction

When you click "Extract Logo":
1. It calls Firecrawl's branding format
2. Extracts and persists just the logo to storage
3. Displays the logo prominently

### Technical Details

**Frontend changes:**
```text
- Add state: isExtractingLogo, extractedLogo
- Add "Extract Logo" button with Image icon
- Pass { url, logoOnly: true } to edge function when extracting logo
- Display extracted logo in a dedicated section above the full branding results
```

**Backend changes:**
```text
- Accept logoOnly parameter from request body
- When logoOnly is true:
  - Still call Firecrawl with formats: ['branding']
  - Only process branding.images.logo (skip other images)
  - Return { logo: persistedLogoUrl } instead of full branding
- This avoids processing unnecessary data
```

### Files to Modify

| File | Change |
|------|--------|
| `src/components/WebsiteBrandingScraper.tsx` | Add "Extract Logo" button, loading state, and logo display section |
| `supabase/functions/extract-branding/index.ts` | Add `logoOnly` mode that returns just the logo |

