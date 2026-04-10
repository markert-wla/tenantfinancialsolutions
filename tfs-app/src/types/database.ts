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
      availability: {
        Row: {
          coach_id: string
          day_of_week: number
          end_time_utc: string
          id: string
          start_time_utc: string
        }
        Insert: {
          coach_id: string
          day_of_week: number
          end_time_utc: string
          id?: string
          start_time_utc: string
        }
        Update: {
          coach_id?: string
          day_of_week?: number
          end_time_utc?: string
          id?: string
          start_time_utc?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          client_id: string
          coach_id: string
          created_at: string
          end_time_utc: string
          id: string
          notes: string | null
          start_time_utc: string
          status: Database["public"]["Enums"]["booking_status"]
        }
        Insert: {
          client_id: string
          coach_id: string
          created_at?: string
          end_time_utc: string
          id?: string
          notes?: string | null
          start_time_utc: string
          status?: Database["public"]["Enums"]["booking_status"]
        }
        Update: {
          client_id?: string
          coach_id?: string
          created_at?: string
          end_time_utc?: string
          id?: string
          notes?: string | null
          start_time_utc?: string
          status?: Database["public"]["Enums"]["booking_status"]
        }
        Relationships: [
          {
            foreignKeyName: "bookings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
        ]
      }
      coaches: {
        Row: {
          bio: string | null
          display_name: string
          email: string
          id: string
          is_active: boolean
          photo_url: string | null
          specialty: string | null
          timezone: string
        }
        Insert: {
          bio?: string | null
          display_name: string
          email: string
          id: string
          is_active?: boolean
          photo_url?: string | null
          specialty?: string | null
          timezone?: string
        }
        Update: {
          bio?: string | null
          display_name?: string
          email?: string
          id?: string
          is_active?: boolean
          photo_url?: string | null
          specialty?: string | null
          timezone?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaches_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      group_sessions: {
        Row: {
          coaches_present: string[]
          created_at: string
          id: string
          join_link: string | null
          recording_url: string | null
          reminder_sent: boolean
          session_date: string
        }
        Insert: {
          coaches_present?: string[]
          created_at?: string
          id?: string
          join_link?: string | null
          recording_url?: string | null
          reminder_sent?: boolean
          session_date: string
        }
        Update: {
          coaches_present?: string[]
          created_at?: string
          id?: string
          join_link?: string | null
          recording_url?: string | null
          reminder_sent?: boolean
          session_date?: string
        }
        Relationships: []
      }
      partners: {
        Row: {
          contact_email: string | null
          contact_name: string | null
          created_at: string
          id: string
          model: Database["public"]["Enums"]["partner_model"] | null
          partner_name: string
          partner_type: Database["public"]["Enums"]["partner_type"]
        }
        Insert: {
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          id?: string
          model?: Database["public"]["Enums"]["partner_model"] | null
          partner_name: string
          partner_type: Database["public"]["Enums"]["partner_type"]
        }
        Update: {
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          id?: string
          model?: Database["public"]["Enums"]["partner_model"] | null
          partner_name?: string
          partner_type?: Database["public"]["Enums"]["partner_type"]
        }
        Relationships: []
      }
      profiles: {
        Row: {
          birthday_month: number | null
          created_at: string
          email: string
          first_name: string
          id: string
          is_active: boolean
          last_active_at: string
          last_name: string
          plan_tier: Database["public"]["Enums"]["plan_tier"]
          promo_code_used: string | null
          role: Database["public"]["Enums"]["user_role"]
          sessions_used_this_month: number
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          timezone: string
          unit_number: string | null
        }
        Insert: {
          birthday_month?: number | null
          created_at?: string
          email: string
          first_name: string
          id: string
          is_active?: boolean
          last_active_at?: string
          last_name: string
          plan_tier?: Database["public"]["Enums"]["plan_tier"]
          promo_code_used?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          sessions_used_this_month?: number
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          timezone?: string
          unit_number?: string | null
        }
        Update: {
          birthday_month?: number | null
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          is_active?: boolean
          last_active_at?: string
          last_name?: string
          plan_tier?: Database["public"]["Enums"]["plan_tier"]
          promo_code_used?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          sessions_used_this_month?: number
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          timezone?: string
          unit_number?: string | null
        }
        Relationships: []
      }
      promo_codes: {
        Row: {
          assigned_tier: Database["public"]["Enums"]["plan_tier"]
          code: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          is_active: boolean
          max_uses: number
          partner_name: string
          partner_type: Database["public"]["Enums"]["partner_type"]
          uses_count: number
        }
        Insert: {
          assigned_tier: Database["public"]["Enums"]["plan_tier"]
          code: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          is_active?: boolean
          max_uses?: number
          partner_name: string
          partner_type: Database["public"]["Enums"]["partner_type"]
          uses_count?: number
        }
        Update: {
          assigned_tier?: Database["public"]["Enums"]["plan_tier"]
          code?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          is_active?: boolean
          max_uses?: number
          partner_name?: string
          partner_type?: Database["public"]["Enums"]["partner_type"]
          uses_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "promo_codes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      testimonials: {
        Row: {
          approved: boolean
          client_name: string
          id: string
          plan_tier: Database["public"]["Enums"]["plan_tier"] | null
          quote: string
          submitted_at: string
        }
        Insert: {
          approved?: boolean
          client_name: string
          id?: string
          plan_tier?: Database["public"]["Enums"]["plan_tier"] | null
          quote: string
          submitted_at?: string
        }
        Update: {
          approved?: boolean
          client_name?: string
          id?: string
          plan_tier?: Database["public"]["Enums"]["plan_tier"] | null
          quote?: string
          submitted_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      reset_monthly_sessions: { Args: never; Returns: undefined }
    }
    Enums: {
      booking_status: "pending" | "confirmed" | "cancelled"
      partner_model: "affiliate" | "paying"
      partner_type: "property_management" | "nonprofit" | "trial"
      plan_tier: "free" | "bronze" | "silver" | "gold"
      user_role: "client" | "coach" | "admin"
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
      booking_status: ["pending", "confirmed", "cancelled"],
      partner_model: ["affiliate", "paying"],
      partner_type: ["property_management", "nonprofit", "trial"],
      plan_tier: ["free", "bronze", "silver", "gold"],
      user_role: ["client", "coach", "admin"],
    },
  },
} as const
