import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

interface PersonInput {
  person_name: string;
  context?: string;
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
      console.log('Unauthorized access attempt to api-create-people-job');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    
    // Support both single person and bulk modes
    let people: PersonInput[] = [];
    
    if (body.people && Array.isArray(body.people)) {
      // Bulk mode: { people: [{ person_name, context }, ...] }
      people = body.people;
    } else if (body.person_name) {
      // Single person mode: { person_name, context }
      people = [{
        person_name: body.person_name,
        context: body.context
      }];
    } else {
      return new Response(
        JSON.stringify({ error: 'Either provide a single person (person_name) or bulk (people array)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (people.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No people provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate inputs
    for (const person of people) {
      if (!person.person_name || person.person_name.trim() === '') {
        return new Response(
          JSON.stringify({ error: 'Each person must have a person_name' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log(`api-create-people-job: Creating job for ${people.length} people`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Generate API-prefixed job ID
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const jobId = `API_PEOPLE_${timestamp}_${randomSuffix}`;
    const projectId = body.project_id || `api_project_${timestamp}`;

    // Create the people job
    const { error: jobError } = await supabase
      .from('people_jobs')
      .insert({
        id: jobId,
        project_id: projectId,
        status: 'pending',
        total_rows: people.length,
        processed_rows: 0,
        estimated_cost_usd: 0
      });

    if (jobError) {
      console.error('Failed to create people job:', jobError);
      return new Response(
        JSON.stringify({ error: 'Failed to create job', details: jobError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`api-create-people-job: Created job ${jobId}`);

    // Insert all people rows
    const peopleRows = people.map(person => ({
      job_id: jobId,
      person_name: person.person_name.trim(),
      context: person.context?.trim() || null,
      status: 'pending'
    }));

    const { error: rowsError } = await supabase
      .from('people_rows')
      .insert(peopleRows);

    if (rowsError) {
      console.error('Failed to insert people rows:', rowsError);
      // Cleanup the job if rows failed to insert
      await supabase.from('people_jobs').delete().eq('id', jobId);
      return new Response(
        JSON.stringify({ error: 'Failed to create people rows', details: rowsError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`api-create-people-job: Inserted ${peopleRows.length} people rows`);

    // Update job status to processing
    await supabase
      .from('people_jobs')
      .update({ status: 'processing' })
      .eq('id', jobId);

    return new Response(
      JSON.stringify({
        success: true,
        job_id: jobId,
        project_id: projectId,
        total_people: people.length,
        status_endpoint: `/api-get-people-status?job_id=${jobId}`,
        results_endpoint: `/api-get-people?job_id=${jobId}`,
        message: `People research job created with ${people.length} person(s)`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in api-create-people-job:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
