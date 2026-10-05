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
      appointments: {
        Row: {
          appointment_date: string
          appointment_time: string
          booking_for: string
          booking_ref: string
          consultation_type: string
          created_at: string
          discount: number
          doctor_id: string
          family_member_id: string | null
          fee: number
          hospital_id: string
          id: string
          notes: string | null
          patient_dob: string | null
          patient_email: string | null
          patient_gender: string | null
          patient_name: string
          patient_phone: string
          status: Database["public"]["Enums"]["appointment_status"]
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          appointment_date: string
          appointment_time: string
          booking_for?: string
          booking_ref?: string
          consultation_type?: string
          created_at?: string
          discount?: number
          doctor_id: string
          family_member_id?: string | null
          fee?: number
          hospital_id: string
          id?: string
          notes?: string | null
          patient_dob?: string | null
          patient_email?: string | null
          patient_gender?: string | null
          patient_name: string
          patient_phone: string
          status?: Database["public"]["Enums"]["appointment_status"]
          total?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          appointment_date?: string
          appointment_time?: string
          booking_for?: string
          booking_ref?: string
          consultation_type?: string
          created_at?: string
          discount?: number
          doctor_id?: string
          family_member_id?: string | null
          fee?: number
          hospital_id?: string
          id?: string
          notes?: string | null
          patient_dob?: string | null
          patient_email?: string | null
          patient_gender?: string | null
          patient_name?: string
          patient_phone?: string
          status?: Database["public"]["Enums"]["appointment_status"]
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_family_member_id_fkey"
            columns: ["family_member_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_conversations: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
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
          user_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
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
      doctors: {
        Row: {
          about: string
          available_today: boolean
          city: string
          consultation_types: string[]
          created_at: string
          education: string[]
          experience_years: number
          expertise: string[]
          featured: boolean
          fee: number
          gender: string
          hospital_id: string
          id: string
          languages: string[]
          name: string
          photo_url: string | null
          qualification: string
          rating: number
          reviews_count: number
          services: string[]
          slots: string[]
          slug: string
          specialty_id: string
        }
        Insert: {
          about?: string
          available_today?: boolean
          city: string
          consultation_types?: string[]
          created_at?: string
          education?: string[]
          experience_years?: number
          expertise?: string[]
          featured?: boolean
          fee?: number
          gender?: string
          hospital_id: string
          id?: string
          languages?: string[]
          name: string
          photo_url?: string | null
          qualification?: string
          rating?: number
          reviews_count?: number
          services?: string[]
          slots?: string[]
          slug: string
          specialty_id: string
        }
        Update: {
          about?: string
          available_today?: boolean
          city?: string
          consultation_types?: string[]
          created_at?: string
          education?: string[]
          experience_years?: number
          expertise?: string[]
          featured?: boolean
          fee?: number
          gender?: string
          hospital_id?: string
          id?: string
          languages?: string[]
          name?: string
          photo_url?: string | null
          qualification?: string
          rating?: number
          reviews_count?: number
          services?: string[]
          slots?: string[]
          slug?: string
          specialty_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "doctors_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctors_specialty_id_fkey"
            columns: ["specialty_id"]
            isOneToOne: false
            referencedRelation: "specialties"
            referencedColumns: ["id"]
          },
        ]
      }
      family_members: {
        Row: {
          blood_group: string | null
          created_at: string
          date_of_birth: string | null
          full_name: string
          gender: string | null
          id: string
          phone: string | null
          relation: string
          updated_at: string
          user_id: string
        }
        Insert: {
          blood_group?: string | null
          created_at?: string
          date_of_birth?: string | null
          full_name: string
          gender?: string | null
          id?: string
          phone?: string | null
          relation: string
          updated_at?: string
          user_id: string
        }
        Update: {
          blood_group?: string | null
          created_at?: string
          date_of_birth?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          phone?: string | null
          relation?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      health_packages: {
        Row: {
          category: string
          city: string
          created_at: string
          description: string
          discounted_price: number
          duration: string
          eligibility: string
          featured: boolean
          hospital_id: string
          id: string
          image_url: string | null
          name: string
          price: number
          services: string[]
          slug: string
          tests: string[]
        }
        Insert: {
          category?: string
          city: string
          created_at?: string
          description?: string
          discounted_price: number
          duration?: string
          eligibility?: string
          featured?: boolean
          hospital_id: string
          id?: string
          image_url?: string | null
          name: string
          price: number
          services?: string[]
          slug: string
          tests?: string[]
        }
        Update: {
          category?: string
          city?: string
          created_at?: string
          description?: string
          discounted_price?: number
          duration?: string
          eligibility?: string
          featured?: boolean
          hospital_id?: string
          id?: string
          image_url?: string | null
          name?: string
          price?: number
          services?: string[]
          slug?: string
          tests?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "health_packages_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      health_records: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          record_date: string
          record_type: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          record_date?: string
          record_type?: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          record_date?: string
          record_type?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      hospitals: {
        Row: {
          about: string
          address: string
          beds: number | null
          city: string
          created_at: string
          departments: string[]
          email: string | null
          emergency: boolean
          established: number | null
          facilities: string[]
          featured: boolean
          hours: string
          id: string
          image_url: string | null
          name: string
          phone: string
          rating: number
          reviews_count: number
          services: string[]
          slug: string
        }
        Insert: {
          about?: string
          address?: string
          beds?: number | null
          city: string
          created_at?: string
          departments?: string[]
          email?: string | null
          emergency?: boolean
          established?: number | null
          facilities?: string[]
          featured?: boolean
          hours?: string
          id?: string
          image_url?: string | null
          name: string
          phone?: string
          rating?: number
          reviews_count?: number
          services?: string[]
          slug: string
        }
        Update: {
          about?: string
          address?: string
          beds?: number | null
          city?: string
          created_at?: string
          departments?: string[]
          email?: string | null
          emergency?: boolean
          established?: number | null
          facilities?: string[]
          featured?: boolean
          hours?: string
          id?: string
          image_url?: string | null
          name?: string
          phone?: string
          rating?: number
          reviews_count?: number
          services?: string[]
          slug?: string
        }
        Relationships: []
      }
      package_bookings: {
        Row: {
          amount: number
          booking_date: string
          booking_ref: string
          booking_time: string
          created_at: string
          discount: number
          hospital_id: string
          id: string
          package_id: string
          patient_email: string | null
          patient_name: string
          patient_phone: string
          status: Database["public"]["Enums"]["appointment_status"]
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          booking_date: string
          booking_ref?: string
          booking_time: string
          created_at?: string
          discount?: number
          hospital_id: string
          id?: string
          package_id: string
          patient_email?: string | null
          patient_name: string
          patient_phone: string
          status?: Database["public"]["Enums"]["appointment_status"]
          total?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          booking_date?: string
          booking_ref?: string
          booking_time?: string
          created_at?: string
          discount?: number
          hospital_id?: string
          id?: string
          package_id?: string
          patient_email?: string | null
          patient_name?: string
          patient_phone?: string
          status?: Database["public"]["Enums"]["appointment_status"]
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "package_bookings_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_bookings_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "health_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          booking_id: string | null
          created_at: string
          currency: string
          id: string
          payment_method: string
          payment_status: Database["public"]["Enums"]["payment_status"]
          payment_type: string
          transaction_id: string
          user_id: string
        }
        Insert: {
          amount: number
          booking_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          payment_method: string
          payment_status?: Database["public"]["Enums"]["payment_status"]
          payment_type?: string
          transaction_id: string
          user_id: string
        }
        Update: {
          amount?: number
          booking_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          payment_method?: string
          payment_status?: Database["public"]["Enums"]["payment_status"]
          payment_type?: string
          transaction_id?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          blood_group: string | null
          city: string | null
          created_at: string
          date_of_birth: string | null
          email: string | null
          full_name: string
          gender: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          blood_group?: string | null
          city?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          full_name?: string
          gender?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          blood_group?: string | null
          city?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      search_logs: {
        Row: {
          created_at: string
          id: string
          matched_specialty: string | null
          query: string
          results_count: number
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          matched_specialty?: string | null
          query: string
          results_count?: number
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          matched_specialty?: string | null
          query?: string
          results_count?: number
          user_id?: string | null
        }
        Relationships: []
      }
      specialties: {
        Row: {
          created_at: string
          description: string
          icon: string
          id: string
          keywords: string[]
          medical_name: string
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string
          icon?: string
          id?: string
          keywords?: string[]
          medical_name: string
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string
          icon?: string
          id?: string
          keywords?: string[]
          medical_name?: string
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          benefits: string[]
          created_at: string
          discount_percent: number
          featured: boolean
          id: string
          name: string
          period: string
          price: number
          slug: string
          sort_order: number
          tagline: string
        }
        Insert: {
          benefits?: string[]
          created_at?: string
          discount_percent?: number
          featured?: boolean
          id?: string
          name: string
          period?: string
          price: number
          slug: string
          sort_order?: number
          tagline?: string
        }
        Update: {
          benefits?: string[]
          created_at?: string
          discount_percent?: number
          featured?: boolean
          id?: string
          name?: string
          period?: string
          price?: number
          slug?: string
          sort_order?: number
          tagline?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          plan_id: string
          started_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          plan_id: string
          started_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          plan_id?: string
          started_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "patient" | "super_admin"
      appointment_status: "pending" | "confirmed" | "completed" | "cancelled"
      payment_status: "pending" | "successful" | "failed" | "refunded"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "patient", "super_admin"],
      appointment_status: ["pending", "confirmed", "completed", "cancelled"],
      payment_status: ["pending", "successful", "failed", "refunded"],
    },
  },
} as const
