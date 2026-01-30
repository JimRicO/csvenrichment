

# Upgrade People Intelligence to Perplexity Sonar Pro

## Current Issue

The `people-worker` edge function is using the basic `sonar` model instead of `sonar-pro` for Perplexity API searches (line 33 in `people-worker/index.ts`).

## Why This Matters

| Model | Features |
|-------|----------|
| `sonar` | Fast, lightweight search for everyday questions |
| `sonar-pro` | Multi-step reasoning with **2x more citations** - better for in-depth research |

For researching individuals, `sonar-pro` provides:
- More thorough multi-step reasoning
- 2x the number of source citations for verification
- Better synthesis of complex biographical information

## Technical Change

### File: `supabase/functions/people-worker/index.ts`

Update the model parameter in the `searchPerplexity` function:

```typescript
// Line 33 - Change from:
model: 'sonar',

// To:
model: 'sonar-pro',
```

## Cost Impact

- `sonar`: ~$0.005 per search (current)
- `sonar-pro`: ~$0.015 per search (3x more)
- Total per person increases from ~$0.014 to ~$0.034

This is a worthwhile tradeoff for significantly better research quality and more citation sources.

