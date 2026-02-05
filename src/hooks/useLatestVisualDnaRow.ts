import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type LatestVisualDnaRow = {
  posts_analyzed: number | null;
  processing_time_ms: number | null;
  status: string;
  error_message: string | null;
  created_at: string;
};

export function useLatestVisualDnaRow(enrichedClubId: string | null, enabled = true) {
  const [row, setRow] = useState<LatestVisualDnaRow | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!enabled || !enrichedClubId) {
      setRow(null);
      return;
    }

    let cancelled = false;

    const run = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("visual_dna_rows")
          .select("posts_analyzed, processing_time_ms, status, error_message, created_at")
          .eq("enriched_club_id", enrichedClubId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;
        if (!cancelled) setRow((data as LatestVisualDnaRow) || null);
      } catch {
        if (!cancelled) setRow(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [enabled, enrichedClubId]);

  return {
    row,
    postsAnalyzed: row?.posts_analyzed ?? undefined,
    isLoading,
  };
}
