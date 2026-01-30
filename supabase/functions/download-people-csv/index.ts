import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { job_id } = await req.json();

    if (!job_id) {
      return new Response(
        JSON.stringify({ error: 'job_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all enriched people for this job
    const { data: people, error } = await supabase
      .from('enriched_people')
      .select('*')
      .eq('job_id', job_id)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch people: ${error.message}`);
    }

    if (!people || people.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No enriched people found for this job' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Define CSV columns
    const columns = [
      'person_name',
      'context',
      'job_title',
      'company',
      'biography',
      'biography_source',
      'role_source',
      'notable_achievements',
      'achievements_source',
      'email',
      'email_source',
      'phone',
      'phone_source',
      'linkedin_url',
      'twitter_handle',
      'previous_roles',
      'education',
      'other_socials',
      'confidence_score',
      'all_citations'
    ];

    // Helper to escape CSV values
    const escapeCsv = (value: any): string => {
      if (value === null || value === undefined) return '';
      const str = typeof value === 'object' ? JSON.stringify(value) : String(value);
      // Escape quotes and wrap in quotes if contains comma, quote, or newline
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    // Build CSV content
    const headerRow = columns.join(',');
    const dataRows = people.map(person => {
      return columns.map(col => escapeCsv((person as any)[col])).join(',');
    });

    const csvContent = [headerRow, ...dataRows].join('\n');

    return new Response(csvContent, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="enriched_people_${job_id}.csv"`
      }
    });

  } catch (error) {
    console.error('Error in download-people-csv:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
