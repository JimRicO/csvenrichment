import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { ChevronDown, ExternalLink, Info } from "lucide-react";
import VisualDNACard from "@/components/VisualDNACard";

type VisualDnaProof = {
  success?: boolean;
  club_id?: string;
  invisibility_score?: number;
  invisibility_category?: string;
  posts_found?: number;
  images_analyzed?: number;
  images_downloaded?: number;
  images_failed?: number;
  processing_time_ms?: number;
  has_visual_dna?: boolean;
  has_voice_dna?: boolean;
  has_ctlt_matches?: boolean;
  visual_analysis_error?: string | null;
  partial_score?: boolean;
  download_details?: Array<{
    index: number;
    url: string;
    success: boolean;
    sizeBytes?: number;
    base64Length?: number;
    mimeType?: string;
    error?: string;
  }>;
};

interface VisualDNAReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clubId: string | null;
  /** Optional proof payload returned by analyze-visual-dna (not persisted) */
  proof?: VisualDnaProof | null;
}

type EnrichedClubRow = {
  id: string;
  club_name: string;
  instagram_handle: string | null;
  visual_dna: any | null;
  voice_dna: any | null;
  ctlt_matches: any | null;
  invisibility_score: number | null;
  invisibility_category: string | null;
  visual_dna_analyzed_at: string | null;
  visual_dna_media_urls: string[] | null;
};

type VisualDnaRow = {
  posts_analyzed: number | null;
  processing_time_ms: number | null;
  status: string;
  error_message: string | null;
  created_at: string;
};

