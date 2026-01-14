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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      notifications: {
        Row: {
          created_at: string
          id: string
          link: string | null
          message: string
          read: boolean
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          message: string
          read?: boolean
          title: string
          type?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          barcode: string
          created_at: string
          id: string
          image_url: string | null
          name: string
          price: number
          stock_gudang: number
          stock_lainnya: number
          stock_toko: number
          stock_reserved: number
          updated_at: string
        }
        Insert: {
          barcode: string
          created_at?: string
          id?: string
          image_url?: string | null
          name: string
          price?: number
          stock_gudang?: number
          stock_lainnya?: number
          stock_toko?: number
          updated_at?: string
        }
        Update: {
          barcode?: string
          created_at?: string
          id?: string
          image_url?: string | null
          name?: string
          price?: number
          stock_gudang?: number
          stock_lainnya?: number
          stock_toko?: number
          updated_at?: string
        }
        Relationships: []
      }
      sales: {
        Row: {
          cashier_id: string | null
          cashier_name: string
          created_at: string
          id: string
          payment_method: string
          sale_number: string
          stock_location: string
          total_amount: number
        }
        Insert: {
          cashier_id?: string | null
          cashier_name: string
          created_at?: string
          id?: string
          payment_method: string
          sale_number: string
          stock_location: string
          total_amount?: number
        }
        Update: {
          cashier_id?: string | null
          cashier_name?: string
          created_at?: string
          id?: string
          payment_method?: string
          sale_number?: string
          stock_location?: string
          total_amount?: number
        }
        Relationships: []
      }
      sale_items: {
        Row: {
          barcode: string
          id: string
          price: number
          product_id: string
          product_name: string
          quantity: number
          sale_id: string
          subtotal: number
        }
        Insert: {
          barcode: string
          id?: string
          price?: number
          product_id: string
          product_name: string
          quantity: number
          sale_id: string
          subtotal?: number
        }
        Update: {
          barcode?: string
          id?: string
          price?: number
          product_id?: string
          product_name?: string
          quantity?: number
          sale_id?: string
          subtotal?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_transfers: {
        Row: {
          amount: number
          cashier_id: string | null
          cashier_name: string
          created_at: string
          id: string
          note: string | null
          transfer_date: string
        }
        Insert: {
          amount?: number
          cashier_id?: string | null
          cashier_name: string
          created_at?: string
          id?: string
          note?: string | null
          transfer_date?: string
        }
        Update: {
          amount?: number
          cashier_id?: string | null
          cashier_name?: string
          created_at?: string
          id?: string
          note?: string | null
          transfer_date?: string
        }
        Relationships: []
      }
      activity_logs: {
        Row: {
          action: string
          created_at: string
          description: string
          entity_id: string | null
          entity_type: string
          id: string
          user_id: string | null
          user_name: string
          user_role: string
        }
        Insert: {
          action: string
          created_at?: string
          description: string
          entity_id?: string | null
          entity_type: string
          id?: string
          user_id?: string | null
          user_name: string
          user_role: string
        }
        Update: {
          action?: string
          created_at?: string
          description?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          user_id?: string | null
          user_name?: string
          user_role?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar: string | null
          created_at: string
          email: string
          id: string
          name: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar?: string | null
          created_at?: string
          email: string
          id?: string
          name: string
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      stock_logs: {
        Row: {
          id: string
          location: string
          note: string | null
          product_id: string
          quantity: number
          timestamp: string
          type: string
          user_id: string | null
        }
        Insert: {
          id?: string
          location: string
          note?: string | null
          product_id: string
          quantity: number
          timestamp?: string
          type: string
          user_id?: string | null
        }
        Update: {
          id?: string
          location?: string
          note?: string | null
          product_id?: string
          quantity?: number
          timestamp?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_logs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_out_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          from_location: string
          id: string
          product_id: string
          quantity: number
          rejected_reason: string | null
          requested_at: string
          requested_by: string | null
          status: string
          surat_jalan_id: string | null
          to_location: string
          to_location_name: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          from_location: string
          id?: string
          product_id: string
          quantity: number
          rejected_reason?: string | null
          requested_at?: string
          requested_by?: string | null
          status?: string
          surat_jalan_id?: string | null
          to_location: string
          to_location_name?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          from_location?: string
          id?: string
          product_id?: string
          quantity?: number
          rejected_reason?: string | null
          requested_at?: string
          requested_by?: string | null
          status?: string
          surat_jalan_id?: string | null
          to_location?: string
          to_location_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_surat_jalan"
            columns: ["surat_jalan_id"]
            isOneToOne: false
            referencedRelation: "surat_jalan"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_out_requests_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      surat_jalan: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string | null
          id: string
          number: string
          rejected_reason: string | null
          status: string
          recipient_name: string | null
          recipient_address: string | null
          type: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          number: string
          rejected_reason?: string | null
          status?: string
          recipient_name?: string | null
          recipient_address?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          number?: string
          rejected_reason?: string | null
          status?: string
          recipient_name?: string | null
          recipient_address?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      surat_jalan_items: {
        Row: {
          barcode: string
          from_location: string
          id: string
          product_id: string
          product_name: string
          quantity: number
          surat_jalan_id: string
          to_location: string
        }
        Insert: {
          barcode: string
          from_location: string
          id?: string
          product_id: string
          product_name: string
          quantity: number
          surat_jalan_id: string
          to_location: string
        }
        Update: {
          barcode?: string
          from_location?: string
          id?: string
          product_id?: string
          product_name?: string
          quantity?: number
          surat_jalan_id?: string
          to_location?: string
        }
        Relationships: [
          {
            foreignKeyName: "surat_jalan_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surat_jalan_items_surat_jalan_id_fkey"
            columns: ["surat_jalan_id"]
            isOneToOne: false
            referencedRelation: "surat_jalan"
            referencedColumns: ["id"]
          },
        ]
      },
      stock_requests: {
        Row: {
          id: string
          request_number: string | null
          cashier_id: string | null
          cashier_name: string | null
          reason: string | null
          status: string
          main_office_id: string | null
          main_office_name: string | null
          main_office_approved_at: string | null
          rejected_reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          request_number?: string | null
          cashier_id?: string | null
          cashier_name?: string | null
          reason?: string | null
          status?: string
          main_office_id?: string | null
          main_office_name?: string | null
          main_office_approved_at?: string | null
          rejected_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          request_number?: string | null
          cashier_id?: string | null
          cashier_name?: string | null
          reason?: string | null
          status?: string
          main_office_id?: string | null
          main_office_name?: string | null
          main_office_approved_at?: string | null
          rejected_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      },
      stock_request_items: {
        Row: {
          id: string
          stock_request_id: string
          product_id: string
          quantity: number
          unit: string
          note: string | null
          created_at: string
        }
        Insert: {
          id?: string
          stock_request_id: string
          product_id: string
          quantity: number
          unit?: string
          note?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          stock_request_id?: string
          product_id?: string
          quantity?: number
          unit?: string
          note?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_request_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_request_items_stock_request_id_fkey"
            columns: ["stock_request_id"]
            isOneToOne: false
            referencedRelation: "stock_requests"
            referencedColumns: ["id"]
          }
        ]
      },
      stock_shipments: {
        Row: {
          id: string
          stock_request_id: string | null
          shipped_by: string | null
          shipped_at: string
          status: string
          auditor_id: string | null
          auditor_approved_at: string | null
          revision_note: string | null
          created_at: string
        }
        Insert: {
          id?: string
          stock_request_id?: string | null
          shipped_by?: string | null
          shipped_at?: string
          status?: string
          auditor_id?: string | null
          auditor_approved_at?: string | null
          revision_note?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          stock_request_id?: string | null
          shipped_by?: string | null
          shipped_at?: string
          status?: string
          auditor_id?: string | null
          auditor_approved_at?: string | null
          revision_note?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_shipments_stock_request_id_fkey"
            columns: ["stock_request_id"]
            isOneToOne: false
            referencedRelation: "stock_requests"
            referencedColumns: ["id"]
          }
        ]
      },
      stock_shipment_items: {
        Row: {
          id: string
          stock_shipment_id: string
          product_id: string
          quantity_shipped: number
          created_at: string
        }
        Insert: {
          id?: string
          stock_shipment_id: string
          product_id: string
          quantity_shipped: number
          created_at?: string
        }
        Update: {
          id?: string
          stock_shipment_id?: string
          product_id?: string
          quantity_shipped?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_shipment_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_shipment_items_stock_shipment_id_fkey"
            columns: ["stock_shipment_id"]
            isOneToOne: false
            referencedRelation: "stock_shipments"
            referencedColumns: ["id"]
          }
        ]
      },
      goods_receipts: {
        Row: {
          id: string
          receipt_number: string | null
          stock_request_id: string | null
          stock_shipment_id: string | null
          received_by: string | null
          received_at: string
          photo_url: string | null
          note: string | null
          created_at: string
        }
        Insert: {
          id?: string
          receipt_number?: string | null
          stock_request_id?: string | null
          stock_shipment_id?: string | null
          received_by?: string | null
          received_at?: string
          photo_url?: string | null
          note?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          receipt_number?: string | null
          stock_request_id?: string | null
          stock_shipment_id?: string | null
          received_by?: string | null
          received_at?: string
          photo_url?: string | null
          note?: string | null
          created_at?: string
        }
        Relationships: []
      },
      goods_issue_notes: {
        Row: {
          id: string
          issue_number: string | null
          surat_jalan_id: string | null
          issued_by: string | null
          issued_at: string
          status: string
          auditor_id: string | null
          verified_at: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          issue_number?: string | null
          surat_jalan_id?: string | null
          issued_by?: string | null
          issued_at?: string
          status?: string
          auditor_id?: string | null
          verified_at?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          issue_number?: string | null
          surat_jalan_id?: string | null
          issued_by?: string | null
          issued_at?: string
          status?: string
          auditor_id?: string | null
          verified_at?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "goods_issue_notes_surat_jalan_id_fkey"
            columns: ["surat_jalan_id"]
            isOneToOne: false
            referencedRelation: "surat_jalan"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_next_document_number: {
        Args: {
          doc_type: string
        }
        Returns: string
      },
      reserve_stock: {
        Args: {
          p_product_id: string
          p_quantity: number
        }
        Returns: void
      },
      release_stock_reservation: {
        Args: {
          p_product_id: string
          p_quantity: number
        }
        Returns: void
      },
      commit_stock_issue: {
        Args: {
          p_product_id: string
          p_quantity: number
        }
        Returns: void
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
