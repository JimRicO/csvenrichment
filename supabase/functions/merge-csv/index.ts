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
    const { job_id, original_csv_rows } = await req.json();

    if (!job_id || !original_csv_rows || !Array.isArray(original_csv_rows)) {
      return new Response(
        JSON.stringify({ error: 'job_id and original_csv_rows array are required' }),
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

    // Create a map of website URL -> enriched row data (normalized URLs)
    const enrichedDataByUrl = new Map<string, any>();
    for (const row of rows) {
      const normalizedUrl = normalizeUrl(row.website_url);
      enrichedDataByUrl.set(normalizedUrl, row);
    }

    // Find max number of people for column count
    let maxPeople = 0;
    for (const row of rows) {
      const rowPeople = peopleByRow.get(row.id) || [];
      if (rowPeople.length > maxPeople) {
        maxPeople = rowPeople.length;
      }
    }

    // Get all original CSV column names (from first row, excluding empty columns)
    const originalColumns = Object.keys(original_csv_rows[0] || {}).filter(col => col.trim() !== '');

    // Generate enriched field headers
    const enrichedHeaders = [
      'Business Description',
      'Team Members (Basic)',
    ];

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

    // Combine: original columns first, then new enriched fields
    const csvHeaders = [...originalColumns, ...enrichedHeaders, ...personHeaders, ...metadataHeaders];

    const csvRows: string[] = [];
    
    // Process each original CSV row
    for (const originalRow of original_csv_rows) {
      // Get website URL from original row (try different column names)
      const websiteUrl = originalRow.Website || originalRow.website || originalRow.URL || originalRow.url;
      
      if (!websiteUrl) continue;

      const normalizedUrl = normalizeUrl(websiteUrl);
      const enrichedRow = enrichedDataByUrl.get(normalizedUrl);

      // Start with original CSV fields
      const rowFields = originalColumns.map(col => escapeCSV(originalRow[col]));

      if (enrichedRow) {
        // Add enriched data
        const socialMedia = enrichedRow.social_media || {};
        const rowPeople = peopleByRow.get(enrichedRow.id) || [];

        rowFields.push(
          escapeCSV(enrichedRow.business_description),
          escapeCSV(enrichedRow.team_members)
        );

        // Add person fields
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
            rowFields.push('', '', '', '');
          }
        }

        // Add metadata fields
        rowFields.push(
          escapeCSV(socialMedia.instagram),
          escapeCSV(socialMedia.facebook),
          escapeCSV(socialMedia.linkedin),
          escapeCSV(socialMedia.twitter),
          escapeCSV(enrichedRow.whatsapp_contact),
          escapeCSV(enrichedRow.custom_answer_1),
          escapeCSV(enrichedRow.custom_answer_2),
          escapeCSV(enrichedRow.team_page_url),
          enrichedRow.scraped_at ? new Date(enrichedRow.scraped_at).toISOString() : '',
          enrichedRow.extracted_at ? new Date(enrichedRow.extracted_at).toISOString() : ''
        );
      } else {
        // No enriched data found - fill with empty values
        const emptyFieldsCount = enrichedHeaders.length + personHeaders.length + metadataHeaders.length;
        for (let i = 0; i < emptyFieldsCount; i++) {
          rowFields.push('');
        }
      }

      csvRows.push(rowFields.join(','));
    }

    const csv = [csvHeaders.join(','), ...csvRows].join('\n');

    return new Response(csv, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${job.project_id}_merged.csv"`,
      },
    });

  } catch (error) {
    console.error('Error in merge-csv:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function normalizeUrl(url: string): string {
  if (!url) return '';
  
  try {
    // Remove protocol, www, trailing slashes, and convert to lowercase
    let normalized = url.toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/$/, '');
    
    // Remove trailing index files
    normalized = normalized.replace(/\/(index\.(html|php|asp|aspx|jsp))$/i, '');
    
    return normalized;
  } catch {
    return url.toLowerCase();
  }
}

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
