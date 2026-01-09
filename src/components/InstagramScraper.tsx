import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Instagram, ExternalLink, CheckCircle2 } from "lucide-react";

interface InstagramProfile {
  username: string;
  fullName: string;
  biography: string;
  followersCount: number;
  followsCount: number;
  postsCount: number;
  profilePicUrl: string;
  verified: boolean;
  url: string;
  externalUrl?: string;
  latestPosts?: Array<{
    url: string;
    caption: string;
    likesCount: number;
    commentsCount: number;
    displayUrl: string;
  }>;
}

export const InstagramScraper = () => {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<InstagramProfile | null>(null);

  const handleScrape = async () => {
    if (!url.trim()) {
      toast.error("Please enter an Instagram URL");
      return;
    }

    setLoading(true);
    setProfile(null);

    try {
      const { data, error } = await supabase.functions.invoke('instagram-scraper', {
        body: { url: url.trim() }
      });

      if (error) throw error;

      if (data?.data) {
        setProfile(data.data);
        toast.success("Profile scraped successfully!");
      } else {
        toast.error("No profile data returned");
      }
    } catch (error: any) {
      console.error('Scraping error:', error);
      toast.error(error.message || "Failed to scrape profile");
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Instagram className="w-5 h-5" />
          Instagram Profile Scraper
        </CardTitle>
        <CardDescription>
          Enter a full Instagram profile URL to scrape profile data and recent posts
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="https://www.instagram.com/padelx.us"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={loading}
          />
          <Button onClick={handleScrape} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Scraping...
              </>
            ) : (
              "Scrape"
            )}
          </Button>
        </div>

        {profile && (
          <div className="space-y-4 pt-4 border-t">
            {/* Profile Header */}
            <div className="flex items-start gap-4">
              <img
                src={(profile as any).profilePicStorageUrl || (profile as any).profilePicUrlHD || profile.profilePicUrl}
                alt={`@${profile.username} profile picture`}
                loading="lazy"
                referrerPolicy="no-referrer"
                className="w-20 h-20 rounded-full object-cover"
                onError={(e) => {
                  // Instagram CDN can reject hotlinks depending on referrer; fall back to placeholder
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = "/placeholder.svg";
                }}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold">@{profile.username}</h3>
                  {profile.verified && (
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{profile.fullName}</p>
                <div className="flex gap-4 mt-2 text-sm">
                  <span><strong>{formatNumber(profile.postsCount)}</strong> posts</span>
                  <span><strong>{formatNumber(profile.followersCount)}</strong> followers</span>
                  <span><strong>{formatNumber(profile.followsCount)}</strong> following</span>
                </div>
              </div>
            </div>

            {/* Biography */}
            {profile.biography && (
              <p className="text-sm whitespace-pre-wrap">{profile.biography}</p>
            )}

            {/* External Link */}
            {profile.externalUrl && (
              <a
                href={profile.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <ExternalLink className="w-3 h-3" />
                {profile.externalUrl}
              </a>
            )}

            {/* Recent Posts Grid */}
            {profile.latestPosts && profile.latestPosts.length > 0 && (
              <div>
                <h4 className="font-semibold mb-3">Recent Posts</h4>
                <div className="grid grid-cols-3 gap-2">
                  {profile.latestPosts.map((post, idx) => (
                    <a
                      key={idx}
                      href={post.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative aspect-square overflow-hidden rounded-lg group"
                    >
                      <img
                        src={post.displayUrl}
                        alt={post.caption?.substring(0, 50) || 'Post'}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white text-sm">
                        <span>❤️ {formatNumber(post.likesCount)}</span>
                        <span>💬 {formatNumber(post.commentsCount)}</span>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
