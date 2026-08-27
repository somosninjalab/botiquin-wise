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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      chat_conversations: {
        Row: {
          anon_token: string | null
          city: string | null
          country: string | null
          ended_in_signup: boolean
          entry_context: Json
          id: string
          last_activity_at: string
          message_count: number
          region: string | null
          started_at: string
          user_id: string | null
        }
        Insert: {
          anon_token?: string | null
          city?: string | null
          country?: string | null
          ended_in_signup?: boolean
          entry_context?: Json
          id?: string
          last_activity_at?: string
          message_count?: number
          region?: string | null
          started_at?: string
          user_id?: string | null
        }
        Update: {
          anon_token?: string | null
          city?: string | null
          country?: string | null
          ended_in_signup?: boolean
          entry_context?: Json
          id?: string
          last_activity_at?: string
          message_count?: number
          region?: string | null
          started_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
          tool_calls: Json | null
        }
        Insert: {
          content?: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
          tool_calls?: Json | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
          tool_calls?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      email_idempotency_keys: {
        Row: {
          created_at: string
          id: string
          key: string
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      health_signals: {
        Row: {
          city: string | null
          conversation_id: string | null
          created_at: string
          id: string
          medication_id: string | null
          normalized_value: string | null
          region: string | null
          signal_type: Database["public"]["Enums"]["health_signal_type"]
          tag_id: string | null
          user_id: string | null
          value: string
        }
        Insert: {
          city?: string | null
          conversation_id?: string | null
          created_at?: string
          id?: string
          medication_id?: string | null
          normalized_value?: string | null
          region?: string | null
          signal_type: Database["public"]["Enums"]["health_signal_type"]
          tag_id?: string | null
          user_id?: string | null
          value: string
        }
        Update: {
          city?: string | null
          conversation_id?: string | null
          created_at?: string
          id?: string
          medication_id?: string | null
          normalized_value?: string | null
          region?: string | null
          signal_type?: Database["public"]["Enums"]["health_signal_type"]
          tag_id?: string | null
          user_id?: string | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "health_signals_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "health_signals_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "medications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "health_signals_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      medication_aliases: {
        Row: {
          alias: string
          created_at: string
          id: string
          medication_id: string
        }
        Insert: {
          alias: string
          created_at?: string
          id?: string
          medication_id: string
        }
        Update: {
          alias?: string
          created_at?: string
          id?: string
          medication_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "medication_aliases_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "medications"
            referencedColumns: ["id"]
          },
        ]
      }
      medication_followers: {
        Row: {
          created_at: string
          id: string
          medication_id: string
          threshold_pct: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          medication_id: string
          threshold_pct?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          medication_id?: string
          threshold_pct?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "medication_followers_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "medications"
            referencedColumns: ["id"]
          },
        ]
      }
      medication_prices: {
        Row: {
          currency: string
          id: string
          in_stock: boolean
          medication_id: string
          pharmacy_id: string
          price: number
          product_url: string | null
          scraped_at: string
        }
        Insert: {
          currency?: string
          id?: string
          in_stock?: boolean
          medication_id: string
          pharmacy_id: string
          price: number
          product_url?: string | null
          scraped_at?: string
        }
        Update: {
          currency?: string
          id?: string
          in_stock?: boolean
          medication_id?: string
          pharmacy_id?: string
          price?: number
          product_url?: string | null
          scraped_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "medication_prices_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "medications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medication_prices_pharmacy_id_fkey"
            columns: ["pharmacy_id"]
            isOneToOne: false
            referencedRelation: "pharmacies"
            referencedColumns: ["id"]
          },
        ]
      }
      medication_tags: {
        Row: {
          confidence: number
          created_at: string
          id: string
          medication_id: string
          source: string
          tag_id: string
        }
        Insert: {
          confidence?: number
          created_at?: string
          id?: string
          medication_id: string
          source?: string
          tag_id: string
        }
        Update: {
          confidence?: number
          created_at?: string
          id?: string
          medication_id?: string
          source?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "medication_tags_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "medications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medication_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      medications: {
        Row: {
          active_ingredient: string
          brand_names: string[]
          brand_names_text: string
          category: string | null
          created_at: string
          embedding: string | null
          embedding_updated_at: string | null
          id: string
          image_url: string | null
          indication: string | null
          indication_es: string | null
          manufacturer: string | null
          name: string
          presentation: string | null
          slug: string
          symptoms_text: string
        }
        Insert: {
          active_ingredient: string
          brand_names?: string[]
          brand_names_text?: string
          category?: string | null
          created_at?: string
          embedding?: string | null
          embedding_updated_at?: string | null
          id?: string
          image_url?: string | null
          indication?: string | null
          indication_es?: string | null
          manufacturer?: string | null
          name: string
          presentation?: string | null
          slug: string
          symptoms_text?: string
        }
        Update: {
          active_ingredient?: string
          brand_names?: string[]
          brand_names_text?: string
          category?: string | null
          created_at?: string
          embedding?: string | null
          embedding_updated_at?: string | null
          id?: string
          image_url?: string | null
          indication?: string | null
          indication_es?: string | null
          manufacturer?: string | null
          name?: string
          presentation?: string | null
          slug?: string
          symptoms_text?: string
        }
        Relationships: []
      }
      partner_leads: {
        Row: {
          city: string | null
          created_at: string
          details: string | null
          has_digital: boolean | null
          id: string
          name: string
          processed: boolean
          reference: string | null
          type: Database["public"]["Enums"]["partner_lead_type"]
          wants_boost: boolean | null
          whatsapp: string | null
        }
        Insert: {
          city?: string | null
          created_at?: string
          details?: string | null
          has_digital?: boolean | null
          id?: string
          name: string
          processed?: boolean
          reference?: string | null
          type: Database["public"]["Enums"]["partner_lead_type"]
          wants_boost?: boolean | null
          whatsapp?: string | null
        }
        Update: {
          city?: string | null
          created_at?: string
          details?: string | null
          has_digital?: boolean | null
          id?: string
          name?: string
          processed?: boolean
          reference?: string | null
          type?: Database["public"]["Enums"]["partner_lead_type"]
          wants_boost?: boolean | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      pharmacies: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          name: string
          slug: string
          website_url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          slug: string
          website_url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          slug?: string
          website_url?: string | null
        }
        Relationships: []
      }
      pharmacy_search_config: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          pharmacy_id: string
          result_link_selector: string | null
          search_url_template: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          pharmacy_id: string
          result_link_selector?: string | null
          search_url_template: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          pharmacy_id?: string
          result_link_selector?: string | null
          search_url_template?: string
          updated_at?: string
        }
        Relationships: []
      }
      price_alerts: {
        Row: {
          created_at: string
          currency: string
          id: string
          medication_id: string
          new_price: number
          pct_change: number
          pharmacy_id: string
          previous_price: number
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          medication_id: string
          new_price: number
          pct_change: number
          pharmacy_id: string
          previous_price: number
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          medication_id?: string
          new_price?: number
          pct_change?: number
          pharmacy_id?: string
          previous_price?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          birth_date: string | null
          city: string | null
          country: string | null
          created_at: string
          email: string | null
          full_name: string | null
          instant_alerts: boolean
          ip_first_seen: string | null
          phone: string | null
          region: string | null
          sex: string | null
          updated_at: string
          user_id: string
          weekly_digest: boolean
        }
        Insert: {
          birth_date?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          instant_alerts?: boolean
          ip_first_seen?: string | null
          phone?: string | null
          region?: string | null
          sex?: string | null
          updated_at?: string
          user_id: string
          weekly_digest?: boolean
        }
        Update: {
          birth_date?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          instant_alerts?: boolean
          ip_first_seen?: string | null
          phone?: string | null
          region?: string | null
          sex?: string | null
          updated_at?: string
          user_id?: string
          weekly_digest?: boolean
        }
        Relationships: []
      }
      search_events: {
        Row: {
          category: string | null
          city: string | null
          country: string | null
          created_at: string
          id: string
          medication_id: string | null
          query: string | null
          region: string | null
          result_count: number | null
          savings_usd: number
          user_id: string | null
        }
        Insert: {
          category?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          id?: string
          medication_id?: string | null
          query?: string | null
          region?: string | null
          result_count?: number | null
          savings_usd?: number
          user_id?: string | null
        }
        Update: {
          category?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          id?: string
          medication_id?: string | null
          query?: string | null
          region?: string | null
          result_count?: number | null
          savings_usd?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "search_events_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "medications"
            referencedColumns: ["id"]
          },
        ]
      }
      share_events: {
        Row: {
          channel: string
          created_at: string
          id: string
          source: string | null
          url: string | null
          user_id: string | null
        }
        Insert: {
          channel: string
          created_at?: string
          id?: string
          source?: string | null
          url?: string | null
          user_id?: string | null
        }
        Update: {
          channel?: string
          created_at?: string
          id?: string
          source?: string | null
          url?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      tag_aliases: {
        Row: {
          alias: string
          created_at: string
          id: string
          source: string
          tag_id: string
        }
        Insert: {
          alias: string
          created_at?: string
          id?: string
          source?: string
          tag_id: string
        }
        Update: {
          alias?: string
          created_at?: string
          id?: string
          source?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tag_aliases_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["tag_kind"]
          label_es: string
          parent_id: string | null
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["tag_kind"]
          label_es: string
          parent_id?: string | null
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["tag_kind"]
          label_es?: string
          parent_id?: string | null
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "tags_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      user_health_profile: {
        Row: {
          age_range: string | null
          chronic_conditions: string[]
          current_medications: string[]
          id: string
          notes: string | null
          other_meds_text: string[]
          sex: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          age_range?: string | null
          chronic_conditions?: string[]
          current_medications?: string[]
          id?: string
          notes?: string | null
          other_meds_text?: string[]
          sex?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          age_range?: string | null
          chronic_conditions?: string[]
          current_medications?: string[]
          id?: string
          notes?: string | null
          other_meds_text?: string[]
          sex?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_orders: {
        Row: {
          created_at: string
          id: string
          items: Json
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          items?: Json
          name?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          items?: Json
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      migrate_anon_conversation: {
        Args: { p_anon_token: string }
        Returns: number
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      search_medications_fuzzy: {
        Args: { lim?: number; q: string }
        Returns: {
          active_ingredient: string
          brand_names: string[]
          brand_names_text: string
          category: string | null
          created_at: string
          embedding: string | null
          embedding_updated_at: string | null
          id: string
          image_url: string | null
          indication: string | null
          indication_es: string | null
          manufacturer: string | null
          name: string
          presentation: string | null
          slug: string
          symptoms_text: string
        }[]
        SetofOptions: {
          from: "*"
          to: "medications"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      search_medications_semantic: {
        Args: {
          lim?: number
          p_active_ingredient?: string
          p_brand?: string
          p_pharmacy?: string
          p_tag_slugs?: string[]
          q_embedding?: string
          q_text?: string
        }
        Returns: {
          active_ingredient: string
          brand_names: string[]
          brand_names_text: string
          category: string
          id: string
          image_url: string
          indication: string
          indication_es: string
          manufacturer: string
          name: string
          presentation: string
          similarity: number
          slug: string
          symptoms_text: string
        }[]
      }
      suggest_medications: {
        Args: { lim?: number; q: string }
        Returns: {
          active_ingredient: string
          id: string
          name: string
          similarity: number
          slug: string
        }[]
      }
      tags_for_medication: {
        Args: { p_medication_id: string }
        Returns: {
          confidence: number
          kind: Database["public"]["Enums"]["tag_kind"]
          label_es: string
          slug: string
          source: string
        }[]
      }
      total_search_savings: { Args: never; Returns: number }
    }
    Enums: {
      app_role: "admin" | "user"
      health_signal_type:
        | "symptom"
        | "condition"
        | "medication_mentioned"
        | "medication_unknown"
        | "price_concern"
        | "pharmacy_preference"
        | "location"
        | "demographic"
      partner_lead_type: "farmacia" | "drogueria"
      tag_kind: "category" | "indication" | "symptom" | "population" | "form"
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
    Enums: {
      app_role: ["admin", "user"],
      health_signal_type: [
        "symptom",
        "condition",
        "medication_mentioned",
        "medication_unknown",
        "price_concern",
        "pharmacy_preference",
        "location",
        "demographic",
      ],
      partner_lead_type: ["farmacia", "drogueria"],
      tag_kind: ["category", "indication", "symptom", "population", "form"],
    },
  },
} as const
