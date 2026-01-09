import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ExternalLink, Instagram, Users, TrendingUp, DollarSign, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface InstagramResultsDialogProps {
  jobId: string;
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface InstagramProfile {
  id: string;
  instagram_url: string;
  username: string;
  full_name: string | null;
  biography: string | null;
  external_url: string | null;
  followers_count: number;
  posts_count: number;
  is_business_account: boolean;
  verified: boolean;
  related_profiles: any[];
  latest_posts: any[];
  profile_pic_storage_url: string | null;
  /** Raw actor payload (used as a fallback for legacy rows without persisted images) */
  raw_apify_data?: any;
}

export const InstagramResultsDialog = ({ jobId, projectId, isOpen, onClose }: InstagramResultsDialogProps) => {
  const [profiles, setProfiles] = useState<InstagramProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [summary, setSummary] = useState({
    totalProfiles: 0,
    totalPosts: 0,
    totalRelated: 0,
    cost: 0
  });

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen, jobId]);

  const fetchData = async () => {
    setIsLoading(true);
    
    const { data, error } = await supabase
      .from('instagram_company_data')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching Instagram data:', error);
      setIsLoading(false);
      return;
    }

    const profilesData = data as InstagramProfile[];
    setProfiles(profilesData);

    // Calculate summary
    let totalPosts = 0;
    let totalRelated = 0;

    profilesData.forEach(profile => {
      totalPosts += (profile.latest_posts?.length || 0);
      totalRelated += (profile.related_profiles?.length || 0);
    });

    const { data: jobData } = await supabase
      .from('instagram_jobs')
      .select('estimated_cost_usd')
      .eq('id', jobId)
      .single();

    setSummary({
      totalProfiles: profilesData.length,
      totalPosts,
      totalRelated,
      cost: jobData?.estimated_cost_usd || 0
    });

    setIsLoading(false);
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Instagram className="h-5 w-5 text-primary" />
            Instagram Intelligence Results - {projectId}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <ScrollArea className="max-h-[75vh]">
            <div className="space-y-6 p-1">
              {/* Summary Cards */}
              <div className="grid grid-cols-4 gap-4">
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Instagram className="h-4 w-4 text-primary" />
                    <p className="text-sm text-muted-foreground">Profiles</p>
                  </div>
                  <p className="text-2xl font-bold">{summary.totalProfiles}</p>
                </Card>
                
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-accent" />
                    <p className="text-sm text-muted-foreground">Posts</p>
                  </div>
                  <p className="text-2xl font-bold">{summary.totalPosts}</p>
                </Card>
                
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-4 w-4 text-secondary" />
                    <p className="text-sm text-muted-foreground">Related</p>
                  </div>
                  <p className="text-2xl font-bold">{summary.totalRelated}</p>
                </Card>
                
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-4 w-4 text-warning" />
                    <p className="text-sm text-muted-foreground">Cost</p>
                  </div>
                  <p className="text-2xl font-bold">${summary.cost.toFixed(4)}</p>
                </Card>
              </div>

              {/* Data Table */}
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Avatar</TableHead>
                      <TableHead>Profile</TableHead>
                      <TableHead>Username</TableHead>
                      <TableHead>Followers</TableHead>
                      <TableHead>Posts</TableHead>
                      <TableHead>Business</TableHead>
                      <TableHead>Verified</TableHead>
                      <TableHead>Related</TableHead>
                      <TableHead>Latest Posts</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {profiles.map((profile) => (
                      <TableRow key={profile.id}>
                        <TableCell>
                          {(() => {
                            const avatarUrl =
                              profile.profile_pic_storage_url ??
                              profile.raw_apify_data?.profilePicUrlHD ??
                              profile.raw_apify_data?.profilePicUrl ??
                              null;

                            return avatarUrl ? (
                              <img
                                src={avatarUrl}
                                alt={`@${profile.username} profile picture`}
                                loading="lazy"
                                referrerPolicy="no-referrer"
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                                <Instagram className="h-5 w-5 text-muted-foreground" />
                              </div>
                            );
                          })()}
                        </TableCell>
                        <TableCell className="font-medium">
                          {profile.full_name || profile.username}
                        </TableCell>
                        <TableCell>
                          <a 
                            href={profile.instagram_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            @{profile.username}
                          </a>
                        </TableCell>
                        <TableCell>{formatNumber(profile.followers_count)}</TableCell>
                        <TableCell>{profile.posts_count}</TableCell>
                        <TableCell>
                          {profile.is_business_account ? (
                            <CheckCircle className="h-4 w-4 text-success" />
                          ) : (
                            <XCircle className="h-4 w-4 text-muted-foreground" />
                          )}
                        </TableCell>
                        <TableCell>
                          {profile.verified ? (
                            <CheckCircle className="h-4 w-4 text-primary" />
                          ) : (
                            <XCircle className="h-4 w-4 text-muted-foreground" />
                          )}
                        </TableCell>
                        <TableCell>
                          {profile.related_profiles?.length > 0 ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="outline" className="cursor-help">
                                    {profile.related_profiles.length} profiles
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  <p className="text-sm">
                                    {profile.related_profiles
                                      .map((p: any) => `@${p.username}`)
                                      .join(', ')}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {profile.latest_posts?.length > 0 ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="outline" className="cursor-help">
                                    {profile.latest_posts.length} posts
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-md">
                                  <div className="space-y-2 text-sm">
                                    {profile.latest_posts.slice(0, 3).map((post: any, idx: number) => (
                                      <div key={idx}>
                                        <p className="font-medium">{post.type || 'Photo'} - {post.likesCount} likes</p>
                                        <p className="text-muted-foreground truncate">
                                          {post.caption?.substring(0, 60) || 'No caption'}...
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(profile.instagram_url, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
};
