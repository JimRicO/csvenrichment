
# Fix Perplexity Research Placement and Card Overflow

## Issues Identified

Based on the screenshot:
1. **Wrong Order**: Perplexity description, founder info, and recent activities appear before the AI analysis sections
2. **Overflow Bug**: Long citation URLs in the Sources section are overflowing outside the card boundary

## Solution

### 1. Reorder Content Sections

Move all Perplexity research content to appear AFTER the Aesthetics field:

**Current Order:**
```
Header -> Perplexity Description -> Founder Info -> Recent Activities -> Instagram -> Contact -> Colors -> Fonts -> Description -> Attitude -> Aesthetics -> Sources
```

**New Order:**
```
Header -> Instagram -> Contact -> Colors -> Fonts -> Description -> Attitude -> Aesthetics -> Perplexity Description -> Founder Info -> Recent Activities -> Sources
```

### 2. Fix Citation Overflow

The overflow issue is caused by long URLs not being contained properly. Apply these CSS fixes:

| Property | Purpose |
|----------|---------|
| `overflow-hidden` | Prevent content from spilling out |
| `break-all` | Allow breaking long URLs at any character |
| `max-w-full` | Constrain width to parent container |

## File Changes

**File:** `src/components/EnrichedClubsDialog.tsx`

### Changes:
1. Move lines 213-252 (Perplexity Description, Founder Info, Recent Activities) to after line 371 (after Aesthetics section)
2. Add `overflow-hidden` to the Sources collapsible container
3. Add `break-all` class to citation links to handle long URLs
4. Wrap citations in a container with proper width constraints

### Code Structure After Fix:

```text
<div className="space-y-6">
  {/* Header with logo */}
  
  {/* Instagram section */}
  
  {/* Contact info */}
  
  {/* Color palette */}
  
  {/* Fonts */}
  
  {/* AI Analysis: Description, Attitude, Aesthetics */}
  
  {/* === PERPLEXITY RESEARCH (moved here) === */}
  {/* Perplexity Description */}
  {/* Founder Info */}
  {/* Recent Activities */}
  {/* Sources/Citations */}
</div>
```

### CSS Fix for Overflow:

```tsx
<CollapsibleContent className="mt-2 overflow-hidden">
  <div className="space-y-1 p-3 rounded-xl neu-pressed max-w-full overflow-hidden">
    {selectedClub.perplexity_citations.map((citation, idx) => (
      <a
        key={idx}
        href={citation}
        target="_blank"
        rel="noopener noreferrer"
        className="block text-xs text-primary hover:underline break-all"
      >
        {citation}
      </a>
    ))}
  </div>
</CollapsibleContent>
```

## Technical Summary

| Change | Lines Affected |
|--------|----------------|
| Move Perplexity Description section | 213-218 to after 371 |
| Move Founder Info section | 220-229 to after 371 |
| Move Recent Activities section | 231-252 to after 371 |
| Fix citation overflow | 385-399 |
