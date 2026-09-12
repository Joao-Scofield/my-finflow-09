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
      finance_accounts: {
        Row: {
          balance: number
          color: string
          created_at: string
          id: string
          kind: string
          name: string
          position: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          color?: string
          created_at?: string
          id?: string
          kind?: string
          name: string
          position?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          color?: string
          created_at?: string
          id?: string
          kind?: string
          name?: string
          position?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      finance_api_tokens: {
        Row: {
          created_at: string
          id: string
          last_used_at: string | null
          name: string
          token_hash: string
          token_prefix: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_used_at?: string | null
          name: string
          token_hash: string
          token_prefix: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_used_at?: string | null
          name?: string
          token_hash?: string
          token_prefix?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      finance_bills: {
        Row: {
          account_id: string | null
          amount: number
          category_id: string | null
          created_at: string
          due_date: string
          id: string
          last_notified_for: string | null
          name: string
          notes: string
          notify_days_before: number
          paid_at: string | null
          payment_method: string
          recurring: boolean
          status: string
          transaction_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          amount?: number
          category_id?: string | null
          created_at?: string
          due_date: string
          id?: string
          last_notified_for?: string | null
          name: string
          notes?: string
          notify_days_before?: number
          paid_at?: string | null
          payment_method?: string
          recurring?: boolean
          status?: string
          transaction_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          category_id?: string | null
          created_at?: string
          due_date?: string
          id?: string
          last_notified_for?: string | null
          name?: string
          notes?: string
          notify_days_before?: number
          paid_at?: string | null
          payment_method?: string
          recurring?: boolean
          status?: string
          transaction_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_bills_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "finance_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_bills_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "finance_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_bills_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "finance_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_categories: {
        Row: {
          color: string
          created_at: string
          icon: string
          id: string
          name: string
          position: number
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color: string
          created_at?: string
          icon?: string
          id?: string
          name: string
          position?: number
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          name?: string
          position?: number
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      finance_recurrings: {
        Row: {
          account_id: string | null
          active: boolean
          amount: number
          category_id: string
          created_at: string
          day_of_month: number
          description: string
          end_date: string | null
          id: string
          payment_method: string
          start_date: string
          subcategory_id: string | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          active?: boolean
          amount: number
          category_id: string
          created_at?: string
          day_of_month?: number
          description?: string
          end_date?: string | null
          id?: string
          payment_method?: string
          start_date?: string
          subcategory_id?: string | null
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          active?: boolean
          amount?: number
          category_id?: string
          created_at?: string
          day_of_month?: number
          description?: string
          end_date?: string | null
          id?: string
          payment_method?: string
          start_date?: string
          subcategory_id?: string | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_recurrings_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "finance_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_recurrings_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "finance_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_recurrings_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "finance_subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_rules: {
        Row: {
          category_id: string
          created_at: string
          enabled: boolean
          id: string
          keywords: string[]
          name: string
          priority: number
          subcategory_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          enabled?: boolean
          id?: string
          keywords?: string[]
          name: string
          priority?: number
          subcategory_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          enabled?: boolean
          id?: string
          keywords?: string[]
          name?: string
          priority?: number
          subcategory_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_rules_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "finance_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_rules_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "finance_subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_subcategories: {
        Row: {
          category_id: string
          created_at: string
          id: string
          name: string
          position: number
          updated_at: string
          user_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          name: string
          position?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          name?: string
          position?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_subcategories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "finance_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_transactions: {
        Row: {
          account_id: string | null
          amount: number
          category_id: string | null
          created_at: string
          description: string
          id: string
          payment_method: string
          recurring_id: string | null
          recurring_month: string | null
          status: string
          subcategory_id: string | null
          transaction_date: string
          transfer_account_id: string | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          category_id?: string | null
          created_at?: string
          description?: string
          id?: string
          payment_method?: string
          recurring_id?: string | null
          recurring_month?: string | null
          status: string
          subcategory_id?: string | null
          transaction_date: string
          transfer_account_id?: string | null
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          category_id?: string | null
          created_at?: string
          description?: string
          id?: string
          payment_method?: string
          recurring_id?: string | null
          recurring_month?: string | null
          status?: string
          subcategory_id?: string | null
          transaction_date?: string
          transfer_account_id?: string | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "finance_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "finance_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_transactions_recurring_id_fkey"
            columns: ["recurring_id"]
            isOneToOne: false
            referencedRelation: "finance_recurrings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_transactions_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "finance_subcategories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_transactions_transfer_account_id_fkey"
            columns: ["transfer_account_id"]
            isOneToOne: false
            referencedRelation: "finance_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      fleet_fixed_costs: {
        Row: {
          amount: number
          created_at: string
          end_date: string | null
          id: string
          kind: string
          name: string
          periodicity: string
          start_date: string
          transaction_id: string | null
          updated_at: string
          user_id: string
          vehicle_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          end_date?: string | null
          id?: string
          kind?: string
          name: string
          periodicity?: string
          start_date: string
          transaction_id?: string | null
          updated_at?: string
          user_id: string
          vehicle_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          end_date?: string | null
          id?: string
          kind?: string
          name?: string
          periodicity?: string
          start_date?: string
          transaction_id?: string | null
          updated_at?: string
          user_id?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fleet_fixed_costs_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "finance_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_fixed_costs_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "fleet_vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      fleet_fuelings: {
        Row: {
          created_at: string
          fuel_type: string
          fueling_date: string
          full_tank: boolean
          id: string
          liters: number
          notes: string
          odometer: number
          station: string
          total_amount: number
          transaction_id: string | null
          updated_at: string
          user_id: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          fuel_type?: string
          fueling_date: string
          full_tank?: boolean
          id?: string
          liters: number
          notes?: string
          odometer: number
          station?: string
          total_amount: number
          transaction_id?: string | null
          updated_at?: string
          user_id: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          fuel_type?: string
          fueling_date?: string
          full_tank?: boolean
          id?: string
          liters?: number
          notes?: string
          odometer?: number
          station?: string
          total_amount?: number
          transaction_id?: string | null
          updated_at?: string
          user_id?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fleet_fuelings_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "finance_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_fuelings_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "fleet_vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      fleet_maintenances: {
        Row: {
          amount: number
          created_at: string
          description: string
          id: string
          kind: string
          maintenance_date: string
          next_odometer: number | null
          odometer: number
          transaction_id: string | null
          updated_at: string
          user_id: string
          vehicle_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          description?: string
          id?: string
          kind?: string
          maintenance_date: string
          next_odometer?: number | null
          odometer?: number
          transaction_id?: string | null
          updated_at?: string
          user_id: string
          vehicle_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          id?: string
          kind?: string
          maintenance_date?: string
          next_odometer?: number | null
          odometer?: number
          transaction_id?: string | null
          updated_at?: string
          user_id?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fleet_maintenances_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "finance_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_maintenances_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "fleet_vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      fleet_vehicles: {
        Row: {
          brand_model: string
          color: string
          created_at: string
          fuel_type: string
          id: string
          initial_odometer: number
          name: string
          plate: string
          position: number
          updated_at: string
          user_id: string
          year: number | null
        }
        Insert: {
          brand_model?: string
          color?: string
          created_at?: string
          fuel_type?: string
          id?: string
          initial_odometer?: number
          name: string
          plate?: string
          position?: number
          updated_at?: string
          user_id: string
          year?: number | null
        }
        Update: {
          brand_model?: string
          color?: string
          created_at?: string
          fuel_type?: string
          id?: string
          initial_odometer?: number
          name?: string
          plate?: string
          position?: number
          updated_at?: string
          user_id?: string
          year?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          preferences: Json
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          created_at?: string
          display_name: string
          preferences?: Json
          updated_at?: string
          user_id: string
          username: string
        }
        Update: {
          created_at?: string
          display_name?: string
          preferences?: Json
          updated_at?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      shopping_items: {
        Row: {
          category_id: string | null
          created_at: string
          estimated_amount: number
          id: string
          name: string
          notes: string
          position: number
          priority: string
          purchased_at: string | null
          quantity: number
          status: string
          store: string
          transaction_id: string | null
          updated_at: string
          url: string
          user_id: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          estimated_amount?: number
          id?: string
          name: string
          notes?: string
          position?: number
          priority?: string
          purchased_at?: string | null
          quantity?: number
          status?: string
          store?: string
          transaction_id?: string | null
          updated_at?: string
          url?: string
          user_id: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          estimated_amount?: number
          id?: string
          name?: string
          notes?: string
          position?: number
          priority?: string
          purchased_at?: string | null
          quantity?: number
          status?: string
          store?: string
          transaction_id?: string | null
          updated_at?: string
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopping_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "finance_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopping_items_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "finance_transactions"
            referencedColumns: ["id"]
          },
        ]
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
    Enums: {},
  },
} as const
