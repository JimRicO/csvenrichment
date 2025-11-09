import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Generating Instagram CSV for job:', job_id);

    // Fetch job info to get stored column order
    const { data: jobData, error: jobError } = await supabase
      .from('instagram_jobs')
      .select('column_order')
      .eq('id', job_id)
      .single();

    if (jobError) {
      console.error('Job fetch error:', jobError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch job info' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch ALL instagram_rows (to maintain row count with upload) 
    const { data: allRows, error: rowsError } = await supabase
      .from('instagram_rows')
      .select('id, instagram_url, scrape_status, scrape_error_message, original_row_data, created_at')
      .eq('job_id', job_id)
      .order('created_at', { ascending: true });

    if (rowsError) {
      console.error('Rows fetch error:', rowsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch rows' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!allRows || allRows.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No rows found for this job' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetched ${allRows.length} rows (uploaded count)`);

    // Fetch instagram_company_data for successful scrapes
    const { data: instagramData } = await supabase
      .from('instagram_company_data')
      .select('*')
      .eq('job_id', job_id);

    // Create map for quick lookup
    const dataMap = new Map();
    (instagramData || []).forEach((profile: any) => {
      dataMap.set(profile.scraped_row_id, profile);
    });

    console.log(`Matched ${dataMap.size} profiles with scraped data`);

    // Helper function to escape CSV values
    const escapeCSV = (value: any): string => {
      if (value === null || value === undefined) return '';
      const str = String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    // Helper function to extract hashtags from posts
    const extractHashtags = (posts: any[]): string => {
      if (!posts || posts.length === 0) return '';
      
      const hashtagCounts = new Map<string, number>();
      
      posts.forEach(post => {
        if (post.caption) {
          const hashtags = post.caption.match(/#[\w]+/g);
          if (hashtags) {
            hashtags.forEach((tag: string) => {
              const count = hashtagCounts.get(tag) || 0;
              hashtagCounts.set(tag, count + 1);
            });
          }
        }
      });

      // Get top 5 hashtags
      const sortedHashtags = Array.from(hashtagCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([tag]) => tag);

      return sortedHashtags.join(', ');
    };

    // Use stored column order from job, or fallback to first row
    let originalColumns: string[] = jobData?.column_order || [];
    
    if (originalColumns.length === 0 && allRows.length > 0 && allRows[0].original_row_data) {
      // Fallback for older jobs without stored column order
      originalColumns = Object.keys(allRows[0].original_row_data);
      console.warn('No stored column order found, using fallback from first row');
    }
    
    // Ensure all columns from all rows are included (in case of inconsistent data)
    const additionalColumns = new Set<string>();
    allRows.forEach((row: any) => {
      if (row.original_row_data && typeof row.original_row_data === 'object') {
        Object.keys(row.original_row_data).forEach(key => {
          if (!originalColumns.includes(key)) {
            additionalColumns.add(key);
          }
        });
      }
    });
    originalColumns = [...originalColumns, ...Array.from(additionalColumns)];
    
    console.log(`Found ${originalColumns.length} original CSV columns:`, originalColumns);

    // Generate CSV header - original columns FIRST, then enriched columns
    const enrichedHeaders = [
      'job_id',
      'instagram_url',
      'scrape_status',
      'scrape_error',
      'username',
      'full_name',
      'biography',
      'external_url',
      'followers_count',
      'posts_count',
      'is_business_account',
      'verified',
      'related_profiles',
      'latest_posts',
      'post_dates',
      'total_posts_analyzed',
      'avg_likes',
      'avg_comments',
      'avg_video_views',
      'top_hashtags'
    ];
    
    const headers = [...originalColumns, ...enrichedHeaders];
    const csvRows = [headers.join(',')];

    // Generate CSV rows (iterate through ALL uploaded rows)
    for (const row of allRows) {
      const profile = dataMap.get(row.id); // Get scraped data if exists
      
      // Extract original CSV column values for this row
      const originalValues = originalColumns.map(col => {
        const value = row.original_row_data?.[col];
        return escapeCSV(value);
      });
      
      if (!profile) {
        // Row failed, pending, invalid, or duplicate - include with empty data
        let statusMessage = row.scrape_status;
        if (row.scrape_status === 'invalid') {
          statusMessage = 'Invalid URL - not processed';
        } else if (row.scrape_status === 'duplicate') {
          statusMessage = 'Duplicate - skipped';
        }
        
        const enrichedValues = [
          escapeCSV(job_id),
          escapeCSV(row.instagram_url),
          escapeCSV(statusMessage),
          escapeCSV(row.scrape_error_message || ''),
          '', // username
          '', // full_name
          '', // biography
          '', // external_url
          '', // followers_count
          '', // posts_count
          '', // is_business_account
          '', // verified
          '', // related_profiles
          '', // latest_posts
          '', // post_dates
          '', // total_posts_analyzed
          '', // avg_likes
          '', // avg_comments
          '', // avg_video_views
          ''  // top_hashtags
        ];
        
        // Original columns FIRST, then enriched columns
        csvRows.push([...originalValues, ...enrichedValues].join(','));
        continue;
      }

      // Row succeeded - include full data
      const latestPosts = profile.latest_posts || [];
      const relatedProfiles = profile.related_profiles || [];

      // Calculate aggregated metrics from latest_posts
      let totalLikes = 0;
      let totalComments = 0;
      let totalVideoViews = 0;
      let videoCount = 0;

      latestPosts.forEach((post: any) => {
        totalLikes += post.likesCount || 0;
        totalComments += post.commentsCount || 0;
        if (post.videoViewCount) {
          totalVideoViews += post.videoViewCount;
          videoCount++;
        }
      });

      const postsCount = latestPosts.length;
      const avgLikes = postsCount > 0 ? Math.round(totalLikes / postsCount) : 0;
      const avgComments = postsCount > 0 ? Math.round(totalComments / postsCount) : 0;
      const avgVideoViews = videoCount > 0 ? Math.round(totalVideoViews / videoCount) : 0;

      // Extract related profiles usernames (comma-separated)
      const relatedProfilesStr = relatedProfiles
        .map((p: any) => `@${p.username}`)
        .join(', ');

      // Extract latest posts captions (first 100 chars each, pipe-separated)
      const latestPostsStr = latestPosts
        .slice(0, 5)
        .map((post: any) => {
          const caption = post.caption || '';
          return caption.substring(0, 100).replace(/\n/g, ' ').trim();
        })
        .join(' | ');

      // Extract post dates (pipe-separated)
      const postDatesStr = latestPosts
        .map((post: any) => {
          if (!post.timestamp) return '';
          const date = new Date(post.timestamp);
          return date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
        })
        .filter((date: string) => date !== '')
        .join(' | ');

      // Extract top hashtags
      const topHashtags = extractHashtags(latestPosts);

      const enrichedValues = [
        escapeCSV(job_id),
        escapeCSV(profile.instagram_url),
        escapeCSV('completed'),
        escapeCSV(''),
        escapeCSV(profile.username),
        escapeCSV(profile.full_name),
        escapeCSV(profile.biography),
        escapeCSV(profile.external_url),
        escapeCSV(profile.followers_count),
        escapeCSV(profile.posts_count),
        escapeCSV(profile.is_business_account),
        escapeCSV(profile.verified),
        escapeCSV(relatedProfilesStr),
        escapeCSV(latestPostsStr),
        escapeCSV(postDatesStr),
        escapeCSV(postsCount),
        escapeCSV(avgLikes),
        escapeCSV(avgComments),
        escapeCSV(avgVideoViews),
        escapeCSV(topHashtags)
      ];

      // Original columns FIRST, then enriched columns
      csvRows.push([...originalValues, ...enrichedValues].join(','));
    }

    const csvContent = csvRows.join('\n');

    console.log(`Generated CSV with ${allRows.length} total rows (${dataMap.size} successful, ${allRows.length - dataMap.size} failed/pending)`);

    return new Response(csvContent, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="instagram_data_${job_id}.csv"`
      }
    });

  } catch (error) {
    console.error('CSV generation error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
