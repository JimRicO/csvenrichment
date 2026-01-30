import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Comprehensive intelligence profile structure
export interface IntelligenceProfile {
  identity: {
    full_name: string | null;
    aliases: string[];
    photo_url: string | null;
  };
  current_role: {
    title: string | null;
    company: string | null;
    department: string | null;
    start_date: string | null;
    reports_to: string | null;
  };
  biography: string | null;
  career_history: Array<{
    company: string;
    title: string;
    dates: string;
    highlights: string[];
  }>;
  education: Array<{
    institution: string;
    degree: string;
    field: string;
    year: string | null;
  }>;
  public_presence: {
    linkedin_url: string | null;
    twitter_handle: string | null;
    other_profiles: Record<string, string>;
    website: string | null;
    notable_content: string[];
  };
  recent_news: Array<{
    headline: string;
    source: string;
    date: string;
    url: string;
  }>;
  contact: {
    email: string | null;
    email_confidence: string | null;
    email_pattern: string | null;
    phone: string | null;
    location: string | null;
  };
  insights: {
    communication_style: string | null;
    key_interests: string[];
    conversation_starters: string[];
    quotes: string[];
  };
  sources: string[];
  research_summary: string | null;
}

interface EnrichPersonResponse {
  success: boolean;
  data?: IntelligenceProfile;
  error?: string;
  raw_text?: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

export const useEnrichPerson = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enrichPerson = async (name: string, company?: string): Promise<IntelligenceProfile | null> => {
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
