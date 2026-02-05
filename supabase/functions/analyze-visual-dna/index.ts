 import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
 
 const corsHeaders = {
   'Access-Control-Allow-Origin': '*',
   'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
 };
 
 // CTLT Photography Styles
 const CTLT_STYLES = [
   "Cinematic", "Editorial", "Vintage Film", "Neon Glow", "Minimalist Clean",
   "High Contrast", "Dark Moody", "Bright Natural", "Warm Golden", "Cool Blue",
   "Urban Street", "Luxury Premium", "Retro Pop", "Soft Pastel", "Bold Graphic",
   "Documentary", "Fashion Editorial", "Sports Action", "Lifestyle Casual", "Studio Portrait"
 ];
 
// Model names
// NOTE: These providers return 404 if a model ID is not available for your API key.
// Keep a primary + fallback so the pipeline still runs if a newer model isn't enabled.
const CLAUDE_MODEL_PRIMARY = 'claude-sonnet-4-5-20250514';
const CLAUDE_MODEL_FALLBACK = 'claude-3-5-sonnet-20241022';

const GEMINI_MODEL_PRIMARY = 'gemini-2.5-flash-preview-04-17';
const GEMINI_MODEL_FALLBACK = 'gemini-2.0-flash';

 // Target max width for resized images (keeps payload manageable)
 const TARGET_IMAGE_WIDTH = 512;
 // All 12 images will be analyzed
 const MAX_IMAGES_FOR_ANALYSIS = 12;

 interface Post {
   id: string;
   type: string;
   timestamp: string;
   caption: string;
   likesCount: number;
   commentsCount: number;
   displayUrl: string;
   alt?: string;
 }
 
 interface VisualDNA {
   color_palette: string[];
   photography_style: string;
   composition_patterns: string[];
   branding_elements: {
     logo_visible: boolean;
     watermarks: boolean;
     text_overlays: boolean;
   };
   content_mix: Record<string, number>;
   quality_assessment: {
     image_quality: string;
     consistency: number;
     brand_coherence: number;
   };
   filter_style: string;
 }
 
 interface VoiceDNA {
   tone: string;
   average_length: string;
   emoji_frequency: string;
   common_emojis: string[];
   hashtag_strategy: {
     average_count: number;
     branded_vs_generic: string;
     placement: string;
   };
   cta_patterns: string[];
   languages: string[];
   recurring_themes: string[];
   signature_phrases: string[];
 }
 
 interface CTLTMatches {
   matched_styles: Array<{
     style_name: string;
     match_score: number;
     reason: string;
   }>;
   styles_to_avoid: Array<{
     style_name: string;
     reason: string;
   }>;
   enhancement_suggestion: string;
 }
 
 // Clean base64 string to ensure it's valid
 function cleanBase64(base64String: string): string {
   if (!base64String) return "";
   let cleaned = base64String.trim();
 
   // Remove data URL prefix if present
   if (cleaned.includes(",") && cleaned.startsWith("data:")) {
     cleaned = cleaned.split(",")[1];
   }
 
   // Remove whitespace/newlines
   cleaned = cleaned.replace(/\s/g, "");
 
   return cleaned;
 }
 
 // Convert array buffer to base64 in chunks to avoid stack overflow
 function arrayBufferToBase64(buffer: ArrayBuffer): string {
   const bytes = new Uint8Array(buffer);
   const chunkSize = 8192;
   let result = '';
   
   for (let i = 0; i < bytes.length; i += chunkSize) {
     const chunk = bytes.slice(i, i + chunkSize);
     result += String.fromCharCode.apply(null, Array.from(chunk));
   }
   
   return btoa(result);
 }
 
