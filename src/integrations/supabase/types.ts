export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      ai_extraction_models: {
        Row: {
          created_at: string
          description: string | null
          extraction_prompt: string
          id: string
          input_cost_per_mtok: number
          is_active: boolean
          model_name: string
          model_version: string
          output_cost_per_mtok: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          extraction_prompt: string
          id?: string
          input_cost_per_mtok: number
          is_active?: boolean
          model_name: string
          model_version: string
          output_cost_per_mtok: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          extraction_prompt?: string
          id?: string
          input_cost_per_mtok?: number
          is_active?: boolean
          model_name?: string
          model_version?: string
          output_cost_per_mtok?: number
          updated_at?: string
        }
        Relationships: []
      }
      enriched_clubs: {
        Row: {
          address: string | null
          aesthetics: string | null
          attitude: string | null
          club_name: string
          color_palette: Json | null
          created_at: string
          description: string | null
          email: string | null
          enrichment_row_id: string
          fonts: Json | null
          founder_info: string | null
          founding_year: string | null
          id: string
          instagram_bio: string | null
          instagram_followers: number | null
          instagram_handle: string | null
          instagram_profile_pic_url: string | null
          job_id: string
          logo_storage_url: string | null
          perplexity_citations: Json | null
          perplexity_description: string | null
          phone: string | null
          raw_branding_data: Json | null
          raw_instagram_data: Json | null
          recent_activities: Json | null
          scraped_content: string | null
          updated_at: string
          website_url: string | null
        }
        Insert: {
          address?: string | null
          aesthetics?: string | null
          attitude?: string | null
          club_name: string
          color_palette?: Json | null
          created_at?: string
          description?: string | null
          email?: string | null
          enrichment_row_id: string
          fonts?: Json | null
          founder_info?: string | null
          founding_year?: string | null
          id?: string
          instagram_bio?: string | null
          instagram_followers?: number | null
          instagram_handle?: string | null
          instagram_profile_pic_url?: string | null
          job_id: string
          logo_storage_url?: string | null
          perplexity_citations?: Json | null
          perplexity_description?: string | null
          phone?: string | null
          raw_branding_data?: Json | null
          raw_instagram_data?: Json | null
          recent_activities?: Json | null
          scraped_content?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          address?: string | null
          aesthetics?: string | null
          attitude?: string | null
          club_name?: string
          color_palette?: Json | null
          created_at?: string
          description?: string | null
          email?: string | null
          enrichment_row_id?: string
          fonts?: Json | null
          founder_info?: string | null
          founding_year?: string | null
          id?: string
          instagram_bio?: string | null
          instagram_followers?: number | null
          instagram_handle?: string | null
          instagram_profile_pic_url?: string | null
          job_id?: string
          logo_storage_url?: string | null
          perplexity_citations?: Json | null
          perplexity_description?: string | null
          phone?: string | null
          raw_branding_data?: Json | null
          raw_instagram_data?: Json | null
          recent_activities?: Json | null
          scraped_content?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enriched_clubs_enrichment_row_id_fkey"
            columns: ["enrichment_row_id"]
            isOneToOne: false
            referencedRelation: "enrichment_rows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enriched_clubs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "enrichment_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      enriched_people: {
        Row: {
          achievements_source: string | null
          aliases: Json | null
          all_citations: Json | null
          biography: string | null
          biography_source: string | null
          career_highlights: Json | null
          communication_style: string | null
          company: string | null
          confidence_score: string | null
          context: string | null
          conversation_starters: Json | null
          created_at: string
          department: string | null
          education: Json | null
          email: string | null
          email_confidence: string | null
          email_pattern: string | null
          email_source: string | null
          id: string
          job_id: string
          job_title: string | null
          key_interests: Json | null
          linkedin_url: string | null
          location: string | null
          notable_achievements: string | null
          notable_content: Json | null
          other_socials: Json | null
          people_row_id: string
          person_name: string
          phone: string | null
          phone_source: string | null
          photo_url: string | null
          previous_roles: Json | null
          quotes: Json | null
          recent_news: Json | null
          reports_to: string | null
          research_summary: string | null
          role_source: string | null
          start_date: string | null
          twitter_handle: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          achievements_source?: string | null
          aliases?: Json | null
          all_citations?: Json | null
          biography?: string | null
          biography_source?: string | null
          career_highlights?: Json | null
          communication_style?: string | null
          company?: string | null
          confidence_score?: string | null
          context?: string | null
          conversation_starters?: Json | null
          created_at?: string
          department?: string | null
          education?: Json | null
          email?: string | null
          email_confidence?: string | null
          email_pattern?: string | null
          email_source?: string | null
          id?: string
          job_id: string
          job_title?: string | null
          key_interests?: Json | null
          linkedin_url?: string | null
          location?: string | null
          notable_achievements?: string | null
          notable_content?: Json | null
          other_socials?: Json | null
          people_row_id: string
          person_name: string
          phone?: string | null
          phone_source?: string | null
          photo_url?: string | null
          previous_roles?: Json | null
          quotes?: Json | null
          recent_news?: Json | null
          reports_to?: string | null
          research_summary?: string | null
          role_source?: string | null
          start_date?: string | null
          twitter_handle?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          achievements_source?: string | null
          aliases?: Json | null
          all_citations?: Json | null
          biography?: string | null
          biography_source?: string | null
          career_highlights?: Json | null
          communication_style?: string | null
          company?: string | null
          confidence_score?: string | null
          context?: string | null
          conversation_starters?: Json | null
          created_at?: string
          department?: string | null
          education?: Json | null
          email?: string | null
          email_confidence?: string | null
          email_pattern?: string | null
          email_source?: string | null
          id?: string
          job_id?: string
          job_title?: string | null
          key_interests?: Json | null
          linkedin_url?: string | null
          location?: string | null
          notable_achievements?: string | null
          notable_content?: Json | null
          other_socials?: Json | null
          people_row_id?: string
          person_name?: string
          phone?: string | null
          phone_source?: string | null
          photo_url?: string | null
          previous_roles?: Json | null
          quotes?: Json | null
          recent_news?: Json | null
          reports_to?: string | null
          research_summary?: string | null
          role_source?: string | null
          start_date?: string | null
          twitter_handle?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enriched_people_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "people_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enriched_people_people_row_id_fkey"
            columns: ["people_row_id"]
            isOneToOne: false
            referencedRelation: "people_rows"
            referencedColumns: ["id"]
          },
        ]
      }
      enrichment_jobs: {
        Row: {
          created_at: string
          estimated_cost_usd: number
          id: string
          processed_rows: number
          project_id: string
          status: string
          total_rows: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          estimated_cost_usd?: number
          id: string
          processed_rows?: number
          project_id: string
          status?: string
          total_rows?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          estimated_cost_usd?: number
          id?: string
          processed_rows?: number
          project_id?: string
          status?: string
          total_rows?: number
          updated_at?: string
        }
        Relationships: []
      }
      enrichment_rows: {
        Row: {
          club_name: string
          created_at: string
          error_message: string | null
          id: string
          instagram_handle: string | null
          job_id: string
          status: string
          website_url: string
        }
        Insert: {
          club_name: string
          created_at?: string
          error_message?: string | null
          id?: string
          instagram_handle?: string | null
          job_id: string
          status?: string
          website_url: string
        }
        Update: {
          club_name?: string
          created_at?: string
          error_message?: string | null
          id?: string
          instagram_handle?: string | null
          job_id?: string
          status?: string
          website_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrichment_rows_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "enrichment_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_company_data: {
        Row: {
          biography: string | null
          created_at: string | null
          external_url: string | null
          followers_count: number | null
          full_name: string | null
          id: string
          instagram_url: string
          is_business_account: boolean | null
          job_id: string
          latest_posts: Json | null
          posts_count: number | null
          profile_pic_storage_url: string | null
          raw_apify_data: Json | null
          related_profiles: Json | null
          scraped_at: string | null
          scraped_row_id: string
          updated_at: string | null
          username: string
          verified: boolean | null
        }
        Insert: {
          biography?: string | null
          created_at?: string | null
          external_url?: string | null
          followers_count?: number | null
          full_name?: string | null
          id?: string
          instagram_url: string
          is_business_account?: boolean | null
          job_id: string
          latest_posts?: Json | null
          posts_count?: number | null
          profile_pic_storage_url?: string | null
          raw_apify_data?: Json | null
          related_profiles?: Json | null
          scraped_at?: string | null
          scraped_row_id: string
          updated_at?: string | null
          username: string
          verified?: boolean | null
        }
        Update: {
          biography?: string | null
          created_at?: string | null
          external_url?: string | null
          followers_count?: number | null
          full_name?: string | null
          id?: string
          instagram_url?: string
          is_business_account?: boolean | null
          job_id?: string
          latest_posts?: Json | null
          posts_count?: number | null
          profile_pic_storage_url?: string | null
          raw_apify_data?: Json | null
          related_profiles?: Json | null
          scraped_at?: string | null
          scraped_row_id?: string
          updated_at?: string | null
          username?: string
          verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "instagram_company_data_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "instagram_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instagram_company_data_scraped_row_id_fkey"
            columns: ["scraped_row_id"]
            isOneToOne: true
            referencedRelation: "instagram_rows"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_jobs: {
        Row: {
          column_order: Json | null
          created_at: string
          estimated_cost_usd: number
          id: string
          processed_rows: number
          project_id: string
          status: string
          total_rows: number
          updated_at: string
        }
        Insert: {
          column_order?: Json | null
          created_at?: string
          estimated_cost_usd?: number
          id: string
          processed_rows?: number
          project_id: string
          status?: string
          total_rows?: number
          updated_at?: string
        }
        Update: {
          column_order?: Json | null
          created_at?: string
          estimated_cost_usd?: number
          id?: string
          processed_rows?: number
          project_id?: string
          status?: string
          total_rows?: number
          updated_at?: string
        }
        Relationships: []
      }
      instagram_rows: {
        Row: {
          created_at: string
          id: string
          instagram_url: string
          job_id: string
          last_processing_at: string | null
          original_row_data: Json | null
          retry_count: number | null
          scrape_error_message: string | null
          scrape_status: string
          scraped_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          instagram_url: string
          job_id: string
          last_processing_at?: string | null
          original_row_data?: Json | null
          retry_count?: number | null
          scrape_error_message?: string | null
          scrape_status?: string
          scraped_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          instagram_url?: string
          job_id?: string
          last_processing_at?: string | null
          original_row_data?: Json | null
          retry_count?: number | null
          scrape_error_message?: string | null
          scrape_status?: string
          scraped_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "instagram_rows_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "instagram_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      people: {
        Row: {
          created_at: string
          description: string | null
          id: string
          job_id: string
          name: string
          scraped_row_id: string
          source: string
          title: string | null
          updated_at: string
          website_url: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          job_id: string
          name: string
          scraped_row_id: string
          source?: string
          title?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          job_id?: string
          name?: string
          scraped_row_id?: string
          source?: string
          title?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "people_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "scraping_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      people_jobs: {
        Row: {
          created_at: string
          estimated_cost_usd: number
          id: string
          processed_rows: number
          project_id: string
          status: string
          total_rows: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          estimated_cost_usd?: number
          id: string
          processed_rows?: number
          project_id: string
          status?: string
          total_rows?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          estimated_cost_usd?: number
          id?: string
          processed_rows?: number
          project_id?: string
          status?: string
          total_rows?: number
          updated_at?: string
        }
        Relationships: []
      }
      people_rows: {
        Row: {
          context: string | null
          created_at: string
          error_message: string | null
          id: string
          job_id: string
          person_name: string
          status: string
        }
        Insert: {
          context?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          job_id: string
          person_name: string
          status?: string
        }
        Update: {
          context?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          job_id?: string
          person_name?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "people_rows_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "people_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      scraped_rows: {
        Row: {
          address: string | null
          business_description: string | null
          club_locations: Json | null
          created_at: string
          custom_answer_1: string | null
          custom_answer_2: string | null
          detailed_team_members: string | null
          discovered_links: Json | null
          email: string | null
          extracted_at: string | null
          extraction_error_message: string | null
          extraction_status: string
          facilities_details: string | null
          id: string
          input_tokens: number | null
          job_id: string
          logo_storage_url: string | null
          logo_url: string | null
          model_id: string | null
          number_of_clubs: number | null
          number_of_courts: number | null
          opening_hours: string | null
          original_row_data: Json | null
          output_tokens: number | null
          pages_scraped: number | null
          people_search_error: string | null
          people_search_status: string | null
          people_searched_at: string | null
          phone_number: string | null
          project_id: string
          scrape_error_message: string | null
          scrape_status: string
          scraped_at: string | null
          scraped_content: string | null
          social_media: Json | null
          team_members: string | null
          team_page_url: string | null
          updated_at: string
          website_url: string
          whatsapp_contact: string | null
        }
        Insert: {
          address?: string | null
          business_description?: string | null
          club_locations?: Json | null
          created_at?: string
          custom_answer_1?: string | null
          custom_answer_2?: string | null
          detailed_team_members?: string | null
          discovered_links?: Json | null
          email?: string | null
          extracted_at?: string | null
          extraction_error_message?: string | null
          extraction_status?: string
          facilities_details?: string | null
          id?: string
          input_tokens?: number | null
          job_id: string
          logo_storage_url?: string | null
          logo_url?: string | null
          model_id?: string | null
          number_of_clubs?: number | null
          number_of_courts?: number | null
          opening_hours?: string | null
          original_row_data?: Json | null
          output_tokens?: number | null
          pages_scraped?: number | null
          people_search_error?: string | null
          people_search_status?: string | null
          people_searched_at?: string | null
          phone_number?: string | null
          project_id: string
          scrape_error_message?: string | null
          scrape_status?: string
          scraped_at?: string | null
          scraped_content?: string | null
          social_media?: Json | null
          team_members?: string | null
          team_page_url?: string | null
          updated_at?: string
          website_url: string
          whatsapp_contact?: string | null
        }
        Update: {
          address?: string | null
          business_description?: string | null
          club_locations?: Json | null
          created_at?: string
          custom_answer_1?: string | null
          custom_answer_2?: string | null
          detailed_team_members?: string | null
          discovered_links?: Json | null
          email?: string | null
          extracted_at?: string | null
          extraction_error_message?: string | null
          extraction_status?: string
          facilities_details?: string | null
          id?: string
          input_tokens?: number | null
          job_id?: string
          logo_storage_url?: string | null
          logo_url?: string | null
          model_id?: string | null
          number_of_clubs?: number | null
          number_of_courts?: number | null
          opening_hours?: string | null
          original_row_data?: Json | null
          output_tokens?: number | null
          pages_scraped?: number | null
          people_search_error?: string | null
          people_search_status?: string | null
          people_searched_at?: string | null
          phone_number?: string | null
          project_id?: string
          scrape_error_message?: string | null
          scrape_status?: string
          scraped_at?: string | null
          scraped_content?: string | null
          social_media?: Json | null
          team_members?: string | null
          team_page_url?: string | null
          updated_at?: string
          website_url?: string
          whatsapp_contact?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scraped_rows_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "scraping_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scraped_rows_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "ai_extraction_models"
            referencedColumns: ["id"]
          },
        ]
      }
      scraping_jobs: {
        Row: {
          conversation: Json | null
          created_at: string
          estimated_cost_usd: number
          extraction_config: Json | null
          id: string
          processed_rows: number
          project_id: string
          status: string
          total_characters_scraped: number
          total_input_tokens: number
          total_output_tokens: number
          total_pages_scraped: number
          total_rows: number
          updated_at: string
        }
        Insert: {
          conversation?: Json | null
          created_at?: string
          estimated_cost_usd?: number
          extraction_config?: Json | null
          id: string
          processed_rows?: number
          project_id: string
          status?: string
          total_characters_scraped?: number
          total_input_tokens?: number
          total_output_tokens?: number
          total_pages_scraped?: number
          total_rows?: number
          updated_at?: string
        }
        Update: {
          conversation?: Json | null
          created_at?: string
          estimated_cost_usd?: number
          extraction_config?: Json | null
          id?: string
          processed_rows?: number
          project_id?: string
          status?: string
          total_characters_scraped?: number
          total_input_tokens?: number
          total_output_tokens?: number
          total_pages_scraped?: number
          total_rows?: number
          updated_at?: string
        }
        Relationships: []
      }
      visual_identity: {
        Row: {
          branding_data: Json
          created_at: string
          id: string
          updated_at: string
          url: string
        }
        Insert: {
          branding_data?: Json
          created_at?: string
          id?: string
          updated_at?: string
          url: string
        }
        Update: {
          branding_data?: Json
          created_at?: string
          id?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      increment_enrichment_job_processed: {
        Args: { cost_increment: number; job_id_param: string }
        Returns: {
          estimated_cost_usd: number
          processed_rows: number
          status: string
          total_rows: number
        }[]
      }
      increment_instagram_job_processed: {
        Args: { cost_increment: number; job_id_param: string }
        Returns: {
          estimated_cost_usd: number
          processed_rows: number
          status: string
          total_rows: number
        }[]
      }
      increment_job_processed: {
        Args: { job_id_param: string }
        Returns: {
          processed_rows: number
          status: string
          total_rows: number
        }[]
      }
      increment_job_processed_with_cost: {
        Args: { cost_increment: number; job_id_param: string }
        Returns: {
          estimated_cost_usd: number
          processed_rows: number
          status: string
          total_pages_scraped: number
          total_rows: number
        }[]
      }
      increment_people_job_processed: {
        Args: { cost_increment: number; job_id_param: string }
        Returns: {
          estimated_cost_usd: number
          processed_rows: number
          status: string
          total_rows: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
