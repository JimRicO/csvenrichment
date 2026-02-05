 import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
 
 async function fetchImageAsBase64(url: string): Promise<string | null> {
   try {
     const response = await fetch(url, {
       headers: {
         'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
         'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
       }
     });
     if (!response.ok) return null;
     
     const buffer = await response.arrayBuffer();
     const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
     return base64;
   } catch (error) {
     console.error('Failed to fetch image:', url, error);
     return null;
   }
 }
 
 async function analyzeVisualWithGemini(posts: Post[], apiKey: string): Promise<VisualDNA | null> {
   console.log('Starting Gemini visual analysis with', posts.length, 'posts');
   
   // Build image parts for multimodal request
   const imageParts: any[] = [];
   
   for (const post of posts.slice(0, 12)) {
     if (!post.displayUrl) continue;
     
     const base64Image = await fetchImageAsBase64(post.displayUrl);
     if (base64Image) {
       imageParts.push({
         inline_data: {
           mime_type: "image/jpeg",
           data: base64Image
         }
       });
     }
   }
   
   if (imageParts.length < 4) {
     console.error('Not enough valid images for analysis:', imageParts.length);
     return null;
   }
   
   console.log('Sending', imageParts.length, 'images to Gemini');
   
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
 
   try {
     const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent', {
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
     
     if (!response.ok) {
       const error = await response.text();
       console.error('Gemini API error:', response.status, error);
       return null;
     }
     
     const data = await response.json();
     const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
     
     if (!text) {
       console.error('No text in Gemini response');
       return null;
     }
     
     // Clean up response (remove markdown if present)
     let cleanText = text.trim();
     if (cleanText.startsWith('```')) {
       cleanText = cleanText.replace(/^```json?\n?/, '').replace(/\n?```$/, '');
     }
     
     console.log('Gemini response:', cleanText.substring(0, 200));
     return JSON.parse(cleanText) as VisualDNA;
   } catch (error) {
     console.error('Gemini analysis failed:', error);
     return null;
   }
 }
 
 async function analyzeVoiceWithClaude(posts: Post[], apiKey: string): Promise<VoiceDNA | null> {
   console.log('Starting Claude voice analysis');
   
   const captions = posts
     .map(p => p.caption)
     .filter(c => c && c.trim().length > 0)
     .slice(0, 12);
   
   if (captions.length === 0) {
     console.log('No captions to analyze');
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
 
   try {
     const response = await fetch('https://api.anthropic.com/v1/messages', {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json',
         'x-api-key': apiKey,
         'anthropic-version': '2023-06-01'
       },
       body: JSON.stringify({
         model: 'claude-sonnet-4-5-20241022',
         max_tokens: 2000,
         messages: [{ role: 'user', content: prompt }]
       })
     });
     
     if (!response.ok) {
       const error = await response.text();
       console.error('Claude API error:', response.status, error);
       return null;
     }
     
     const data = await response.json();
     const text = data.content?.[0]?.text;
     
     if (!text) {
       console.error('No text in Claude response');
       return null;
     }
     
     let cleanText = text.trim();
     if (cleanText.startsWith('```')) {
       cleanText = cleanText.replace(/^```json?\n?/, '').replace(/\n?```$/, '');
     }
     
     console.log('Claude voice response:', cleanText.substring(0, 200));
     return JSON.parse(cleanText) as VoiceDNA;
   } catch (error) {
     console.error('Claude voice analysis failed:', error);
     return null;
   }
 }
 
 async function matchCTLTStylesWithClaude(visualDna: VisualDNA, apiKey: string): Promise<CTLTMatches | null> {
   console.log('Starting CTLT style matching');
   
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
 
   try {
     const response = await fetch('https://api.anthropic.com/v1/messages', {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json',
         'x-api-key': apiKey,
         'anthropic-version': '2023-06-01'
       },
       body: JSON.stringify({
         model: 'claude-sonnet-4-5-20241022',
         max_tokens: 2000,
         messages: [{ role: 'user', content: prompt }]
       })
     });
     
     if (!response.ok) {
       const error = await response.text();
       console.error('Claude CTLT API error:', response.status, error);
       return null;
     }
     
     const data = await response.json();
     const text = data.content?.[0]?.text;
     
     if (!text) {
       console.error('No text in Claude CTLT response');
       return null;
     }
     
     let cleanText = text.trim();
     if (cleanText.startsWith('```')) {
       cleanText = cleanText.replace(/^```json?\n?/, '').replace(/\n?```$/, '');
     }
     
     console.log('Claude CTLT response:', cleanText.substring(0, 200));
     return JSON.parse(cleanText) as CTLTMatches;
   } catch (error) {
     console.error('Claude CTLT matching failed:', error);
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
 
 serve(async (req) => {
   if (req.method === 'OPTIONS') {
     return new Response(null, { headers: corsHeaders });
   }
 
   const startTime = Date.now();
 
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
     console.log('Looking up Instagram data for:', username);
 
     // Check for existing Instagram data
     let instagramData: any = null;
     let posts: Post[] = [];
     let followersCount = club.instagram_followers || 0;
 
     const { data: existingData } = await supabase
       .from('instagram_company_data')
       .select('*')
       .ilike('username', username)
       .order('scraped_at', { ascending: false })
       .limit(1)
       .single();
 
     if (existingData && existingData.latest_posts && Array.isArray(existingData.latest_posts) && existingData.latest_posts.length >= 4) {
       console.log('Using existing Instagram data, posts:', existingData.latest_posts.length);
       instagramData = existingData;
       posts = existingData.latest_posts as Post[];
       followersCount = existingData.followers_count || followersCount;
     } else if (APIFY_API_TOKEN) {
       // Scrape Instagram
       console.log('No existing data found, scraping Instagram...');
       const scrapeResult = await scrapeInstagramWithApify(username, supabase, APIFY_API_TOKEN);
       
       if (!scrapeResult.success) {
         // Update visual_dna_row to failed if provided
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
           JSON.stringify({ error: scrapeResult.error, code: 'SCRAPE_FAILED' }),
           { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
         );
       }
       
       const profileData = scrapeResult.data;
       followersCount = profileData.followersCount || followersCount;
       
       // Transform posts
       posts = (profileData.latestPosts || []).map((p: any) => ({
         id: p.id,
         type: p.type,
         timestamp: p.timestamp,
         caption: p.caption || '',
         likesCount: p.likesCount || 0,
         commentsCount: p.commentsCount || 0,
         displayUrl: p.displayUrl,
         alt: p.alt
       }));
       
       console.log('Scraped', posts.length, 'posts');
     } else {
       return new Response(
         JSON.stringify({ error: 'No Instagram data available and APIFY_API_TOKEN not configured', code: 'NO_DATA' }),
         { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
     // Check minimum posts
     if (posts.length < 4) {
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
         JSON.stringify({ error: 'Not enough posts for analysis (minimum 4 required)', code: 'INSUFFICIENT_POSTS' }),
         { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
     // Run AI analyses in parallel
     console.log('Running AI analyses...');
     const [visualDna, voiceDna] = await Promise.all([
       analyzeVisualWithGemini(posts, GEMINI_API_KEY),
       analyzeVoiceWithClaude(posts, ANTHROPIC_API_KEY)
     ]);
 
     // CTLT matching (depends on visual DNA)
     let ctltMatches: CTLTMatches | null = null;
     if (visualDna) {
       ctltMatches = await matchCTLTStylesWithClaude(visualDna, ANTHROPIC_API_KEY);
     }
 
     // Calculate invisibility score
     const { score: invisibilityScore, category: invisibilityCategory } = calculateInvisibilityScore(
       posts,
       visualDna,
       voiceDna,
       followersCount
     );
 
     console.log('Invisibility Score:', invisibilityScore, invisibilityCategory);
 
     // Update enriched_clubs with results
     const updateData: any = {
       invisibility_score: invisibilityScore,
       invisibility_category: invisibilityCategory,
       visual_dna_analyzed_at: new Date().toISOString()
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
 
     // Update visual_dna_row if provided
     const processingTime = Date.now() - startTime;
     if (visual_dna_row_id) {
       await supabase
         .from('visual_dna_rows')
         .update({ 
           status: 'completed',
           posts_analyzed: posts.length,
           processing_time_ms: processingTime,
           updated_at: new Date().toISOString()
         })
         .eq('id', visual_dna_row_id);
     }
 
     console.log('Visual DNA analysis complete in', processingTime, 'ms');
 
     return new Response(
       JSON.stringify({
         success: true,
         club_id: enriched_club_id,
         invisibility_score: invisibilityScore,
         invisibility_category: invisibilityCategory,
         posts_analyzed: posts.length,
         processing_time_ms: processingTime,
         has_visual_dna: !!visualDna,
         has_voice_dna: !!voiceDna,
         has_ctlt_matches: !!ctltMatches
       }),
       { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
     );
 
   } catch (error) {
     console.error('Visual DNA analysis error:', error);
     return new Response(
       JSON.stringify({ error: error instanceof Error ? error.message : 'Analysis failed', code: 'INTERNAL_ERROR' }),
       { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
     );
   }
 });