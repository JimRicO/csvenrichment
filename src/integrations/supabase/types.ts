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
      scraped_rows: {
        Row: {
          business_description: string | null
          created_at: string
          custom_answer_1: string | null
          custom_answer_2: string | null
          extracted_at: string | null
          extraction_error_message: string | null
          extraction_status: string
          id: string
          input_tokens: number | null
          job_id: string
          model_id: string | null
          output_tokens: number | null
          project_id: string
          scrape_error_message: string | null
          scrape_status: string
          scraped_at: string | null
          scraped_content: string | null
          social_media: Json | null
          team_members: string | null
          updated_at: string
          website_url: string
          whatsapp_contact: string | null
        }
        Insert: {
          business_description?: string | null
          created_at?: string
          custom_answer_1?: string | null
          custom_answer_2?: string | null
          extracted_at?: string | null
          extraction_error_message?: string | null
          extraction_status?: string
          id?: string
          input_tokens?: number | null
          job_id: string
          model_id?: string | null
          output_tokens?: number | null
          project_id: string
          scrape_error_message?: string | null
          scrape_status?: string
          scraped_at?: string | null
          scraped_content?: string | null
          social_media?: Json | null
          team_members?: string | null
          updated_at?: string
          website_url: string
          whatsapp_contact?: string | null
        }
        Update: {
          business_description?: string | null
          created_at?: string
          custom_answer_1?: string | null
          custom_answer_2?: string | null
          extracted_at?: string | null
          extraction_error_message?: string | null
          extraction_status?: string
          id?: string
          input_tokens?: number | null
          job_id?: string
          model_id?: string | null
          output_tokens?: number | null
          project_id?: string
          scrape_error_message?: string | null
          scrape_status?: string
          scraped_at?: string | null
          scraped_content?: string | null
          social_media?: Json | null
          team_members?: string | null
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
          id?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
