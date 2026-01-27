import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface EnrichmentJobStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}

interface RecentClub {
  id: string;
  club_name: string;
  logo_storage_url: string | null;
  instagram_handle: string | null;
  instagram_followers: number | null;
  created_at: string;
}

interface EnrichmentJobStatus {
  job_id: string;
  project_id: string;
  status: string;
  total_rows: number;
  processed_rows: number;
  estimated_cost_usd: number;
  created_at: string;
  updated_at: string;
  stats: EnrichmentJobStats;
  recent_clubs: RecentClub[];
}

export const useEnrichmentJobStatus = (jobId: string | null) => {
  const [jobStatus, setJobStatus] = useState<EnrichmentJobStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) return;

    const fetchStatus = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase.functions.invoke('get-enrichment-status', {
          body: { job_id: jobId },
        });

        if (error) throw error;
        setJobStatus(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching enrichment job status:', err);
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
