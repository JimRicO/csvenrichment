import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Camera } from "lucide-react";

export const ScreenshotTest = () => {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const { toast } = useToast();

  const captureScreenshot = async () => {
    if (!url) {
      toast({
        title: "Error",
        description: "Please enter a URL",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setScreenshot(null);

    try {
      const { data, error } = await supabase.functions.invoke("screenshot-test", {
        body: { url },
      });

      if (error) throw error;

      console.log('Screenshot response:', data);
      
      if (data?.success && data.screenshot) {
        setScreenshot(data.screenshot);
        toast({
          title: "Success",
          description: "Screenshot captured successfully",
        });
      } else if (data?.success && !data.screenshot) {
        toast({
          title: "Warning",
          description: "Screenshot completed but no image was returned",
          variant: "destructive",
        });
      } else {
        throw new Error("Failed to capture screenshots");
      }
    } catch (error) {
      console.error("Error capturing screenshot:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to capture screenshots",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      captureScreenshot();
    }
  };

  const header = (
    <div className="flex items-center gap-3 p-6">
      <div className="p-2 rounded-lg bg-primary/10">
        <Camera className="h-5 w-5 text-primary" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-foreground">Screenshot Test</h3>
        <p className="text-sm text-muted-foreground">
          Capture full-page screenshots from any website URL
        </p>
      </div>
    </div>
  );

  return (
    <CollapsibleCard header={header} defaultOpen={false} className="border-border/50">
      <div className="p-6 pt-0 space-y-4">
        <div className="flex gap-2">
          <Input
            type="url"
            placeholder="Enter website URL (e.g., https://example.com)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
          />
          <Button onClick={captureScreenshot} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Capturing...
              </>
            ) : (
              "Capture Screenshot"
            )}
          </Button>
        </div>

        {screenshot && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Full Page Screenshot</h3>
            <img
              src={screenshot}
              alt="Full page screenshot"
              className="w-full border rounded-lg shadow-sm"
            />
          </div>
        )}
      </div>
    </CollapsibleCard>
  );
};
