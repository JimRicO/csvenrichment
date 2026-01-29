

# Improve CSV Validation Feedback

## Overview

Add immediate validation after CSV parsing to inform users right away if their file is missing a required `website` or `url` column, rather than waiting until they click "Start Scraping Job".

---

## Current Flow

1. User uploads CSV file
2. File is parsed successfully
3. User sees: "File uploaded successfully - X rows found"
4. User clicks "Start Scraping Job"
5. **Only then** they get error: "CSV must contain a 'website' or 'url' column"

## Improved Flow

1. User uploads CSV file
2. File is parsed successfully
3. System immediately checks for `website`/`url` column
4. If missing: Show warning toast + visual indicator on the file
5. "Start Scraping Job" button remains disabled until valid CSV uploaded

---

## Implementation Details

### File to Modify
- `src/components/UploadSection.tsx`

### Changes

**1. Add validation state variable (around line 58)**
```typescript
const [csvValidationError, setCsvValidationError] = useState<string | null>(null);
```

**2. Update CSV parsing completion handler (lines 198-207)**
Add immediate column validation after parsing:
- Check if any row has a `website`, `Website`, `url`, or `URL` key
- If missing, set validation error and show warning toast
- If valid, clear any previous validation error

**3. Update UI to show validation status (in the file display area)**
- Show a warning badge/icon next to the file name if validation failed
- Display the specific error message (e.g., "Missing 'website' column")

**4. Disable "Start Scraping Job" button when CSV is invalid**
- Add `csvValidationError` to the button's disabled condition
- This prevents users from even trying to start a job with invalid data

**5. Keep existing validation in `handleCreateJob` as backup**
- The server-side validation remains as a safety net
- But users will rarely see it since client-side catches errors first

---

## Visual Changes

When CSV is invalid:
```text
+--------------------------------------------------+
| 📄 clubs.csv                              ⚠️ Error |
| 150 rows                                          |
| ⚠️ CSV must contain a 'website' or 'url' column  |
+--------------------------------------------------+

[Start Scraping Job] <-- disabled, greyed out
```

When CSV is valid:
```text
+--------------------------------------------------+
| 📄 clubs.csv                              ✓ Valid |
| 150 rows                                          |
+--------------------------------------------------+

[Start Scraping Job] <-- enabled
```

---

## Summary

| Change | Purpose |
|--------|---------|
| Add validation immediately after parsing | Inform user right away |
| Show visual error indicator on file | Clear feedback on what's wrong |
| Disable submit button when invalid | Prevent futile submission attempts |
| Keep existing server validation | Safety net for edge cases |