// Extract JSON from a response that may contain markdown, thinking blocks, or preamble
function extractJsonFromResponse(response: string): unknown {
  if (!response) {
    throw new Error("Empty response");
  }

  let cleaned = response.trim();
  
  // Remove markdown code blocks
  cleaned = cleaned
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();
  
  // Find JSON object boundaries
  const jsonStart = cleaned.indexOf("{");
  const jsonEnd = cleaned.lastIndexOf("}");
  
  if (jsonStart === -1 || jsonEnd === -1) {
    throw new Error("No JSON object found in response");
  }
  
  cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
  
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // Try fixing common JSON issues
    cleaned = cleaned
      .replace(/,\s*}/g, "}")  // trailing commas in objects
      .replace(/,\s*]/g, "]")  // trailing commas in arrays
      .replace(/[\x00-\x1F\x7F]/g, ""); // control characters
    return JSON.parse(cleaned);
  }
}

 // Resize image using canvas API - returns resized base64
 async function resizeImageToMaxWidth(
   imageBuffer: ArrayBuffer,
   mimeType: string,
   maxWidth: number
 ): Promise<{ base64: string; width: number; height: number }> {
   // For Deno, we need to use a different approach since Canvas isn't available
   // We'll use the imagescript library approach with raw pixel manipulation
   // But for simplicity in an edge function, let's do a simpler approach:
   // Compress by reducing quality and let Gemini handle larger images
   
   // Since we can't use canvas in Deno edge functions easily,
   // we'll just convert to base64 and let the batch fallback handle large payloads
   const base64 = arrayBufferToBase64(imageBuffer);
   return { base64: cleanBase64(base64), width: 0, height: 0 };
 }
 
 // Fetch image, resize it to max width, and return base64
 async function fetchAndResizeImage(
   url: string,
   maxWidth: number
 ): Promise<{ base64: string; mimeType: string } | null> {
   try {
     const response = await fetch(url, {
       headers: {
         'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
         'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
         'Referer': 'https://www.instagram.com/'
       }
     });
     if (!response.ok) return null;
     
     // Determine mime type from content-type header
     const contentType = response.headers.get('content-type') || 'image/jpeg';
     const mimeType = contentType.includes('png') ? 'image/png' : 
                      contentType.includes('webp') ? 'image/webp' : 'image/jpeg';
     
     const buffer = await response.arrayBuffer();
     
     // For Deno edge functions, we can't easily resize images without additional deps
     // Instead, we'll send smaller batches if needed
     const base64 = arrayBufferToBase64(buffer);
     const cleanedBase64 = cleanBase64(base64);
     
     return { base64: cleanedBase64, mimeType };
   } catch (error) {
     console.error('Failed to fetch image:', url, error);
     return null;
   }
 }
 
 async function fetchImageAsBase64(url: string): Promise<string | null> {
   try {
     const response = await fetch(url, {
       headers: {
         'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
         'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
         'Referer': 'https://www.instagram.com/'
       }
     });
     if (!response.ok) return null;
     
     const buffer = await response.arrayBuffer();
     // Use chunk-based conversion to avoid stack overflow on large images
     const base64 = arrayBufferToBase64(buffer);
     return cleanBase64(base64);
   } catch (error) {
     console.error('Failed to fetch image:', url, error);
     return null;
   }
 }
 
 // Send a batch of images to Gemini and get visual analysis
 async function sendBatchToGemini(
   imageParts: any[],
   apiKey: string,
   batchNumber: number = 1,
   totalBatches: number = 1
 ): Promise<{ visualDna: VisualDNA | null; error?: string }> {
   const batchInfo = totalBatches > 1 ? ` (batch ${batchNumber}/${totalBatches})` : '';
   console.log(`Sending ${imageParts.length} images to Gemini${batchInfo}`);
   
   const prompt = `Analyze these Instagram posts from a sports/fitness club and extract visual identity patterns.
 
 Return ONLY valid JSON (no markdown, no code blocks) with this exact structure:
 {
   "color_palette": ["#hex1", "#hex2", ...],
   "photography_style": "cinematic|bright|moody|natural|minimal|saturated",
   "composition_patterns": ["close-up", "wide", "overhead", "action", "portrait"],
   "branding_elements": {
     "logo_visible": true/false,
     "watermarks": true/false,
     "text_overlays": true/false
   },
   "content_mix": {
     "action": 0-100,
     "lifestyle": 0-100,
     "events": 0-100,
     "coaching": 0-100,
     "facility": 0-100,
     "community": 0-100,
     "promotional": 0-100
   },
   "quality_assessment": {
     "image_quality": "professional|semi-professional|phone-camera|mixed",
     "consistency": 1-10,
     "brand_coherence": 1-10
   },
   "filter_style": "warm|cool|high-contrast|natural|vintage"
 }
 
 Extract dominant colors as hex codes (5-8 colors). Percentages in content_mix should sum to 100.`;
 
   const tryGemini = async (modelId: string) => {
     return await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent`, {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json',
         'x-goog-api-key': apiKey
       },
       body: JSON.stringify({
         contents: [{
           parts: [
             { text: prompt },
             ...imageParts
           ]
         }],
         generationConfig: { 
           temperature: 0.2,
           maxOutputTokens: 2000
         }
       })
     });
   };
 
   try {
     let response = await tryGemini(GEMINI_MODEL_PRIMARY);
 
     if (response.status === 404) {
       const errorText = await response.text();
       console.error('Gemini model not found:', GEMINI_MODEL_PRIMARY, errorText);
       console.log('Retrying Gemini with fallback model:', GEMINI_MODEL_FALLBACK);
       response = await tryGemini(GEMINI_MODEL_FALLBACK);
     }
   
     if (!response.ok) {
       const error = await response.text();
       console.error('=== GEMINI API ERROR ===');
       console.error('Status Code:', response.status);
       console.error('Response Body:', error);
       return { visualDna: null, error: `Gemini API error ${response.status}: ${error.substring(0, 200)}` };
     }
   
     // Read response as text first for debugging
     const responseText = await response.text();
     console.log('=== GEMINI RAW RESPONSE ===');
     console.log('Status Code:', response.status);
     console.log('Response Length:', responseText.length);
     console.log('Response Preview (first 500 chars):', responseText.substring(0, 500));
     
     // Parse the response JSON
     let data;
     try {
       data = JSON.parse(responseText);
     } catch (parseError) {
       console.error('Failed to parse Gemini response as JSON:', parseError);
       console.error('Full response:', responseText);
       return { visualDna: null, error: 'Gemini response is not valid JSON' };
     }
     
     // Check for finish reason issues
     const finishReason = data.candidates?.[0]?.finishReason;
     const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
     
     console.log('Finish Reason:', finishReason);
     console.log('Has Text:', !!text);
     
     if (!text) {
       if (finishReason === 'MAX_TOKENS') {
         console.error('Gemini response empty due to token limit');
         return { visualDna: null, error: 'Gemini hit token limit - try fewer images' };
       }
       if (finishReason === 'SAFETY') {
         console.error('Gemini blocked response for safety reasons');
         return { visualDna: null, error: 'Gemini blocked response for safety' };
       }
       console.error('No text in Gemini response. Full response:', JSON.stringify(data, null, 2));
       return { visualDna: null, error: `No text in response (finishReason: ${finishReason})` };
     }
     
     console.log('Gemini text response (first 300 chars):', text.substring(0, 300));
     
     // Extract JSON from response (handles markdown, thinking blocks, preamble)
     try {
       const visualDna = extractJsonFromResponse(text) as VisualDNA;
       console.log('Successfully parsed Visual DNA:', Object.keys(visualDna));
       return { visualDna };
     } catch (jsonError) {
       console.error('Failed to extract JSON from Gemini text:', jsonError);
       console.error('Full text response:', text);
       return { visualDna: null, error: `Failed to parse JSON: ${jsonError instanceof Error ? jsonError.message : 'Unknown parse error'}` };
     }
     
   } catch (error) {
     console.error('=== GEMINI EXCEPTION ===');
     console.error('Error:', error);
     const errorMessage = error instanceof Error ? error.message : 'Unknown error';
     return { visualDna: null, error: `Gemini exception: ${errorMessage}` };
   }
 }
 
 // Merge two VisualDNA results from batch processing
 function mergeVisualDNAResults(batch1: VisualDNA, batch2: VisualDNA): VisualDNA {
   // Merge color palettes (unique colors)
   const allColors = [...new Set([...batch1.color_palette, ...batch2.color_palette])];
   
   // Average the content mix percentages
   const mergedContentMix: Record<string, number> = {};
   const categories = ['action', 'lifestyle', 'events', 'coaching', 'facility', 'community', 'promotional'];
   for (const cat of categories) {
     const v1 = batch1.content_mix?.[cat] || 0;
     const v2 = batch2.content_mix?.[cat] || 0;
     mergedContentMix[cat] = Math.round((v1 + v2) / 2);
   }
   
   // Merge composition patterns (unique)
   const allPatterns = [...new Set([...batch1.composition_patterns, ...batch2.composition_patterns])];
   
   // Average quality scores
   const avgConsistency = Math.round((batch1.quality_assessment.consistency + batch2.quality_assessment.consistency) / 2);
   const avgCoherence = Math.round((batch1.quality_assessment.brand_coherence + batch2.quality_assessment.brand_coherence) / 2);
   
   return {
     color_palette: allColors.slice(0, 8), // Keep top 8
     photography_style: batch1.photography_style, // Use first batch's primary style
     composition_patterns: allPatterns,
     branding_elements: {
       logo_visible: batch1.branding_elements.logo_visible || batch2.branding_elements.logo_visible,
       watermarks: batch1.branding_elements.watermarks || batch2.branding_elements.watermarks,
       text_overlays: batch1.branding_elements.text_overlays || batch2.branding_elements.text_overlays
     },
     content_mix: mergedContentMix,
     quality_assessment: {
       image_quality: batch1.quality_assessment.image_quality, // Use first batch
       consistency: avgConsistency,
       brand_coherence: avgCoherence
     },
     filter_style: batch1.filter_style // Use first batch
   };
 }
 
 // Progress logging interface
 interface ImageDownloadResult {
   index: number;
   url: string;
   success: boolean;
   sizeBytes?: number;
   base64Length?: number;
   mimeType?: string;
   error?: string;
 }
 
  async function analyzeVisualWithGemini(posts: Post[], apiKey: string): Promise<{ visualDna: VisualDNA | null; imagesAnalyzed: number; error?: string; downloadResults: ImageDownloadResult[] }> {
    console.log('========================================');
    console.log('STARTING GEMINI VISUAL ANALYSIS');
    console.log(`Total posts to analyze: ${posts.length} (max ${MAX_IMAGES_FOR_ANALYSIS})`);
    console.log('========================================');
    
    // Build image parts for multimodal request - fetch ALL images
    const imageParts: any[] = [];
    const downloadResults: ImageDownloadResult[] = [];
    let imagesFetched = 0;
    let imagesFailed = 0;
    
    // Process ALL posts (up to MAX_IMAGES_FOR_ANALYSIS = 12)
    const postsToProcess = posts.slice(0, MAX_IMAGES_FOR_ANALYSIS);
    const totalImages = postsToProcess.length;
    
    for (let i = 0; i < postsToProcess.length; i++) {
      const post = postsToProcess[i];
      const imageUrl = post.displayUrl;
      const imageNum = i + 1;
      
      console.log(`\n📥 Downloading image ${imageNum}/${totalImages}...`);
      console.log(`   URL: ${imageUrl ? imageUrl.substring(0, 100) + '...' : 'NO URL'}`);
      
      if (!imageUrl) {
        console.log(`   ❌ FAILED: No URL provided for post ${post.id}`);
        imagesFailed++;
        downloadResults.push({
          index: imageNum,
          url: 'NO_URL',
          success: false,
          error: 'Post has no displayUrl'
        });
        continue;
      }
      
      const startFetch = Date.now();
      const imageResult = await fetchAndResizeImage(imageUrl, TARGET_IMAGE_WIDTH);
      const fetchTime = Date.now() - startFetch;
      
      if (imageResult) {
        imagesFetched++;
        const estimatedSizeBytes = Math.round((imageResult.base64.length * 3) / 4);
        console.log(`   ✅ SUCCESS: Downloaded in ${fetchTime}ms`);
        console.log(`      Size: ~${Math.round(estimatedSizeBytes / 1024)}KB`);
        console.log(`      Base64 length: ${imageResult.base64.length} chars`);
        console.log(`      MIME type: ${imageResult.mimeType}`);
        
        downloadResults.push({
          index: imageNum,
          url: imageUrl.substring(0, 80),
          success: true,
          sizeBytes: estimatedSizeBytes,
          base64Length: imageResult.base64.length,
          mimeType: imageResult.mimeType
        });
        
        imageParts.push({
          inline_data: {
            mime_type: imageResult.mimeType,
            data: imageResult.base64
          }
        });
      } else {
        imagesFailed++;
        console.log(`   ❌ FAILED: Could not fetch/process image in ${fetchTime}ms`);
        downloadResults.push({
          index: imageNum,
          url: imageUrl.substring(0, 80),
          success: false,
          error: 'Fetch or processing failed'
        });
      }
    }
    
    console.log('\n========================================');
    console.log(`IMAGE DOWNLOAD SUMMARY`);
    console.log(`✅ Success: ${imagesFetched}/${totalImages}`);
    console.log(`❌ Failed: ${imagesFailed}/${totalImages}`);
    console.log(`Ready for Gemini: ${imageParts.length} images`);
    console.log('========================================\n');
 
   if (imageParts.length < 4) {
     console.error('Not enough valid images for analysis:', imageParts.length);
      return { visualDna: null, imagesAnalyzed: imageParts.length, error: `Only ${imageParts.length} valid images (need 4+)`, downloadResults };
   }
   
   // Try sending all images in a single request first
    console.log('========================================');
    console.log(`🚀 SENDING ${imageParts.length} IMAGES TO GEMINI...`);
    console.log('========================================');
   const singleResult = await sendBatchToGemini(imageParts, apiKey);
   
   if (singleResult.visualDna) {
      console.log('✅ GEMINI ANALYZED ALL IMAGES SUCCESSFULLY');
      console.log(`   Color palette: ${singleResult.visualDna.color_palette?.length || 0} colors`);
      console.log(`   Style: ${singleResult.visualDna.photography_style}`);
      console.log(`   Quality: ${singleResult.visualDna.quality_assessment?.image_quality}`);
      return { visualDna: singleResult.visualDna, imagesAnalyzed: imageParts.length, downloadResults };
   }
   
   // Check if the error suggests payload/size issues
   const payloadRelatedErrors = ['payload', 'size', 'too large', 'token limit', '413', '400'];
   const isPayloadError = singleResult.error && 
     payloadRelatedErrors.some(e => singleResult.error!.toLowerCase().includes(e));
   
   if (!isPayloadError) {
     // Not a payload issue, return the error
      console.log('❌ GEMINI FAILED:', singleResult.error);
      return { visualDna: null, imagesAnalyzed: imageParts.length, error: singleResult.error, downloadResults };
   }
   
   // Payload too large - split into 2 batches of 6
    console.log('⚠️ Payload too large, splitting into 2 batches of 6...');
   
   const midpoint = Math.ceil(imageParts.length / 2);
   const batch1Parts = imageParts.slice(0, midpoint);
   const batch2Parts = imageParts.slice(midpoint);
   
    console.log(`   Batch 1: ${batch1Parts.length} images`);
    console.log(`   Batch 2: ${batch2Parts.length} images`);
   
   // Run both batches
    console.log('\n🚀 Sending Batch 1 to Gemini...');
   const batch1Result = await sendBatchToGemini(batch1Parts, apiKey, 1, 2);
   
   if (!batch1Result.visualDna) {
      console.error('❌ Batch 1 failed:', batch1Result.error);
      return { visualDna: null, imagesAnalyzed: imageParts.length, error: `Batch processing failed: ${batch1Result.error}`, downloadResults };
   }
    console.log('✅ Batch 1 succeeded');
   
    console.log('\n🚀 Sending Batch 2 to Gemini...');
   const batch2Result = await sendBatchToGemini(batch2Parts, apiKey, 2, 2);
   
   if (!batch2Result.visualDna) {
      console.error('⚠️ Batch 2 failed:', batch2Result.error);
     // Return batch 1 results if batch 2 fails
     console.log('Using batch 1 results only since batch 2 failed');
      return { visualDna: batch1Result.visualDna, imagesAnalyzed: batch1Parts.length, error: `Partial analysis: ${batch2Result.error}`, downloadResults };
   }
    console.log('✅ Batch 2 succeeded');
   
   // Merge both batch results
    console.log('\n✅ GEMINI ANALYZED ALL IMAGES (2 batches merged)');
   const mergedVisualDna = mergeVisualDNAResults(batch1Result.visualDna, batch2Result.visualDna);
   
    return { visualDna: mergedVisualDna, imagesAnalyzed: imageParts.length, downloadResults };
 }
 
 async function analyzeVoiceWithClaude(posts: Post[], apiKey: string): Promise<VoiceDNA | null> {
   const captions = posts
     .map(p => p.caption)
     .filter(c => c && c.trim().length > 0)
     .slice(0, 12);
   
    console.log('========================================');
    console.log(`🎤 SENDING ${captions.length} CAPTIONS TO CLAUDE...`);
    console.log('========================================');
    
   if (captions.length === 0) {
      console.log('⚠️ No captions to analyze');
     return null;
   }
   
   const prompt = `Analyze these Instagram captions from a sports/fitness club and extract voice patterns.
 
 Captions:
 ${captions.map((c, i) => `[${i + 1}] ${c}`).join('\n\n')}
 
 Return ONLY valid JSON (no markdown, no code blocks) with this exact structure:
 {
   "tone": "formal|casual|hype|educational|inspirational|mixed",
   "average_length": "short|medium|long",
   "emoji_frequency": "none|rare|moderate|heavy",
   "common_emojis": ["emoji1", "emoji2", ...],
   "hashtag_strategy": {
     "average_count": number,
     "branded_vs_generic": "mostly-branded|mostly-generic|balanced",
     "placement": "inline|end|both"
   },
   "cta_patterns": ["book now", "link in bio", ...],
   "languages": ["English", ...],
   "recurring_themes": ["theme1", "theme2", ...],
   "signature_phrases": ["phrase1", ...]
 }`;
 
    const callClaude = async (model: string) => {
      return await fetch('https://api.anthropic.com/v1/messages', {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json',
         'x-api-key': apiKey,
         'anthropic-version': '2023-06-01'
       },
       body: JSON.stringify({
          model,
         max_tokens: 2000,
         messages: [{ role: 'user', content: prompt }]
       })
     });
    };

    try {
      let response = await callClaude(CLAUDE_MODEL_PRIMARY);

      if (response.status === 404) {
        const errorText = await response.text();
        console.error('Claude model not found:', CLAUDE_MODEL_PRIMARY, errorText);
        console.log('Retrying Claude with fallback model:', CLAUDE_MODEL_FALLBACK);
        response = await callClaude(CLAUDE_MODEL_FALLBACK);
      }
     
     if (!response.ok) {
       const error = await response.text();
       console.error('Claude API error:', response.status, error);
       return null;
     }
     
     const data = await response.json();
     const text = data.content?.[0]?.text;
     
     if (!text) {
        console.error('❌ CLAUDE FAILED: No text in response');
       return null;
     }
     
     let cleanText = text.trim();
     if (cleanText.startsWith('```')) {
       cleanText = cleanText.replace(/^```json?\n?/, '').replace(/\n?```$/, '');
     }
     
      const voiceDna = JSON.parse(cleanText) as VoiceDNA;
      console.log('✅ CLAUDE VOICE ANALYSIS COMPLETE');
      console.log(`   Tone: ${voiceDna.tone}`);
      console.log(`   Caption length: ${voiceDna.average_length}`);
      console.log(`   Emoji frequency: ${voiceDna.emoji_frequency}`);
      return voiceDna;
   } catch (error) {
      console.error('❌ CLAUDE VOICE ANALYSIS FAILED:', error);
     return null;
   }
 }
 
 async function matchCTLTStylesWithClaude(visualDna: VisualDNA, apiKey: string): Promise<CTLTMatches | null> {
    console.log('========================================');
    console.log('🎨 MATCHING CTLT STYLES WITH CLAUDE...');
    console.log('========================================');
   
   const prompt = `Based on this visual identity analysis of a sports/fitness club's Instagram, match it against photography styles.
 
 Visual Analysis:
 ${JSON.stringify(visualDna, null, 2)}
 
 Available Photography Styles:
 ${CTLT_STYLES.join(', ')}
 
 Return ONLY valid JSON (no markdown, no code blocks) with this exact structure:
 {
   "matched_styles": [
     {"style_name": "Style Name", "match_score": 1-10, "reason": "short explanation"},
     ... (top 5 matches)
   ],
   "styles_to_avoid": [
     {"style_name": "Style Name", "reason": "short explanation"},
     ... (2-3 styles)
   ],
   "enhancement_suggestion": "One sentence suggestion for improving their visual identity"
 }
 
 Rank the top 5 photography styles that best match this club's existing visual identity. Also identify 2-3 styles that would clash with their current aesthetic.`;
 
    const callClaude = async (model: string) => {
      return await fetch('https://api.anthropic.com/v1/messages', {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json',
         'x-api-key': apiKey,
         'anthropic-version': '2023-06-01'
       },
       body: JSON.stringify({
          model,
         max_tokens: 2000,
         messages: [{ role: 'user', content: prompt }]
       })
     });
    };

    try {
      let response = await callClaude(CLAUDE_MODEL_PRIMARY);

      if (response.status === 404) {
        const errorText = await response.text();
        console.error('Claude CTLT model not found:', CLAUDE_MODEL_PRIMARY, errorText);
        console.log('Retrying Claude CTLT with fallback model:', CLAUDE_MODEL_FALLBACK);
        response = await callClaude(CLAUDE_MODEL_FALLBACK);
      }
     
     if (!response.ok) {
       const error = await response.text();
       console.error('Claude CTLT API error:', response.status, error);
       return null;
     }
     
     const data = await response.json();
     const text = data.content?.[0]?.text;
     
     if (!text) {
        console.error('❌ CLAUDE CTLT FAILED: No text in response');
       return null;
     }
     
     let cleanText = text.trim();
     if (cleanText.startsWith('```')) {
       cleanText = cleanText.replace(/^```json?\n?/, '').replace(/\n?```$/, '');
     }
     
      const ctltMatches = JSON.parse(cleanText) as CTLTMatches;
      console.log('✅ CTLT STYLE MATCHING COMPLETE');
      console.log(`   Top match: ${ctltMatches.matched_styles?.[0]?.style_name} (${ctltMatches.matched_styles?.[0]?.match_score}/10)`);
      console.log(`   Styles to avoid: ${ctltMatches.styles_to_avoid?.map(s => s.style_name).join(', ')}`);
      return ctltMatches;
   } catch (error) {
      console.error('❌ CLAUDE CTLT MATCHING FAILED:', error);
     return null;
   }
 }
 
 function calculateInvisibilityScore(
   posts: Post[],
   visualDna: VisualDNA | null,
   voiceDna: VoiceDNA | null,
   followersCount: number
 ): { score: number; category: string } {
   let totalScore = 0;
   
   // 1. Posting Frequency (30% weight)
   // Assume posts span ~90 days, calculate posts per week
   const postsPerWeek = posts.length / 13; // ~90 days / 7
   let frequencyScore = 0;
   if (postsPerWeek >= 5) frequencyScore = 100;
   else if (postsPerWeek >= 3) frequencyScore = 75;
   else if (postsPerWeek >= 2) frequencyScore = 50;
   else if (postsPerWeek >= 1) frequencyScore = 30;
   else if (postsPerWeek >= 0.5) frequencyScore = 15;
   totalScore += frequencyScore * 0.30;
   
   // 2. Content Quality (25% weight)
   let qualityScore = 55; // default to mixed
   if (visualDna?.quality_assessment?.image_quality) {
     const quality = visualDna.quality_assessment.image_quality.toLowerCase();
     if (quality === 'professional') qualityScore = 100;
     else if (quality === 'semi-professional') qualityScore = 70;
     else if (quality === 'phone-camera') qualityScore = 40;
     else qualityScore = 55;
   }
   totalScore += qualityScore * 0.25;
   
   // 3. Brand Consistency (20% weight)
   let consistencyScore = 50; // default
   if (visualDna?.quality_assessment?.brand_coherence) {
     consistencyScore = visualDna.quality_assessment.brand_coherence * 10;
   }
   totalScore += consistencyScore * 0.20;
   
   // 4. Engagement Rate (15% weight)
   let engagementScore = 30; // default
   if (followersCount > 0 && posts.length > 0) {
     const avgLikes = posts.reduce((sum, p) => sum + (p.likesCount || 0), 0) / posts.length;
     const avgComments = posts.reduce((sum, p) => sum + (p.commentsCount || 0), 0) / posts.length;
     const engagementRate = ((avgLikes + avgComments) / followersCount) * 100;
     
     if (engagementRate >= 5) engagementScore = 100;
     else if (engagementRate >= 3) engagementScore = 80;
     else if (engagementRate >= 1.5) engagementScore = 60;
     else if (engagementRate >= 0.5) engagementScore = 30;
     else engagementScore = 10;
   }
   totalScore += engagementScore * 0.15;
   
   // 5. Caption Effort (10% weight)
   let captionScore = 50; // default
   if (voiceDna?.average_length) {
     const length = voiceDna.average_length.toLowerCase();
     if (length === 'long') captionScore = 100;
     else if (length === 'medium') captionScore = 70;
     else captionScore = 30;
   }
   totalScore += captionScore * 0.10;
   
   // Round to integer
   const finalScore = Math.round(totalScore);
   
   // Determine category
   let category: string;
   if (finalScore >= 80) category = 'Excellent';
   else if (finalScore >= 60) category = 'Strong';
   else if (finalScore >= 40) category = 'Average';
   else if (finalScore >= 20) category = 'Struggling';
   else category = 'Invisible';
   
   return { score: finalScore, category };
 }
 
 async function scrapeInstagramWithApify(
   handle: string,
   supabase: any,
   apiToken: string
 ): Promise<{ success: boolean; data?: any; error?: string }> {
   console.log('Scraping Instagram for:', handle);
   
   // Clean handle
   const username = handle.replace('@', '').trim();
   
   try {
     // Start Apify actor run
     const runResponse = await fetch(
       `https://api.apify.com/v2/acts/apify~instagram-profile-scraper/runs?token=${apiToken}`,
       {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
           usernames: [username],
           resultsLimit: 12,
         }),
       }
     );
 
     if (!runResponse.ok) {
       const errorText = await runResponse.text();
       console.error('Apify run start failed:', runResponse.status, errorText);
       return { success: false, error: 'Failed to start Instagram scraping' };
     }
 
     const runData = await runResponse.json();
     const runId = runData.data.id;
     const datasetId = runData.data.defaultDatasetId;
     
     console.log('Apify run started:', runId);
 
     // Poll for completion
     let status = 'RUNNING';
     let attempts = 0;
     const maxAttempts = 20;
 
     await new Promise(resolve => setTimeout(resolve, 3000));
 
     while (status === 'RUNNING' && attempts < maxAttempts) {
       const statusResponse = await fetch(
         `https://api.apify.com/v2/actor-runs/${runId}?token=${apiToken}`
       );
 
       if (!statusResponse.ok) {
         console.error('Status check failed:', statusResponse.status);
         break;
       }
 
       const statusData = await statusResponse.json();
       status = statusData.data.status;
       
       console.log('Run status:', status, 'Attempt:', attempts + 1);
 
       if (status === 'RUNNING') {
         await new Promise(resolve => setTimeout(resolve, 3000));
         attempts++;
       }
     }
 
     if (status !== 'SUCCEEDED') {
       return { success: false, error: `Scraping ${status.toLowerCase()}` };
     }
 
     // Fetch results
     const resultsResponse = await fetch(
       `https://api.apify.com/v2/datasets/${datasetId}/items?token=${apiToken}`
     );
 
     if (!resultsResponse.ok) {
       return { success: false, error: 'Failed to fetch results' };
     }
 
     const results = await resultsResponse.json();
     
     if (results.length === 0) {
       return { success: false, error: 'No profile data found (account may be private)' };
     }
 
     return { success: true, data: results[0] };
   } catch (error) {
     console.error('Apify scraping error:', error);
     return { success: false, error: error instanceof Error ? error.message : 'Scraping failed' };
   }
 }
 
  // Update instagram_company_data with fresh scrape data
  async function updateInstagramCompanyData(
    supabase: any,
    enrichedClubId: string,
    profileData: any,
    instagramUrl: string
  ): Promise<void> {
    try {
      const instagramCompanyData = {
        job_id: `vdna_${enrichedClubId}_${Date.now()}`,
        scraped_row_id: `vdna_row_${enrichedClubId}_${Date.now()}`,
        instagram_url: instagramUrl,
        username: profileData.username || '',
        full_name: profileData.fullName || null,
        biography: profileData.biography || null,
        external_url: profileData.externalUrl || null,
        followers_count: profileData.followersCount || 0,
        posts_count: profileData.postsCount || 0,
        is_business_account: profileData.isBusinessAccount || false,
        verified: profileData.verified || false,
        profile_pic_storage_url: profileData.profilePicUrlHD || profileData.profilePicUrl || null,
        related_profiles: profileData.relatedProfiles ? 
          profileData.relatedProfiles.map((p: any) => ({
            username: p.username,
            full_name: p.fullName
          })) : [],
        latest_posts: (profileData.latestPosts || []).slice(0, 12).map((post: any) => ({
          id: post.id,
          type: post.type,
          timestamp: post.timestamp,
          caption: post.caption,
          likesCount: post.likesCount,
          commentsCount: post.commentsCount,
          displayUrl: post.displayUrl,
          alt: post.alt,
          locationName: post.locationName
        })),
        raw_apify_data: profileData,
        scraped_at: new Date().toISOString()
      };
 
      // First check if we already have data for this username
      const { data: existing } = await supabase
        .from('instagram_company_data')
        .select('id')
        .ilike('username', profileData.username)
        .limit(1)
        .single();
 
      if (existing) {
        // Update existing record
        await supabase
          .from('instagram_company_data')
          .update({
            ...instagramCompanyData,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);
        console.log('Updated existing instagram_company_data record');
      } else {
        // Insert new record
        await supabase
          .from('instagram_company_data')
          .insert(instagramCompanyData);
        console.log('Inserted new instagram_company_data record');
      }
    } catch (error) {
      console.error('Failed to update instagram_company_data:', error);
      // Don't throw - this is not critical for the analysis
    }
  }
 
 Deno.serve(async (req) => {
   if (req.method === 'OPTIONS') {
     return new Response(null, { headers: corsHeaders });
   }
 
   const startTime = Date.now();
    let currentStep = 'initializing';
 
   try {
     const { enriched_club_id, visual_dna_row_id } = await req.json();
     
     if (!enriched_club_id) {
       return new Response(
         JSON.stringify({ error: 'enriched_club_id is required', code: 'INVALID_INPUT' }),
         { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
     console.log('Analyzing Visual DNA for club:', enriched_club_id);
 
     // Initialize Supabase client
     const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
     const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
     const supabase = createClient(supabaseUrl, supabaseKey);
 
     // Get API keys
     const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
     const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
     const APIFY_API_TOKEN = Deno.env.get('APIFY_API_TOKEN');
 
     if (!GEMINI_API_KEY || !ANTHROPIC_API_KEY) {
       console.error('Missing required API keys');
       return new Response(
         JSON.stringify({ error: 'API keys not configured', code: 'CONFIG_ERROR' }),
         { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
     // Fetch club data
     const { data: club, error: clubError } = await supabase
       .from('enriched_clubs')
       .select('*')
       .eq('id', enriched_club_id)
       .single();
 
     if (clubError || !club) {
       console.error('Club not found:', clubError);
       return new Response(
         JSON.stringify({ error: 'Club not found', code: 'NOT_FOUND' }),
         { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
     if (!club.instagram_handle) {
       return new Response(
         JSON.stringify({ error: 'No Instagram handle found', code: 'NO_HANDLE' }),
         { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
     const username = club.instagram_handle.replace('@', '').toLowerCase();
      console.log('===== VISUAL DNA ANALYSIS START =====');
      console.log('Club:', club.club_name, '| Instagram:', username);
 
      // ALWAYS perform a fresh Instagram scrape to get valid image URLs
     let posts: Post[] = [];
     let followersCount = club.instagram_followers || 0;
      let profileData: any = null;
 
      if (!APIFY_API_TOKEN) {
        return new Response(
          JSON.stringify({ error: 'APIFY_API_TOKEN not configured', code: 'CONFIG_ERROR' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
 
      // Step 1: Fresh Instagram scrape
      currentStep = 'scraping_instagram';
      console.log('Step 1: Scraping Instagram fresh...');
      const scrapeResult = await scrapeInstagramWithApify(username, supabase, APIFY_API_TOKEN);
      
      if (!scrapeResult.success) {
        console.error('Instagram scrape failed:', scrapeResult.error);
        if (visual_dna_row_id) {
          await supabase
            .from('visual_dna_rows')
            .update({ 
              status: 'failed', 
              error_message: scrapeResult.error,
              updated_at: new Date().toISOString()
            })
            .eq('id', visual_dna_row_id);
       }
        
       return new Response(
          JSON.stringify({ error: scrapeResult.error, code: 'SCRAPE_FAILED', step: currentStep }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
      
      profileData = scrapeResult.data;
      followersCount = profileData.followersCount || followersCount;
      
      // Transform posts - use fresh displayUrl from Apify
      posts = (profileData.latestPosts || []).slice(0, 12).map((p: any) => ({
        id: p.id || p.shortCode,
        type: p.type,
        timestamp: p.timestamp,
        caption: p.caption || '',
        likesCount: p.likesCount || 0,
        commentsCount: p.commentsCount || 0,
        displayUrl: p.displayUrl,
        alt: p.alt
      }));
      
      console.log(`Scraped ${posts.length} posts, ${followersCount} followers`);
      console.log('Sample post URLs:', posts.slice(0, 2).map(p => p.displayUrl?.substring(0, 60) + '...'));
 
      // Update instagram_company_data with fresh data immediately after scrape
      await updateInstagramCompanyData(
        supabase,
        enriched_club_id,
        profileData,
        `https://instagram.com/${username}`
      );

     // Check minimum posts
     if (posts.length < 4) {
        console.error('Not enough posts:', posts.length);
       if (visual_dna_row_id) {
         await supabase
           .from('visual_dna_rows')
           .update({ 
             status: 'failed', 
             error_message: 'Not enough posts for analysis (minimum 4 required)',
             posts_analyzed: posts.length,
             updated_at: new Date().toISOString()
           })
           .eq('id', visual_dna_row_id);
       }
       
       return new Response(
          JSON.stringify({ error: 'Not enough posts for analysis (minimum 4 required)', code: 'INSUFFICIENT_POSTS', posts_found: posts.length }),
         { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
      // Step 2: Visual analysis with Gemini
      currentStep = 'analyzing_images';
       console.log('\n📸 Step 2: VISUAL ANALYSIS WITH GEMINI');
      const geminiResult = await analyzeVisualWithGemini(posts, GEMINI_API_KEY);
      const { visualDna, imagesAnalyzed, error: geminiError, downloadResults } = geminiResult;
      
      // Log download summary
      console.log('\n📊 IMAGE DOWNLOAD RESULTS:');
      downloadResults.forEach(r => {
        if (r.success) {
          console.log(`   Image ${r.index}: ✅ ${Math.round((r.sizeBytes || 0) / 1024)}KB (${r.mimeType})`);
        } else {
          console.log(`   Image ${r.index}: ❌ ${r.error}`);
        }
      });
      console.log(`\nGemini result: ${imagesAnalyzed} images analyzed, visualDna: ${visualDna ? '✅ SUCCESS' : '❌ FAILED'}`);
      if (geminiError) console.log('Gemini error details:', geminiError);
 
      // Step 3: Voice analysis with Claude
      currentStep = 'analyzing_captions';
       console.log('\n🎤 Step 3: VOICE ANALYSIS WITH CLAUDE');
      const voiceDna = await analyzeVoiceWithClaude(posts, ANTHROPIC_API_KEY);
       console.log(`Claude result: voiceDna: ${voiceDna ? '✅ SUCCESS' : '❌ FAILED'}`);

      // Step 4: CTLT matching (depends on visual DNA)
      currentStep = 'matching_styles';
     let ctltMatches: CTLTMatches | null = null;
     if (visualDna) {
         console.log('\n🎨 Step 4: CTLT STYLE MATCHING');
       ctltMatches = await matchCTLTStylesWithClaude(visualDna, ANTHROPIC_API_KEY);
         console.log(`CTLT result: ${ctltMatches ? '✅ SUCCESS' : '❌ FAILED'}`);
     }
 
      // Step 5: Calculate invisibility score
      currentStep = 'calculating_score';
       console.log('\n📊 Step 5: CALCULATING INVISIBILITY SCORE');
      
     // Calculate score even if visual analysis failed (will use defaults)
     if (!visualDna) {
       console.warn('Visual analysis failed, calculating partial score with voice data only');
       console.warn('Gemini error was:', geminiError);
      }
 
     const { score: invisibilityScore, category: invisibilityCategory } = calculateInvisibilityScore(
       posts,
       visualDna,
       voiceDna,
       followersCount
     );
 
     console.log('Invisibility Score:', invisibilityScore, invisibilityCategory);
     if (!visualDna) {
       console.log('Note: Score calculated without visual analysis (using defaults)');
     }
 
      // Step 6: Update database
      currentStep = 'saving_results';
      console.log('Step 6: Saving results...');
 
     const updateData: any = {
       invisibility_score: invisibilityScore,
       invisibility_category: invisibilityCategory,
        visual_dna_analyzed_at: new Date().toISOString(),
        instagram_followers: followersCount
     };
 
     if (visualDna) updateData.visual_dna = visualDna;
     if (voiceDna) updateData.voice_dna = voiceDna;
     if (ctltMatches) updateData.ctlt_matches = ctltMatches;
 
     const { error: updateError } = await supabase
       .from('enriched_clubs')
       .update(updateData)
       .eq('id', enriched_club_id);
 
     if (updateError) {
       console.error('Failed to update enriched_clubs:', updateError);
     }
 
      // Update instagram_company_data with fresh data
      await updateInstagramCompanyData(
        supabase,
        enriched_club_id,
        profileData,
        `https://instagram.com/${username}`
      );
 
     // Update visual_dna_row if provided
     const processingTime = Date.now() - startTime;
     if (visual_dna_row_id) {
       await supabase
         .from('visual_dna_rows')
         .update({ 
           status: 'completed',
            posts_analyzed: imagesAnalyzed,
           processing_time_ms: processingTime,
           updated_at: new Date().toISOString()
         })
         .eq('id', visual_dna_row_id);
     }
 
       console.log('\n========================================');
       console.log('🎉 VISUAL DNA ANALYSIS COMPLETE');
       console.log('========================================');
       console.log(`⏱️  Total time: ${processingTime}ms`);
       console.log(`📷 Images downloaded: ${downloadResults.filter(r => r.success).length}/${downloadResults.length}`);
       console.log(`🔍 Images analyzed: ${imagesAnalyzed}`);
       console.log(`📊 Invisibility Score: ${invisibilityScore} (${invisibilityCategory})`);
       console.log(`✅ Visual DNA: ${visualDna ? 'Yes' : 'No'}`);
       console.log(`✅ Voice DNA: ${voiceDna ? 'Yes' : 'No'}`);
       console.log(`✅ CTLT Matches: ${ctltMatches ? 'Yes' : 'No'}`);
       console.log('========================================\n');
 
     return new Response(
       JSON.stringify({
         success: true,
         club_id: enriched_club_id,
         invisibility_score: invisibilityScore,
         invisibility_category: invisibilityCategory,
          posts_found: posts.length,
          images_analyzed: imagesAnalyzed,
          images_downloaded: downloadResults.filter(r => r.success).length,
          images_failed: downloadResults.filter(r => !r.success).length,
         processing_time_ms: processingTime,
         has_visual_dna: !!visualDna,
         has_voice_dna: !!voiceDna,
         has_ctlt_matches: !!ctltMatches,
         visual_analysis_error: geminiError || null,
          partial_score: !visualDna,
          download_details: downloadResults
       }),
       { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
     );
 
   } catch (error) {
     console.error('Visual DNA analysis error:', error);
     return new Response(
        JSON.stringify({ error: error instanceof Error ? error.message : 'Analysis failed', code: 'INTERNAL_ERROR', step: currentStep }),
       { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
     );
   }
 });