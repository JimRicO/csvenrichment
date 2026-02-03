
# Hide Sidebar for Single Club Results

## Overview
Optimize the Enriched Clubs dialog to automatically hide the left navigation sidebar when only one club is returned, giving the full width to the detail panel for a cleaner, more focused view.

## Changes

### EnrichedClubsDialog.tsx

**Conditional Sidebar Rendering**
- Add a check: `const showSidebar = clubs.length > 1`
- Only render the sidebar `<div className="w-64 border-r...">` when `showSidebar` is true
- The detail panel will naturally expand to fill 100% width when the sidebar is hidden

**Layout Adjustment**
- Current: Fixed 2-column layout (sidebar + detail)
- After: Single full-width detail panel when only 1 club exists

```text
+----------------------------------+     +----------------------------------+
| Sidebar  |   Detail Panel        |     |         Detail Panel             |
| (w-64)   |   (flex-1)            | --> |         (full width)             |
|          |                       |     |                                  |
+----------------------------------+     +----------------------------------+
     Multiple clubs                           Single club
```

**Loading State Handling**
- During loading (`isLoading === true`), we don't yet know the count
- Show a centered loading skeleton in the full-width area until data arrives
- Once loaded, conditionally show sidebar based on actual count

---

## Technical Implementation

The key change is wrapping the sidebar in a conditional:

```tsx
{clubs.length > 1 && (
  <div className="w-64 border-r border-border/50 p-4">
    {/* existing sidebar content */}
  </div>
)}
```

The `flex-1` on the detail panel ensures it expands to full width when the sidebar is absent.
