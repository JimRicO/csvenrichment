import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Palette, ImageOff, ExternalLink } from "lucide-react";

interface BrandingData {
  colorScheme?: string;
  logo?: string;
  colors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
    background?: string;
    textPrimary?: string;
    textSecondary?: string;
  };
  fonts?: Array<{ family: string }>;
  typography?: {
    fontFamilies?: {
      primary?: string;
      heading?: string;
      code?: string;
    };
    fontSizes?: {
      h1?: string;
      h2?: string;
      h3?: string;
      body?: string;
    };
    fontWeights?: {
      regular?: number;
      medium?: number;
      bold?: number;
    };
  };
  spacing?: {
    baseUnit?: number;
    borderRadius?: string;
  };
  components?: {
    buttonPrimary?: {
      background?: string;
      textColor?: string;
      borderRadius?: string;
    };
    buttonSecondary?: {
      background?: string;
      textColor?: string;
      borderColor?: string;
      borderRadius?: string;
    };
  };
  images?: {
    logo?: string;
    favicon?: string;
    ogImage?: string;
  };
}

export const WebsiteBrandingScraper = () => {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [branding, setBranding] = useState<BrandingData | null>(null);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  const handleExtract = async () => {
    if (!url) {
      toast.error("Please enter a website URL");
      return;
    }

    setIsLoading(true);
    setBranding(null);
    setImageErrors({});

    try {
      // First check if we already have this data in the database
      const { data: existingData, error: queryError } = await supabase
        .from('visual_identity')
        .select('branding_data, updated_at')
        .eq('url', url)
        .maybeSingle();

      if (queryError) {
        console.error('Error querying database:', queryError);
      }

      if (existingData?.branding_data) {
        console.log('Found existing branding data in database');
        setBranding(existingData.branding_data as BrandingData);
        toast.success("Brand identity loaded from database!");
        setIsLoading(false);
        return;
      }

      // If not in database, extract from website
      console.log('No existing data, extracting from website');
      const { data, error } = await supabase.functions.invoke('extract-branding', {
        body: { url },
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      if (data.branding) {
        setBranding(data.branding);
        toast.success(`Brand identity extracted! ${data.metadata?.imagesUploaded || 0} images saved.`);
      } else {
        toast.error("No branding data found");
      }
    } catch (error) {
      console.error("Error extracting branding:", error);
      toast.error("Failed to extract brand identity");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="p-6 bg-gradient-card border-border/50">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-primary/10">
          <Palette className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Website Visual Identity Scraper</h2>
          <p className="text-sm text-muted-foreground">
            Extract comprehensive brand identity from any website
          </p>
        </div>
      </div>

      <div className="flex gap-3 mb-6">
        <Input
          type="url"
          placeholder="https://example.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="flex-1"
          disabled={isLoading}
        />
        <Button onClick={handleExtract} disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Extracting...
            </>
          ) : (
            "Extract Identity"
          )}
        </Button>
      </div>

      {branding && (
        <div className="space-y-6 animate-fade-in">
          {/* Color Scheme */}
          {branding.colorScheme && (
            <div className="border border-border/50 rounded-lg p-4 bg-background/50">
              <h3 className="font-semibold mb-2">Color Scheme</h3>
              <p className="text-sm capitalize">{branding.colorScheme}</p>
            </div>
          )}

          {/* Colors */}
          {branding.colors && (
            <div className="border border-border/50 rounded-lg p-4 bg-background/50">
              <h3 className="font-semibold mb-3">Brand Colors</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Object.entries(branding.colors).map(([key, value]) => (
                  <div key={key} className="space-y-2">
                    <div
                      className="h-16 rounded-lg border border-border/50"
                      style={{ backgroundColor: value }}
                    />
                    <div className="text-xs">
                      <p className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                      <p className="text-muted-foreground font-mono">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Typography */}
          {branding.typography && (
            <div className="border border-border/50 rounded-lg p-4 bg-background/50">
              <h3 className="font-semibold mb-3">Typography</h3>
              <div className="space-y-3">
                {branding.typography.fontFamilies && (
                  <div>
                    <p className="text-sm font-medium mb-2">Font Families</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                      {Object.entries(branding.typography.fontFamilies).map(([key, value]) => (
                        <div key={key} className="p-2 bg-muted/30 rounded">
                          <span className="text-muted-foreground capitalize">{key}:</span>{" "}
                          <span className="font-medium">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {branding.typography.fontSizes && (
                  <div>
                    <p className="text-sm font-medium mb-2">Font Sizes</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                      {Object.entries(branding.typography.fontSizes).map(([key, value]) => (
                        <div key={key} className="p-2 bg-muted/30 rounded">
                          <span className="text-muted-foreground uppercase">{key}:</span>{" "}
                          <span className="font-medium">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {branding.typography.fontWeights && (
                  <div>
                    <p className="text-sm font-medium mb-2">Font Weights</p>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      {Object.entries(branding.typography.fontWeights).map(([key, value]) => (
                        <div key={key} className="p-2 bg-muted/30 rounded">
                          <span className="text-muted-foreground capitalize">{key}:</span>{" "}
                          <span className="font-medium">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Spacing */}
          {branding.spacing && (
            <div className="border border-border/50 rounded-lg p-4 bg-background/50">
              <h3 className="font-semibold mb-3">Spacing & Layout</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {branding.spacing.baseUnit && (
                  <div className="p-2 bg-muted/30 rounded">
                    <span className="text-muted-foreground">Base Unit:</span>{" "}
                    <span className="font-medium">{branding.spacing.baseUnit}px</span>
                  </div>
                )}
                {branding.spacing.borderRadius && (
                  <div className="p-2 bg-muted/30 rounded">
                    <span className="text-muted-foreground">Border Radius:</span>{" "}
                    <span className="font-medium">{branding.spacing.borderRadius}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Components */}
          {branding.components && (
            <div className="border border-border/50 rounded-lg p-4 bg-background/50">
              <h3 className="font-semibold mb-3">UI Components</h3>
              <div className="space-y-3">
                {branding.components.buttonPrimary && (
                  <div className="p-3 bg-muted/30 rounded">
                    <p className="text-sm font-medium mb-2">Primary Button</p>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      {Object.entries(branding.components.buttonPrimary).map(([key, value]) => (
                        <div key={key}>
                          <span className="text-muted-foreground capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>{" "}
                          <span className="font-medium">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {branding.components.buttonSecondary && (
                  <div className="p-3 bg-muted/30 rounded">
                    <p className="text-sm font-medium mb-2">Secondary Button</p>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      {Object.entries(branding.components.buttonSecondary).map(([key, value]) => (
                        <div key={key}>
                          <span className="text-muted-foreground capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>{" "}
                          <span className="font-medium">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Images */}
          {branding.images && (
            <div className="border border-border/50 rounded-lg p-4 bg-background/50">
              <h3 className="font-semibold mb-3">Brand Images</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {branding.images.logo && (
                  <div>
                    <p className="text-sm font-medium mb-2">Logo</p>
                    {imageErrors['logo'] ? (
                      <div className="h-20 flex flex-col items-center justify-center bg-muted/30 p-2 rounded text-muted-foreground">
                        <ImageOff className="w-8 h-8 mb-1" />
                        <a 
                          href={branding.images.logo} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs hover:text-primary flex items-center gap-1"
                        >
                          View URL <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    ) : (
                      <img
                        src={branding.images.logo}
                        alt="Logo"
                        className="max-h-20 object-contain bg-muted/30 p-2 rounded"
                        onError={() => setImageErrors(prev => ({ ...prev, logo: true }))}
                      />
                    )}
                  </div>
                )}
                {branding.images.favicon && (
                  <div>
                    <p className="text-sm font-medium mb-2">Favicon</p>
                    {imageErrors['favicon'] ? (
                      <div className="h-20 flex flex-col items-center justify-center bg-muted/30 p-2 rounded text-muted-foreground">
                        <ImageOff className="w-8 h-8 mb-1" />
                        <a 
                          href={branding.images.favicon} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs hover:text-primary flex items-center gap-1"
                        >
                          View URL <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    ) : (
                      <img
                        src={branding.images.favicon}
                        alt="Favicon"
                        className="max-h-20 object-contain bg-muted/30 p-2 rounded"
                        onError={() => setImageErrors(prev => ({ ...prev, favicon: true }))}
                      />
                    )}
                  </div>
                )}
                {branding.images.ogImage && (
                  <div>
                    <p className="text-sm font-medium mb-2">OG Image</p>
                    {imageErrors['ogImage'] ? (
                      <div className="h-20 flex flex-col items-center justify-center bg-muted/30 p-2 rounded text-muted-foreground">
                        <ImageOff className="w-8 h-8 mb-1" />
                        <a 
                          href={branding.images.ogImage} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs hover:text-primary flex items-center gap-1"
                        >
                          View URL <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    ) : (
                      <img
                        src={branding.images.ogImage}
                        alt="OG Image"
                        className="max-h-20 object-contain bg-muted/30 p-2 rounded"
                        onError={() => setImageErrors(prev => ({ ...prev, ogImage: true }))}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Fonts List */}
          {branding.fonts && branding.fonts.length > 0 && (
            <div className="border border-border/50 rounded-lg p-4 bg-background/50">
              <h3 className="font-semibold mb-3">Detected Fonts</h3>
              <div className="flex flex-wrap gap-2">
                {branding.fonts.map((font, idx) => (
                  <div key={idx} className="px-3 py-1 bg-muted/30 rounded-full text-sm">
                    {font.family}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};
