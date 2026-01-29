import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
        JSON.stringify({ error: 'job_id parameter is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get job info
    const { data: job, error: jobError } = await supabase
      .from('scraping_jobs')
      .select('project_id')
      .eq('id', job_id)
      .single();

    if (jobError || !job) {
      return new Response(
        JSON.stringify({ error: 'Job not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get all completed rows
    const { data: rows, error: rowsError } = await supabase
      .from('scraped_rows')
      .select('*')
      .eq('job_id', job_id)
      .eq('extraction_status', 'completed')
      .order('created_at');

    if (rowsError) {
      console.error('Error fetching rows:', rowsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!rows || rows.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No completed extractions found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get all people for this job
    const { data: people, error: peopleError } = await supabase
      .from('people')
      .select('*')
      .eq('job_id', job_id)
      .order('created_at');

    if (peopleError) {
      console.error('Error fetching people:', peopleError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch people data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create a map of scraped_row_id -> people[]
    const peopleByRow = new Map<string, any[]>();
    if (people) {
      for (const person of people) {
        if (!peopleByRow.has(person.scraped_row_id)) {
          peopleByRow.set(person.scraped_row_id, []);
        }
        peopleByRow.get(person.scraped_row_id)!.push(person);
      }
    }

    // Find max number of people for any website to determine column count
    let maxPeople = 0;
    for (const row of rows) {
      const rowPeople = peopleByRow.get(row.id) || [];
      if (rowPeople.length > maxPeople) {
        maxPeople = rowPeople.length;
      }
    }

    // Collect all original CSV columns from all rows
    const originalColumnSet = new Set<string>();
    for (const row of rows) {
      if (row.original_row_data && typeof row.original_row_data === 'object') {
        Object.keys(row.original_row_data).forEach(key => originalColumnSet.add(key));
      }
    }
    const originalColumns = Array.from(originalColumnSet);

    // Find max number of locations for any website to determine column count
    let maxLocations = 0;
    for (const row of rows) {
      const locs = row.club_locations || [];
      if (Array.isArray(locs) && locs.length > maxLocations) {
        maxLocations = locs.length;
      }
    }

    // Generate new extracted field headers
    const extractedHeaders = [
      'Logo URL',
      'Logo Storage URL',
      'Business Description',
      'Team Members (Basic)',
      'Phone Number',
      'Email',
      'Address',
      'Opening Hours',
      'Number of Clubs',
      'Number of Courts',
      'Facilities Details',
    ];

    // Generate location headers dynamically
    const locationHeaders = [];
    for (let i = 1; i <= maxLocations; i++) {
      locationHeaders.push(
        `Location ${i} Name`,
        `Location ${i} Address`,
        `Location ${i} Phone`,
        `Location ${i} Hours`
      );
    }

    const personHeaders = [];
    for (let i = 1; i <= maxPeople; i++) {
      personHeaders.push(
        `Person ${i} Name`,
        `Person ${i} Title`,
        `Person ${i} Description`,
        `Person ${i} Source`
      );
    }

    const metadataHeaders = [
      'Instagram',
      'Facebook',
      'LinkedIn',
      'Twitter',
      'WhatsApp Contact',
      'Custom Answer 1',
      'Custom Answer 2',
      'Team Page URL',
      'Scraped At',
      'Extracted At'
    ];

    // Combine: original columns first, then new extracted fields
    const csvHeaders = [...originalColumns, ...extractedHeaders, ...locationHeaders, ...personHeaders, ...metadataHeaders];

    const csvRows: string[] = [];
    
    for (const row of rows) {
      const socialMedia = row.social_media || {};
      const rowPeople = peopleByRow.get(row.id) || [];
      const originalData = row.original_row_data || {};
      
      // Start with original CSV fields in order
      const rowFields = originalColumns.map(col => escapeCSV(originalData[col]));
      
      // Add extracted fields
      rowFields.push(
        escapeCSV(row.logo_url),
        escapeCSV(row.logo_storage_url),
        escapeCSV(row.business_description),
        escapeCSV(row.team_members),
        escapeCSV(row.phone_number),
        escapeCSV(row.email),
        escapeCSV(row.address),
        escapeCSV(row.opening_hours),
        escapeCSV(row.number_of_clubs),
        escapeCSV(row.number_of_courts),
        escapeCSV(row.facilities_details)
      );

      // Add location fields
      const clubLocations = row.club_locations || [];
      for (let i = 0; i < maxLocations; i++) {
        if (Array.isArray(clubLocations) && i < clubLocations.length) {
          const loc = clubLocations[i];
          rowFields.push(
            escapeCSV(loc?.name),
            escapeCSV(loc?.address),
            escapeCSV(loc?.phone),
            escapeCSV(loc?.hours)
          );
        } else {
          rowFields.push('', '', '', '');
        }
      }
      
      // Add person fields (fill with empty strings if fewer people than maxPeople)
      for (let i = 0; i < maxPeople; i++) {
        if (i < rowPeople.length) {
          const person = rowPeople[i];
          rowFields.push(
            escapeCSV(person.name),
            escapeCSV(person.title),
            escapeCSV(person.description),
            escapeCSV(person.source)
          );
        } else {
          // No person at this index, add empty fields
          rowFields.push('', '', '', '');
        }
      }
      
      // Add metadata fields
      rowFields.push(
        escapeCSV(socialMedia.instagram),
        escapeCSV(socialMedia.facebook),
        escapeCSV(socialMedia.linkedin),
        escapeCSV(socialMedia.twitter),
        escapeCSV(row.whatsapp_contact),
        escapeCSV(row.custom_answer_1),
        escapeCSV(row.custom_answer_2),
        escapeCSV(row.team_page_url),
        row.scraped_at ? new Date(row.scraped_at).toISOString() : '',
        row.extracted_at ? new Date(row.extracted_at).toISOString() : ''
      );
      
      csvRows.push(rowFields.join(','));
    }

    const csv = [csvHeaders.join(','), ...csvRows].join('\n');

    return new Response(csv, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${job.project_id}_enriched.csv"`,
      },
    });

  } catch (error) {
    console.error('Error in download-csv:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function escapeCSV(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }
  const str = String(value);
  // Escape quotes and wrap in quotes if contains comma, quote, or newline
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
