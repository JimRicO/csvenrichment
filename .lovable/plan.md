

# Add Missing Fields to Website Scraper UI

## Overview

Update the "Select Data to Extract" section in `UploadSection.tsx` to show all fields that will be extracted, giving users complete visibility into what data they'll receive.

---

## Current vs. Proposed UI

### Current Checkboxes (6 items)
| Field | Displayed |
|-------|-----------|
| Business Description | Yes |
| Team Members | Yes |
| Social Media | Yes |
| WhatsApp Contact | Yes |
| Custom Question 1 | Yes |
| Custom Question 2 | Yes |

### Missing Fields to Add (7 items)
| Field | Icon | Note |
|-------|------|------|
| Logo | Image icon | NEW - just implemented |
| Phone Number | Phone icon | |
| Email | Mail icon | |
| Address | MapPin icon | |
| Opening Hours | Clock icon | |
| Facilities | LayoutGrid icon | Clubs, Courts, Details |
| Club Locations | Building2 icon | Individual branch data |

---

## Design Approach

Since the backend extracts **all fields by default** regardless of checkbox state, we have two options:

**Option A: Display-only indicators (Recommended)**
- Show all fields as checked/enabled indicators (not interactive checkboxes)
- Makes it clear what data will be extracted
- No confusing toggles that don't actually do anything

**Option B: Keep checkboxes but add all fields**
- Add the missing fields as checkboxes
- They would all be checked by default
- Still misleading since backend ignores the config

**Recommendation**: Use Option A - Replace the checkbox section with a clean "Data Extracted" info section that shows all fields with icons, similar to the popover info panel already in the header.

---

## Implementation Details

### Modified File
- `src/components/UploadSection.tsx`

### Changes to Lines 791-850

Replace the current checkbox-based "Select Data to Extract" section with a reorganized layout:

1. **Data Fields Section** (display-only with icons)
   - Grouped into categories for clarity:
     - **Basic Info**: Logo, Business Description, Team Members
     - **Contact**: Phone, Email, Address, Opening Hours, WhatsApp
     - **Social Media**: Instagram, Facebook, LinkedIn, Twitter
     - **Facilities**: Number of Clubs/Courts, Facilities Details, Club Locations

2. **Custom Questions Section** (keep interactive)
   - Keep the two custom question input fields
   - These are the only truly customizable extraction options

### Visual Layout

```text
+--------------------------------------------------+
| Data to Extract:                                  |
|                                                   |
| [Check] Logo & Business Info                      |
|         Logo, Description, Team Members           |
|                                                   |
| [Check] Contact Details                           |
|         Phone, Email, Address, Hours, WhatsApp    |
|                                                   |
| [Check] Social Media                              |
|         Instagram, Facebook, LinkedIn, Twitter    |
|                                                   |
| [Check] Facilities                                |
|         Clubs, Courts, Details, Locations         |
|                                                   |
| Custom Question 1 (optional)                      |
| [________________________]                        |
|                                                   |
| Custom Question 2 (optional)                      |
| [________________________]                        |
+--------------------------------------------------+
```

All checkboxes will be checked and disabled (greyed out) to indicate these are always extracted, while the custom questions remain editable.

---

## Summary

| What Changes | Description |
|--------------|-------------|
| Add missing fields | Logo, Phone, Email, Address, Hours, Facilities, Locations |
| Reorganize layout | Group related fields into categories |
| Disable checkboxes | Show as always-on since backend extracts all |
| Keep custom questions | Only truly customizable options remain interactive |

