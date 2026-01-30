import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface PeopleJobStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}

interface RecentPerson {
  id: string;
  person_name: string;
  job_title: string | null;
  company: string | null;
  confidence_score: string | null;
  created_at: string;
}

interface PeopleJobStatus {
  job_id: string;
  project_id: string;
  status: string;
  total_rows: number;
  processed_rows: number;
  estimated_cost_usd: number;
  created_at: string;
  updated_at: string;
  stats: PeopleJobStats;
  recent_people: RecentPerson[];
}

export const usePeopleJobStatus = (jobId: string | null) => {
  const [jobStatus, setJobStatus] = useState<PeopleJobStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) return;

    const fetchStatus = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase.functions.invoke('get-people-status', {
          body: { job_id: jobId },
        });

        if (error) throw error;
        setJobStatus(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching people job status:', err);
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
