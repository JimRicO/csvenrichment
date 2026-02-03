

# Fix: Instagram Links Not Extracted from Website Footers

## Problem Identified

The `enrichment-worker` is using `onlyMainContent: true` in the Firecrawl scrape request, which explicitly **excludes footers and headers** - exactly where Instagram and other social media links are typically located.

This was working in the bulk `scraper-worker` because it correctly uses:
- `onlyMainContent: false` (includes footer/header)
- `formats: ['markdown', 'links']` (extracts links separately)

## Current Code (Broken)

In `supabase/functions/enrichment-worker/index.ts`, lines 382-395:

```javascript
const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
  method: 'POST',
  headers: {...},
  body: JSON.stringify({
    url: row.website_url,
    formats: ['markdown'],        // ❌ Missing 'links' format
    onlyMainContent: true,        // ❌ EXCLUDES footers/headers!
    waitFor: 2000
  }),
});
```

## Solution

Change the Firecrawl request in Step 1 to:
1. Set `onlyMainContent: false` to capture full page including footer
2. Add `'links'` format to extract all URLs separately
3. Extract social links from the returned links array
4. Add discovered social links to the content sent to Claude for analysis

## Changes Required

### File: `supabase/functions/enrichment-worker/index.ts`

**1. Update Step 1 Firecrawl request (line ~389-394)**

Change from:
```javascript
formats: ['markdown'],
onlyMainContent: true,
```

To:
```javascript
formats: ['markdown', 'links'],
onlyMainContent: false,
```

**2. Capture links from response (after line ~399)**

Add extraction of the links array:
```javascript
const discoveredLinks = scrapeData?.data?.links || [];
```

**3. Extract social links from discovered links (after line ~401)**

Add social link extraction logic:
```javascript
const socialPatterns = [
  /instagram\.com/i,
  /facebook\.com/i,
  /linkedin\.com/i,
  /twitter\.com|x\.com/i,
];

const socialLinksFromScrape = discoveredLinks.filter(link => 
  socialPatterns.some(pattern => pattern.test(link))
);

// Extract Instagram handle from scraped links if not already discovered
if (!row.instagram_handle && !discoveredSocial.instagram_handle) {
  for (const link of socialLinksFromScrape) {
    const igMatch = link.match(/instagram\.com\/([^\/?]+)/i);
    if (igMatch && igMatch[1] !== 'p' && igMatch[1] !== 'reel') {
      row.instagram_handle = `@${igMatch[1]}`;
      console.log(`Found Instagram from website footer: @${igMatch[1]}`);
      break;
    }
  }
}

// Also enrich discovered social data with footer links
if (!discoveredSocial.facebook_url) {
  const fbLink = socialLinksFromScrape.find(l => /facebook\.com/i.test(l));
  if (fbLink) discoveredSocial.facebook_url = fbLink;
}
if (!discoveredSocial.twitter_handle) {
  const twLink = socialLinksFromScrape.find(l => /twitter\.com|x\.com/i.test(l));
  if (twLink) {
    const twMatch = twLink.match(/(?:twitter\.com|x\.com)\/([^\/?]+)/);
    if (twMatch && twMatch[1] !== 'i' && twMatch[1] !== 'status') {
      discoveredSocial.twitter_handle = `@${twMatch[1]}`;
    }
  }
}
if (!discoveredSocial.linkedin_url) {
  const liLink = socialLinksFromScrape.find(l => /linkedin\.com\/company/i.test(l));
  if (liLink) discoveredSocial.linkedin_url = liLink;
}
```

**4. Add social links context to AI prompt (around line ~683)**

Append discovered social links to the content sent to Claude:
```javascript
let socialLinksContext = '';
if (socialLinksFromScrape.length > 0) {
  socialLinksContext = `\n\nDISCOVERED SOCIAL MEDIA LINKS (from website footer):\n${socialLinksFromScrape.join('\n')}`;
}
```

Then include in the AI prompt.

---

## Technical Summary

| Aspect | Before (Broken) | After (Fixed) |
|--------|-----------------|---------------|
| `onlyMainContent` | `true` (excludes footer) | `false` (includes footer) |
| `formats` | `['markdown']` | `['markdown', 'links']` |
| Social link extraction | None from website | Extract from links array |
| Instagram discovery | Only Step 0 (Perplexity) | Step 0 + Website footer |

## Why This Works

1. **Footer capture**: `onlyMainContent: false` ensures Firecrawl returns the entire page HTML including footer/header sections where social links typically reside
2. **Explicit links**: The `links` format tells Firecrawl to extract all anchor hrefs separately, making it easy to filter for social patterns
3. **Fallback chain**: Instagram discovery now follows: Input → Step 0 (Perplexity) → Step 1 (Website footer)
4. **Consistent with scraper-worker**: This matches the approach already proven to work in the bulk website scraper

