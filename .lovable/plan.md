

## Add Screenshot Type Toggle (Full Page vs Viewport Only)

This plan adds a simple toggle option to let you choose between capturing a full-page screenshot or just the visible viewport.

### What Will Change

**Frontend (ScreenshotTest.tsx):**
- Add a toggle switch or radio button to select between "Full Page" and "Viewport Only"
- Pass the selected option to the backend function
- Update the result label to reflect which type was captured

**Backend (screenshot-test/index.ts):**
- Accept a new `fullPage` parameter (defaults to `true` for backward compatibility)
- Use `screenshot@fullPage` when full page is selected
- Use `screenshot` when viewport only is selected

### User Experience

You'll see a simple toggle next to the URL input:
- **Full Page** (default): Captures the entire scrollable page
- **Viewport Only**: Captures only what's visible in the browser window (faster, smaller file)

### Technical Details

**Frontend changes:**
```
- Add state: const [fullPage, setFullPage] = useState(true)
- Add Switch component from shadcn/ui with labels
- Pass { url, fullPage } to the edge function
```

**Backend changes:**
```
- Extract fullPage from request body (default: true)
- Set formats to fullPage ? ['screenshot@fullPage'] : ['screenshot']
- Log which mode is being used
```

### Files to Modify

| File | Change |
|------|--------|
| `src/components/ScreenshotTest.tsx` | Add toggle switch and pass `fullPage` option |
| `supabase/functions/screenshot-test/index.ts` | Accept `fullPage` param and adjust Firecrawl format |

