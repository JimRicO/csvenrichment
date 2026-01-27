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

    // Fetch all enriched clubs for this job
    const { data: clubs, error: clubsError } = await supabase
      .from('enriched_clubs')
      .select('*')
      .eq('job_id', job_id)
      .order('created_at', { ascending: true });

    if (clubsError) {
      console.error('Failed to fetch enriched clubs:', clubsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!clubs || clubs.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No enriched clubs found for this job' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Define CSV columns
    const columns = [
      'club_name',
      'website_url',
      'instagram_handle',
      'logo_storage_url',
      'instagram_followers',
      'instagram_bio',
      'instagram_profile_pic_url',
      'address',
      'phone',
      'email',
      'primary_color',
      'secondary_color',
      'accent_color',
      'background_color',
      'primary_font',
      'heading_font',
      'description',
      'attitude',
      'aesthetics',
      'created_at'
    ];

    // Build CSV header
    const escapeCSV = (value: any): string => {
      if (value === null || value === undefined) return '';
      const str = String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvRows: string[] = [];
    csvRows.push(columns.join(','));

    // Build CSV rows
    for (const club of clubs) {
      const colorPalette = club.color_palette || {};
      const fonts = club.fonts || {};

      const row = [
        club.club_name,
        club.website_url,
        club.instagram_handle,
        club.logo_storage_url,
        club.instagram_followers,
        club.instagram_bio,
        club.instagram_profile_pic_url,
        club.address,
        club.phone,
        club.email,
        colorPalette.primary,
        colorPalette.secondary,
        colorPalette.accent,
        colorPalette.background,
        fonts.primary,
        fonts.heading,
        club.description,
        club.attitude,
        club.aesthetics,
        club.created_at
      ].map(escapeCSV);

      csvRows.push(row.join(','));
    }

    const csvContent = csvRows.join('\n');

    return new Response(csvContent, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="enriched_clubs_${job_id}.csv"`
      }
    });

  } catch (error) {
    console.error('Error in download-enrichment-csv:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
