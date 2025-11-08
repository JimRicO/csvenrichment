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

    // Fetch Instagram company data
    const { data: instagramData, error: dataError } = await supabase
      .from('instagram_company_data')
      .select('*')
      .eq('job_id', job_id)
      .order('created_at', { ascending: true });

    if (dataError) {
      console.error('Data fetch error:', dataError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!instagramData || instagramData.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No data found for this job' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    // Generate CSV header
    const headers = [
      'instagram_url',
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
      'total_posts_analyzed',
      'avg_likes',
      'avg_comments',
      'avg_video_views',
      'top_hashtags'
    ];

    const csvRows = [headers.join(',')];

    // Generate CSV rows
    for (const profile of instagramData) {
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

      // Extract top hashtags
      const topHashtags = extractHashtags(latestPosts);

      const row = [
        escapeCSV(profile.instagram_url),
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
        escapeCSV(postsCount),
        escapeCSV(avgLikes),
        escapeCSV(avgComments),
        escapeCSV(avgVideoViews),
        escapeCSV(topHashtags)
      ];

      csvRows.push(row.join(','));
    }

    const csvContent = csvRows.join('\n');

    console.log(`Generated CSV with ${instagramData.length} profiles`);

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