const formatBytes = (bytes?: number) => {
  if (!bytes && bytes !== 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

export default function VisualDNAReportDialog({
  open,
  onOpenChange,
  clubId,
  proof = null,
}: VisualDNAReportDialogProps) {
  const [club, setClub] = useState<EnrichedClubRow | null>(null);
  const [latestRow, setLatestRow] = useState<VisualDnaRow | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showProof, setShowProof] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectivePostsAnalyzed = useMemo(() => {
    return (
      latestRow?.posts_analyzed ??
      proof?.images_analyzed ??
      proof?.posts_found ??
      undefined
    );
  }, [latestRow?.posts_analyzed, proof?.images_analyzed, proof?.posts_found]);

  useEffect(() => {
    if (!open || !clubId) return;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [{ data: clubData, error: clubErr }, { data: rowData, error: rowErr }] =
          await Promise.all([
            supabase
              .from("enriched_clubs")
              .select(
                "id, club_name, instagram_handle, visual_dna, voice_dna, ctlt_matches, invisibility_score, invisibility_category, visual_dna_analyzed_at, visual_dna_media_urls"
              )
              .eq("id", clubId)
              .single(),
            supabase
              .from("visual_dna_rows")
              .select("posts_analyzed, processing_time_ms, status, error_message, created_at")
              .eq("enriched_club_id", clubId)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle(),
          ]);

        if (clubErr) throw clubErr;
        if (rowErr) throw rowErr;

        setClub((clubData as EnrichedClubRow) || null);
        setLatestRow((rowData as VisualDnaRow) || null);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to load Visual DNA report";
        setError(msg);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [open, clubId]);

  const proofDetails = proof?.download_details ?? [];

  // Extract media URLs for the gallery from the proof download_details
  // First priority: persisted storage URLs from database
  // Fallback: temporary CDN URLs from proof (only available immediately after analysis)
  const mediaUrls = useMemo(() => {
    // Use persisted storage URLs from database if available
    if (club?.visual_dna_media_urls && Array.isArray(club.visual_dna_media_urls) && club.visual_dna_media_urls.length > 0) {
      return club.visual_dna_media_urls;
    }
    // Fallback to proof download details (temporary CDN URLs)
    if (proofDetails.length > 0) {
      return proofDetails
        .filter((d) => d.success && d.url)
        .map((d) => d.url);
    }
    return [];
  }, [club?.visual_dna_media_urls, proofDetails]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-primary" />
            Visual DNA Report{club?.club_name ? ` — ${club.club_name}` : ""}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="p-6 pt-4 max-h-[calc(90vh-84px)]">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-1/2" />
              <Skeleton className="h-72 w-full" />
              <Skeleton className="h-72 w-full" />
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl neu-pressed">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          ) : !club ? (
            <div className="p-4 rounded-xl neu-pressed">
              <p className="text-sm text-muted-foreground">No club selected.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {club.instagram_handle && (
                <div className="flex items-center justify-between gap-3 p-3 rounded-xl neu-pressed">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{club.instagram_handle}</p>
                    {latestRow?.status && (
                      <p className="text-xs text-muted-foreground">
                        Latest run: {latestRow.status}
                        {latestRow.processing_time_ms
                          ? ` • ${Math.round(latestRow.processing_time_ms / 1000)}s`
                          : ""}
                      </p>
                    )}
                  </div>
                  {club.instagram_handle && (
                    <a
                      href={`https://instagram.com/${club.instagram_handle.replace("@", "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0"
                    >
                      <Button variant="outline" size="sm">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Open Instagram
                      </Button>
                    </a>
                  )}
                </div>
              )}

              <VisualDNACard
                visualDna={club.visual_dna}
                voiceDna={club.voice_dna}
                ctltMatches={club.ctlt_matches}
                invisibilityScore={club.invisibility_score}
                invisibilityCategory={club.invisibility_category}
                analyzedAt={club.visual_dna_analyzed_at}
                postsAnalyzed={effectivePostsAnalyzed}
                mediaUrls={mediaUrls}
              />

              {/* Proof (only available immediately after a run, since it isn't persisted) */}
              {proof ? (
                <Collapsible open={showProof} onOpenChange={setShowProof}>
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      <span className="flex items-center gap-2">
                        Proof: Image download + payload stats
                        {proof.visual_analysis_error ? (
                          <Badge variant="outline" className="text-destructive border-destructive/30">
                            Gemini failed
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            Gemini analyzed {proof.images_analyzed ?? "—"}/12
                          </Badge>
                        )}
                      </span>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 transition-transform",
                          showProof && "rotate-180"
                        )}
                      />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-3 p-4 rounded-xl neu-pressed space-y-3">
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>
                          Downloaded: <span className="text-foreground font-medium">{proof.images_downloaded ?? "—"}</span>
                          {" "}• Failed:{" "}
                          <span className="text-foreground font-medium">{proof.images_failed ?? "—"}</span>
                          {" "}• Processing:{" "}
                          <span className="text-foreground font-medium">
                            {proof.processing_time_ms
                              ? `${Math.round(proof.processing_time_ms / 1000)}s`
                              : "—"}
                          </span>
                        </p>
                        <p>
                          Gemini: {proof.visual_analysis_error ? `Failed: ${proof.visual_analysis_error}` : "Success"}
                        </p>
                        <p>
                          Claude: {proof.has_voice_dna ? "Complete" : "Not available in this run"}
                        </p>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border/50 text-xs text-muted-foreground">
                              <th className="text-left py-2 pr-3">#</th>
                              <th className="text-left py-2 pr-3">Source URL</th>
                              <th className="text-left py-2 pr-3">Result</th>
                              <th className="text-left py-2 pr-3">Resized size</th>
                              <th className="text-left py-2 pr-3">Base64 length</th>
                            </tr>
                          </thead>
                          <tbody>
                            {proofDetails.map((d) => (
                              <tr key={d.index} className="border-b border-border/20 align-top">
                                <td className="py-2 pr-3 font-mono text-xs text-muted-foreground">{d.index}</td>
                                <td className="py-2 pr-3">
                                  <a
                                    href={d.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline break-all"
                                  >
                                    {d.url}
                                  </a>
                                </td>
                                <td className="py-2 pr-3">
                                  {d.success ? (
                                    <Badge variant="secondary">OK</Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-destructive border-destructive/30">
                                      Failed
                                    </Badge>
                                  )}
                                  {!d.success && d.error ? (
                                    <p className="text-xs text-muted-foreground mt-1">{d.error}</p>
                                  ) : null}
                                </td>
                                <td className="py-2 pr-3 text-muted-foreground font-mono text-xs">
                                  {formatBytes(d.sizeBytes)}
                                </td>
                                <td className="py-2 pr-3 text-muted-foreground font-mono text-xs">
                                  {d.base64Length ?? "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ) : null}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
