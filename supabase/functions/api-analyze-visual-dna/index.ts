 import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
 
 const corsHeaders = {
   'Access-Control-Allow-Origin': '*',
   'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
 };
 
 Deno.serve(async (req) => {
   // Handle CORS preflight
   if (req.method === 'OPTIONS') {
     return new Response('ok', { headers: corsHeaders });
   }
 
   try {
     // Validate API key
     const apiKey = req.headers.get('x-api-key');
     const expectedKey = Deno.env.get('CRM_API_KEY');
     
     if (!apiKey || apiKey !== expectedKey) {
       console.log('Unauthorized access attempt to api-analyze-visual-dna');
       return new Response(
         JSON.stringify({ error: 'Unauthorized' }),
         { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
     // Parse request body
     const body = await req.json();
     const { enriched_club_id, instagram_handle } = body;
 
     if (!enriched_club_id && !instagram_handle) {
       return new Response(
         JSON.stringify({ 
           error: 'Either enriched_club_id or instagram_handle is required',
           code: 'INVALID_INPUT'
         }),
         { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
     console.log(`api-analyze-visual-dna: enriched_club_id=${enriched_club_id || 'none'}, instagram_handle=${instagram_handle || 'none'}`);
 
     // Initialize Supabase client
     const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
     const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
     const supabase = createClient(supabaseUrl, supabaseKey);
 
     // Call the existing analyze-visual-dna edge function
     // This function handles all the heavy lifting: Instagram scrape, Gemini, Claude, scoring
     const analyzePayload: Record<string, string> = {};
     
     if (enriched_club_id) {
       analyzePayload.enriched_club_id = enriched_club_id;
     } else if (instagram_handle) {
       // Direct mode - pass instagram_handle
       analyzePayload.instagram_handle = instagram_handle;
     }
 
     console.log('Calling analyze-visual-dna with payload:', analyzePayload);
     
     const { data: analyzeResult, error: analyzeError } = await supabase.functions.invoke(
       'analyze-visual-dna',
       { body: analyzePayload }
     );
 
     if (analyzeError) {
       console.error('analyze-visual-dna error:', analyzeError);
       
       // Try to extract detailed error from context
       let errorMessage = analyzeError.message || 'Analysis failed';
       let errorCode = 'ANALYSIS_ERROR';
       
       try {
         const contextBody = analyzeError.context?.body;
         if (contextBody) {
           const parsed = typeof contextBody === 'string' ? JSON.parse(contextBody) : contextBody;
           errorMessage = parsed.error || errorMessage;
           errorCode = parsed.code || errorCode;
         }
       } catch {
         // Ignore parse errors
       }
       
       return new Response(
         JSON.stringify({ 
           error: errorMessage,
           code: errorCode
         }),
         { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
     // If we used enriched_club_id mode, fetch the updated club data to get full results
     // (The analyze function only returns summary in club mode, full data in direct mode)
     if (enriched_club_id && analyzeResult?.success) {
       console.log('Fetching updated club data after analysis...');
       
       const { data: updatedClub, error: clubError } = await supabase
         .from('enriched_clubs')
         .select(`
           id,
           club_name,
           instagram_handle,
           visual_dna,
           voice_dna,
           ctlt_matches,
           invisibility_score,
           invisibility_category,
           visual_dna_analyzed_at,
           visual_dna_media_urls,
           score_factors,
           instagram_followers,
           instagram_bio
         `)
         .eq('id', enriched_club_id)
         .single();
 
       if (clubError) {
         console.error('Failed to fetch updated club:', clubError);
       }
 
       // Return combined result with full data
       return new Response(
         JSON.stringify({
           success: true,
           mode: 'enriched_club',
           club_id: enriched_club_id,
           instagram_handle: updatedClub?.instagram_handle || analyzeResult.instagram_handle,
           invisibility_score: updatedClub?.invisibility_score ?? analyzeResult.invisibility_score,
           invisibility_category: updatedClub?.invisibility_category ?? analyzeResult.invisibility_category,
           visual_dna: updatedClub?.visual_dna || null,
           voice_dna: updatedClub?.voice_dna || null,
           ctlt_matches: updatedClub?.ctlt_matches || null,
           score_factors: updatedClub?.score_factors || null,
           visual_dna_analyzed_at: updatedClub?.visual_dna_analyzed_at || null,
           visual_dna_media_urls: updatedClub?.visual_dna_media_urls || [],
           // Include analysis stats from the function response
           posts_found: analyzeResult.posts_found,
           images_analyzed: analyzeResult.images_analyzed,
           images_downloaded: analyzeResult.images_downloaded,
           images_failed: analyzeResult.images_failed,
           processing_time_ms: analyzeResult.processing_time_ms,
           has_visual_dna: analyzeResult.has_visual_dna,
           has_voice_dna: analyzeResult.has_voice_dna,
           has_ctlt_matches: analyzeResult.has_ctlt_matches,
           visual_analysis_error: analyzeResult.visual_analysis_error,
           partial_score: analyzeResult.partial_score
         }),
         { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
     // Direct mode - the analyze function already returns full data
     if (analyzeResult?.direct_mode || instagram_handle) {
       return new Response(
         JSON.stringify({
           success: true,
           mode: 'direct',
           instagram_handle: analyzeResult.instagram_handle,
           invisibility_score: analyzeResult.invisibility_score,
           invisibility_category: analyzeResult.invisibility_category,
           visual_dna: analyzeResult.visual_dna || null,
           voice_dna: analyzeResult.voice_dna || null,
           ctlt_matches: analyzeResult.ctlt_matches || null,
           score_factors: analyzeResult.score_factors || null,
           profile_data: analyzeResult.profile_data || null,
           // Include analysis stats
           posts_found: analyzeResult.posts_found,
           images_analyzed: analyzeResult.images_analyzed,
           images_downloaded: analyzeResult.images_downloaded,
           images_failed: analyzeResult.images_failed,
           processing_time_ms: analyzeResult.processing_time_ms,
           has_visual_dna: analyzeResult.has_visual_dna,
           has_voice_dna: analyzeResult.has_voice_dna,
           has_ctlt_matches: analyzeResult.has_ctlt_matches,
           visual_analysis_error: analyzeResult.visual_analysis_error,
           partial_score: analyzeResult.partial_score,
           download_details: analyzeResult.download_details
         }),
         { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
     // Fallback: return whatever the analyze function returned
     return new Response(
       JSON.stringify(analyzeResult),
       { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
     );
 
   } catch (error) {
     console.error('Error in api-analyze-visual-dna:', error);
     return new Response(
       JSON.stringify({ 
         error: error instanceof Error ? error.message : 'Unknown error',
         code: 'INTERNAL_ERROR'
       }),
       { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
     );
   }
 });