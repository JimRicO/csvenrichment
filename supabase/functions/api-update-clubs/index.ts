import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

interface ClubUpdate {
  id: string;
  perplexity_description?: string;
  founder_info?: string;
  founding_year?: string;
  recent_activities?: any[];
  perplexity_citations?: string[];
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Only accept POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Validate API key
    const apiKey = req.headers.get('x-api-key');
    const expectedKey = Deno.env.get('CRM_API_KEY');
    
    if (!apiKey || apiKey !== expectedKey) {
      console.log('Unauthorized access attempt to api-update-clubs');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body = await req.json();
    const clubs: ClubUpdate[] = body.clubs;

    if (!clubs || !Array.isArray(clubs)) {
      return new Response(
        JSON.stringify({ error: 'Invalid request body. Expected { clubs: [...] }' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`api-update-clubs: received ${clubs.length} clubs to update`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const results = {
      updated: 0,
      failed: 0,
      errors: [] as { id: string; error: string }[]
    };

    // Process each club update
    for (const club of clubs) {
      if (!club.id) {
        results.failed++;
        results.errors.push({ id: 'unknown', error: 'Missing required id field' });
        continue;
      }

      // Build update object with only provided fields
      const updateData: Record<string, any> = {
        updated_at: new Date().toISOString()
      };

      if (club.perplexity_description !== undefined) {
        updateData.perplexity_description = club.perplexity_description;
      }
      if (club.founder_info !== undefined) {
        updateData.founder_info = club.founder_info;
      }
      if (club.founding_year !== undefined) {
        updateData.founding_year = club.founding_year;
      }
      if (club.recent_activities !== undefined) {
        updateData.recent_activities = club.recent_activities;
      }
      if (club.perplexity_citations !== undefined) {
        updateData.perplexity_citations = club.perplexity_citations;
      }

      const { error } = await supabase
        .from('enriched_clubs')
        .update(updateData)
        .eq('id', club.id);

      if (error) {
        console.error(`Failed to update club ${club.id}:`, error);
        results.failed++;
        results.errors.push({ id: club.id, error: error.message });
      } else {
        results.updated++;
      }
    }

    console.log(`api-update-clubs: updated ${results.updated}, failed ${results.failed}`);

    return new Response(
      JSON.stringify({
        success: results.failed === 0,
        updated: results.updated,
        failed: results.failed,
        errors: results.errors.length > 0 ? results.errors : undefined
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in api-update-clubs:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
