import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

// All updatable fields in enriched_people table
const UPDATABLE_FIELDS = [
  'person_name',
  'context',
  'job_title',
  'company',
  'department',
  'location',
  'biography',
  'biography_source',
  'photo_url',
  'email',
  'email_confidence',
  'email_pattern',
  'email_source',
  'phone',
  'phone_source',
  'linkedin_url',
  'twitter_handle',
  'website',
  'other_socials',
  'education',
  'previous_roles',
  'career_highlights',
  'start_date',
  'reports_to',
  'role_source',
  'notable_achievements',
  'achievements_source',
  'key_interests',
  'communication_style',
  'recent_news',
  'notable_content',
  'quotes',
  'conversation_starters',
  'research_summary',
  'confidence_score',
  'aliases',
  'all_citations'
];

interface PersonUpdate {
  id: string;
  [key: string]: unknown;
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
      console.log('Unauthorized access attempt to api-update-people');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    
    // Expect { people: [{ id, ...fields }, ...] }
    if (!body.people || !Array.isArray(body.people) || body.people.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Request body must contain a non-empty "people" array' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const people: PersonUpdate[] = body.people;

    // Validate each person has an id
    for (const person of people) {
      if (!person.id) {
        return new Response(
          JSON.stringify({ error: 'Each person must have an "id" field' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log(`api-update-people: Updating ${people.length} people`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let updated = 0;
    let failed = 0;
    const errors: { id: string; error: string }[] = [];

    // Process each person update
    for (const person of people) {
      const { id, ...fields } = person;

      // Filter to only updatable fields
      const updateData: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(fields)) {
        if (UPDATABLE_FIELDS.includes(key)) {
          updateData[key] = value;
        }
      }

      if (Object.keys(updateData).length === 0) {
        errors.push({ id, error: 'No valid updatable fields provided' });
        failed++;
        continue;
      }

      // Add updated_at timestamp
      updateData.updated_at = new Date().toISOString();

      const { error: updateError } = await supabase
        .from('enriched_people')
        .update(updateData)
        .eq('id', id);

      if (updateError) {
        console.error(`Failed to update person ${id}:`, updateError);
        errors.push({ id, error: updateError.message });
        failed++;
      } else {
        updated++;
      }
    }

    console.log(`api-update-people: Updated ${updated}, failed ${failed}`);

    return new Response(
      JSON.stringify({
        success: failed === 0,
        updated,
        failed,
        errors: errors.length > 0 ? errors : undefined
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in api-update-people:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
