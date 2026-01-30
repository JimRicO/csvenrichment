import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface EnrichedPersonData {
  full_name: string | null;
  biography: string | null;
  job_title: string | null;
  company: string | null;
  previous_roles: Array<{ title: string; company: string; years: string }>;
  education: Array<{ degree: string; institution: string; year: string }>;
  notable_achievements: string | null;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  twitter_handle: string | null;
  other_socials: Record<string, string>;
  confidence: 'high' | 'medium' | 'low';
  sources: string[];
}

interface EnrichPersonResponse {
  success: boolean;
  data?: EnrichedPersonData;
  error?: string;
  raw_text?: string;
}

export const useEnrichPerson = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enrichPerson = async (name: string, company?: string): Promise<EnrichedPersonData | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke<EnrichPersonResponse>('enrich-person', {
        body: { name, company }
      });

      if (invokeError) {
        throw new Error(invokeError.message);
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to enrich person');
      }

      return data.data || null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Error enriching person:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return { enrichPerson, isLoading, error };
};
