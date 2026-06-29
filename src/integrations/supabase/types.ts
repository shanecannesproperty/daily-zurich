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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      article_image_audit: {
        Row: {
          action: string
          article_id: string | null
          article_title: string | null
          checked_at: string
          city: string
          id: string
          new_url: string | null
          prev_url: string | null
          probe_content_type: string | null
          probe_status: number | null
          reason: string | null
          source: string | null
          visual_check: string | null
        }
        Insert: {
          action: string
          article_id?: string | null
          article_title?: string | null
          checked_at?: string
          city: string
          id?: string
          new_url?: string | null
          prev_url?: string | null
          probe_content_type?: string | null
          probe_status?: number | null
          reason?: string | null
          source?: string | null
          visual_check?: string | null
        }
        Update: {
          action?: string
          article_id?: string | null
          article_title?: string | null
          checked_at?: string
          city?: string
          id?: string
          new_url?: string | null
          prev_url?: string | null
          probe_content_type?: string | null
          probe_status?: number | null
          reason?: string | null
          source?: string | null
          visual_check?: string | null
        }
        Relationships: []
      }
      article_views: {
        Row: {
          city: string
          slug: string
          updated_at: string
          view_count: number
        }
        Insert: {
          city: string
          slug: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          city?: string
          slug?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: []
      }
      jobs: {
        Row: {
          apply_url: string | null
          category: string | null
          city: string
          company: string
          created_at: string
          description: string | null
          employment_type: string | null
          expires_at: string | null
          id: string
          is_published: boolean
          location: string | null
          published_at: string | null
          salary_range: string | null
          source: string | null
          title: string
          updated_at: string
        }
        Insert: {
          apply_url?: string | null
          category?: string | null
          city: string
          company: string
          created_at?: string
          description?: string | null
          employment_type?: string | null
          expires_at?: string | null
          id?: string
          is_published?: boolean
          location?: string | null
          published_at?: string | null
          salary_range?: string | null
          source?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          apply_url?: string | null
          category?: string | null
          city?: string
          company?: string
          created_at?: string
          description?: string | null
          employment_type?: string | null
          expires_at?: string | null
          id?: string
          is_published?: boolean
          location?: string | null
          published_at?: string | null
          salary_range?: string | null
          source?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      syndicated_stories: {
        Row: {
          commentary: string | null
          commentary_draft: string | null
          commentary_status: string
          commentary_updated_at: string | null
          dek: string | null
          fetched_at: string
          guid: string
          id: string
          link: string
          reviewed_at: string | null
          reviewed_by: string | null
          slug: string
          source_id: string
          source_published_at: string | null
          status: string
          title: string
        }
        Insert: {
          commentary?: string | null
          commentary_draft?: string | null
          commentary_status?: string
          commentary_updated_at?: string | null
          dek?: string | null
          fetched_at?: string
          guid: string
          id?: string
          link: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          slug: string
          source_id: string
          source_published_at?: string | null
          status?: string
          title: string
        }
        Update: {
          commentary?: string | null
          commentary_draft?: string | null
          commentary_status?: string
          commentary_updated_at?: string | null
          dek?: string | null
          fetched_at?: string
          guid?: string
          id?: string
          link?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          slug?: string
          source_id?: string
          source_published_at?: string | null
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "syndicated_stories_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "syndication_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      syndication_sources: {
        Row: {
          active: boolean
          created_at: string
          feed_url: string
          homepage_url: string | null
          id: string
          last_error: string | null
          last_fetched_at: string | null
          last_fetched_count: number | null
          last_inserted_count: number | null
          name: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          feed_url: string
          homepage_url?: string | null
          id?: string
          last_error?: string | null
          last_fetched_at?: string | null
          last_fetched_count?: number | null
          last_inserted_count?: number | null
          name: string
        }
        Update: {
          active?: boolean
          created_at?: string
          feed_url?: string
          homepage_url?: string | null
          id?: string
          last_error?: string | null
          last_fetched_at?: string | null
          last_fetched_count?: number | null
          last_inserted_count?: number | null
          name?: string
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
          role: Database["public"]["Enums"]["app_role"]
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
      claim_first_admin: { Args: never; Returns: boolean }
      get_most_read: {
        Args: { p_city: string; p_limit?: number }
        Returns: {
          slug: string
          view_count: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_article_view: {
        Args: { p_city: string; p_slug: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
