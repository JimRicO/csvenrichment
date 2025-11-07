import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export const ScreenshotTest = () => {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [viewportScreenshot, setViewportScreenshot] = useState<string | null>(null);
  const [fullPageScreenshot, setFullPageScreenshot] = useState<string | null>(null);
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
    setViewportScreenshot(null);
    setFullPageScreenshot(null);

    try {
      const { data, error } = await supabase.functions.invoke("screenshot-test", {
        body: { url },
      });

      if (error) throw error;

      if (data?.success) {
        setViewportScreenshot(data.viewportScreenshot);
        setFullPageScreenshot(data.fullPageScreenshot);
        toast({
          title: "Success",
          description: "Screenshots captured successfully",
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Screenshot Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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

        {(viewportScreenshot || fullPageScreenshot) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {viewportScreenshot && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Viewport Screenshot</h3>
                <img
                  src={viewportScreenshot}
                  alt="Viewport screenshot"
                  className="w-full border rounded-lg shadow-sm"
                />
              </div>
            )}
            {fullPageScreenshot && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Full Page Screenshot</h3>
                <img
                  src={fullPageScreenshot}
                  alt="Full page screenshot"
                  className="w-full border rounded-lg shadow-sm"
                />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
