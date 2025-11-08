import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface InstagramJobStatus {
  job_id: string;
  project_id: string;
  status: string;
  total_rows: number;
  processed_rows: number;
  estimated_cost_usd: number;
  created_at: string;
  updated_at: string;
  stats: {
    pending_scrape: number;
    completed_scrape: number;
    failed_scrape: number;
  };
}

export const useInstagramJobStatus = (jobId: string | null) => {
  const [jobStatus, setJobStatus] = useState<InstagramJobStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) return;

    const fetchStatus = async () => {
      try {
        setIsLoading(true);
        
        // Fetch job details from instagram_jobs
        const { data: jobData, error: jobError } = await supabase
          .from('instagram_jobs')
          .select('*')
          .eq('id', jobId)
          .single();

        if (jobError) throw jobError;

        // Fetch row-level stats from instagram_rows
        const { data: rowStats, error: statsError } = await supabase
          .from('instagram_rows')
          .select('scrape_status')
          .eq('job_id', jobId);

        if (statsError) throw statsError;

        // Calculate stats
        const stats = {
          pending_scrape: rowStats?.filter(r => r.scrape_status === 'pending').length || 0,
          completed_scrape: rowStats?.filter(r => r.scrape_status === 'completed').length || 0,
          failed_scrape: rowStats?.filter(r => r.scrape_status === 'failed').length || 0,
        };

        setJobStatus({
          job_id: jobData.id,
          project_id: jobData.project_id,
          status: jobData.status,
          total_rows: jobData.total_rows,
          processed_rows: jobData.processed_rows,
          estimated_cost_usd: parseFloat(jobData.estimated_cost_usd.toString()),
          created_at: jobData.created_at,
          updated_at: jobData.updated_at,
          stats,
        });
        setError(null);
      } catch (err) {
        console.error('Error fetching Instagram job status:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch status');
      } finally {
        setIsLoading(false);
      }
    };

    // Fetch immediately
    fetchStatus();

    // Poll every 2 seconds
    const interval = setInterval(fetchStatus, 2000);

    return () => clearInterval(interval);
  }, [jobId]);

  return { jobStatus, isLoading, error };
};
