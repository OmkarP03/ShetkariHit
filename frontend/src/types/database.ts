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
      advisory_actions: {
        Row: {
          action_date: string
          action_notes: string | null
          action_type: string
          advisory_id: string
          created_at: string
          farmer_id: string
          id: string
        }
        Insert: {
          action_date?: string
          action_notes?: string | null
          action_type: string
          advisory_id: string
          created_at?: string
          farmer_id: string
          id?: string
        }
        Update: {
          action_date?: string
          action_notes?: string | null
          action_type?: string
          advisory_id?: string
          created_at?: string
          farmer_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_advisory_action_advisory"
            columns: ["advisory_id"]
            isOneToOne: false
            referencedRelation: "farmer_advisories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_advisory_action_farmer"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      advisory_categories: {
        Row: {
          category_code: string
          category_name: string
          category_name_hindi: string | null
          category_name_marathi: string | null
          created_at: string
          description: string | null
          icon_name: string | null
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          category_code: string
          category_name: string
          category_name_hindi?: string | null
          category_name_marathi?: string | null
          created_at?: string
          description?: string | null
          icon_name?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          category_code?: string
          category_name?: string
          category_name_hindi?: string | null
          category_name_marathi?: string | null
          created_at?: string
          description?: string | null
          icon_name?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      advisory_feedback: {
        Row: {
          advisory_id: string
          created_at: string
          farmer_id: string
          feedback_text: string | null
          id: string
          is_helpful: boolean | null
          rating: number | null
        }
        Insert: {
          advisory_id: string
          created_at?: string
          farmer_id: string
          feedback_text?: string | null
          id?: string
          is_helpful?: boolean | null
          rating?: number | null
        }
        Update: {
          advisory_id?: string
          created_at?: string
          farmer_id?: string
          feedback_text?: string | null
          id?: string
          is_helpful?: boolean | null
          rating?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "advisory_feedback_advisory_id_fkey"
            columns: ["advisory_id"]
            isOneToOne: false
            referencedRelation: "farmer_advisories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advisory_feedback_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      advisory_generation_logs: {
        Row: {
          advisory_id: string | null
          confidence_score: number | null
          crop_cycle_id: string | null
          error_message: string | null
          farmer_id: string
          generated_at: string
          generation_method: string
          generation_status: string
          id: string
          input_summary: Json | null
          model_name: string | null
        }
        Insert: {
          advisory_id?: string | null
          confidence_score?: number | null
          crop_cycle_id?: string | null
          error_message?: string | null
          farmer_id: string
          generated_at?: string
          generation_method: string
          generation_status?: string
          id?: string
          input_summary?: Json | null
          model_name?: string | null
        }
        Update: {
          advisory_id?: string | null
          confidence_score?: number | null
          crop_cycle_id?: string | null
          error_message?: string | null
          farmer_id?: string
          generated_at?: string
          generation_method?: string
          generation_status?: string
          id?: string
          input_summary?: Json | null
          model_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_generation_advisory"
            columns: ["advisory_id"]
            isOneToOne: false
            referencedRelation: "farmer_advisories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_generation_crop"
            columns: ["crop_cycle_id"]
            isOneToOne: false
            referencedRelation: "crop_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_generation_farmer"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_events: {
        Row: {
          actual_value: number | null
          created_at: string
          crop_cycle_id: string | null
          detected_at: string
          event_data: Json | null
          event_source: string | null
          event_type: string
          farmer_id: string
          id: string
          is_active: boolean
          resolved_at: string | null
          severity: string
          threshold_value: number | null
        }
        Insert: {
          actual_value?: number | null
          created_at?: string
          crop_cycle_id?: string | null
          detected_at?: string
          event_data?: Json | null
          event_source?: string | null
          event_type: string
          farmer_id: string
          id?: string
          is_active?: boolean
          resolved_at?: string | null
          severity?: string
          threshold_value?: number | null
        }
        Update: {
          actual_value?: number | null
          created_at?: string
          crop_cycle_id?: string | null
          detected_at?: string
          event_data?: Json | null
          event_source?: string | null
          event_type?: string
          farmer_id?: string
          id?: string
          is_active?: boolean
          resolved_at?: string | null
          severity?: string
          threshold_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "alert_events_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      crop_activities: {
        Row: {
          activity_date: string
          activity_type: string
          cost: number | null
          created_at: string
          crop_cycle_id: string
          description: string | null
          id: string
          notes: string | null
          product_name: string | null
          quantity: number | null
          quantity_unit: string | null
        }
        Insert: {
          activity_date: string
          activity_type: string
          cost?: number | null
          created_at?: string
          crop_cycle_id: string
          description?: string | null
          id?: string
          notes?: string | null
          product_name?: string | null
          quantity?: number | null
          quantity_unit?: string | null
        }
        Update: {
          activity_date?: string
          activity_type?: string
          cost?: number | null
          created_at?: string
          crop_cycle_id?: string
          description?: string | null
          id?: string
          notes?: string | null
          product_name?: string | null
          quantity?: number | null
          quantity_unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crop_activities_crop_cycle_id_fkey"
            columns: ["crop_cycle_id"]
            isOneToOne: false
            referencedRelation: "crop_cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      crop_categories: {
        Row: {
          category_code: string
          category_name: string
          category_name_hindi: string | null
          category_name_marathi: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          category_code: string
          category_name: string
          category_name_hindi?: string | null
          category_name_marathi?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          category_code?: string
          category_name?: string
          category_name_hindi?: string | null
          category_name_marathi?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      crop_cycles: {
        Row: {
          actual_harvest_date: string | null
          actual_input_cost: number | null
          actual_sowing_date: string | null
          actual_yield_kg: number | null
          area_acres: number
          created_at: string
          crop_category_id: string | null
          crop_name: string
          crop_name_local: string | null
          current_stage: string | null
          estimated_input_cost: number | null
          expected_harvest_date: string | null
          expected_yield_kg: number | null
          farmer_notes: string | null
          id: string
          is_active: boolean
          planned_sowing_date: string | null
          plot_id: string
          season: string | null
          seed_source: string | null
          status: string
          updated_at: string
          variety: string | null
        }
        Insert: {
          actual_harvest_date?: string | null
          actual_input_cost?: number | null
          actual_sowing_date?: string | null
          actual_yield_kg?: number | null
          area_acres: number
          created_at?: string
          crop_category_id?: string | null
          crop_name: string
          crop_name_local?: string | null
          current_stage?: string | null
          estimated_input_cost?: number | null
          expected_harvest_date?: string | null
          expected_yield_kg?: number | null
          farmer_notes?: string | null
          id?: string
          is_active?: boolean
          planned_sowing_date?: string | null
          plot_id: string
          season?: string | null
          seed_source?: string | null
          status?: string
          updated_at?: string
          variety?: string | null
        }
        Update: {
          actual_harvest_date?: string | null
          actual_input_cost?: number | null
          actual_sowing_date?: string | null
          actual_yield_kg?: number | null
          area_acres?: number
          created_at?: string
          crop_category_id?: string | null
          crop_name?: string
          crop_name_local?: string | null
          current_stage?: string | null
          estimated_input_cost?: number | null
          expected_harvest_date?: string | null
          expected_yield_kg?: number | null
          farmer_notes?: string | null
          id?: string
          is_active?: boolean
          planned_sowing_date?: string | null
          plot_id?: string
          season?: string | null
          seed_source?: string | null
          status?: string
          updated_at?: string
          variety?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crop_cycles_crop_category_id_fkey"
            columns: ["crop_category_id"]
            isOneToOne: false
            referencedRelation: "crop_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crop_cycles_plot_id_fkey"
            columns: ["plot_id"]
            isOneToOne: false
            referencedRelation: "farm_plots"
            referencedColumns: ["id"]
          },
        ]
      }
      crop_expenses: {
        Row: {
          amount: number
          created_at: string
          crop_cycle_id: string
          description: string | null
          expense_category: string
          expense_date: string
          id: string
          quantity: number | null
          unit: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          crop_cycle_id: string
          description?: string | null
          expense_category: string
          expense_date: string
          id?: string
          quantity?: number | null
          unit?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          crop_cycle_id?: string
          description?: string | null
          expense_category?: string
          expense_date?: string
          id?: string
          quantity?: number | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crop_expenses_crop_cycle_id_fkey"
            columns: ["crop_cycle_id"]
            isOneToOne: false
            referencedRelation: "crop_cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      crop_health_issues: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          issue_code: string
          issue_name: string
          issue_name_hindi: string | null
          issue_name_marathi: string | null
          issue_type: string
          prevention: string | null
          severity_default: string | null
          symptoms: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          issue_code: string
          issue_name: string
          issue_name_hindi?: string | null
          issue_name_marathi?: string | null
          issue_type: string
          prevention?: string | null
          severity_default?: string | null
          symptoms?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          issue_code?: string
          issue_name?: string
          issue_name_hindi?: string | null
          issue_name_marathi?: string | null
          issue_type?: string
          prevention?: string | null
          severity_default?: string | null
          symptoms?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      crop_health_observations: {
        Row: {
          affected_area_acres: number | null
          ai_confidence: number | null
          created_at: string
          crop_cycle_id: string
          detection_method: string
          farmer_description: string | null
          health_issue_id: string | null
          id: string
          image_url: string | null
          location_note: string | null
          notes: string | null
          observation_date: string
          severity: string
          status: string
          symptoms_observed: string | null
          updated_at: string
        }
        Insert: {
          affected_area_acres?: number | null
          ai_confidence?: number | null
          created_at?: string
          crop_cycle_id: string
          detection_method?: string
          farmer_description?: string | null
          health_issue_id?: string | null
          id?: string
          image_url?: string | null
          location_note?: string | null
          notes?: string | null
          observation_date?: string
          severity?: string
          status?: string
          symptoms_observed?: string | null
          updated_at?: string
        }
        Update: {
          affected_area_acres?: number | null
          ai_confidence?: number | null
          created_at?: string
          crop_cycle_id?: string
          detection_method?: string
          farmer_description?: string | null
          health_issue_id?: string | null
          id?: string
          image_url?: string | null
          location_note?: string | null
          notes?: string | null
          observation_date?: string
          severity?: string
          status?: string
          symptoms_observed?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_health_observation_crop"
            columns: ["crop_cycle_id"]
            isOneToOne: false
            referencedRelation: "crop_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_health_observation_issue"
            columns: ["health_issue_id"]
            isOneToOne: false
            referencedRelation: "crop_health_issues"
            referencedColumns: ["id"]
          },
        ]
      }
      crop_stage_history: {
        Row: {
          created_at: string
          crop_cycle_id: string
          ended_at: string | null
          id: string
          is_current: boolean
          notes: string | null
          stage_name: string
          stage_number: number | null
          started_at: string
        }
        Insert: {
          created_at?: string
          crop_cycle_id: string
          ended_at?: string | null
          id?: string
          is_current?: boolean
          notes?: string | null
          stage_name: string
          stage_number?: number | null
          started_at: string
        }
        Update: {
          created_at?: string
          crop_cycle_id?: string
          ended_at?: string | null
          id?: string
          is_current?: boolean
          notes?: string | null
          stage_name?: string
          stage_number?: number | null
          started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crop_stage_history_crop_cycle_id_fkey"
            columns: ["crop_cycle_id"]
            isOneToOne: false
            referencedRelation: "crop_cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      crop_treatment_history: {
        Row: {
          application_method: string | null
          area_treated_acres: number | null
          cost: number | null
          created_at: string
          crop_cycle_id: string
          effectiveness: string | null
          farmer_notes: string | null
          health_observation_id: string | null
          id: string
          product_name: string | null
          quantity: number | null
          quantity_unit: string | null
          treatment_date: string
          treatment_id: string | null
        }
        Insert: {
          application_method?: string | null
          area_treated_acres?: number | null
          cost?: number | null
          created_at?: string
          crop_cycle_id: string
          effectiveness?: string | null
          farmer_notes?: string | null
          health_observation_id?: string | null
          id?: string
          product_name?: string | null
          quantity?: number | null
          quantity_unit?: string | null
          treatment_date?: string
          treatment_id?: string | null
        }
        Update: {
          application_method?: string | null
          area_treated_acres?: number | null
          cost?: number | null
          created_at?: string
          crop_cycle_id?: string
          effectiveness?: string | null
          farmer_notes?: string | null
          health_observation_id?: string | null
          id?: string
          product_name?: string | null
          quantity?: number | null
          quantity_unit?: string | null
          treatment_date?: string
          treatment_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_treatment_history_crop"
            columns: ["crop_cycle_id"]
            isOneToOne: false
            referencedRelation: "crop_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_treatment_history_observation"
            columns: ["health_observation_id"]
            isOneToOne: false
            referencedRelation: "crop_health_observations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_treatment_history_treatment"
            columns: ["treatment_id"]
            isOneToOne: false
            referencedRelation: "crop_treatments"
            referencedColumns: ["id"]
          },
        ]
      }
      crop_treatments: {
        Row: {
          active_ingredient: string | null
          application_frequency: string | null
          application_method: string | null
          created_at: string
          dosage: number | null
          dosage_unit: string | null
          id: string
          is_active: boolean
          purpose: string | null
          safety_precautions: string | null
          treatment_name: string
          treatment_name_hindi: string | null
          treatment_name_marathi: string | null
          treatment_type: string
          updated_at: string
          waiting_period_days: number | null
          water_quantity: number | null
          water_quantity_unit: string | null
        }
        Insert: {
          active_ingredient?: string | null
          application_frequency?: string | null
          application_method?: string | null
          created_at?: string
          dosage?: number | null
          dosage_unit?: string | null
          id?: string
          is_active?: boolean
          purpose?: string | null
          safety_precautions?: string | null
          treatment_name: string
          treatment_name_hindi?: string | null
          treatment_name_marathi?: string | null
          treatment_type: string
          updated_at?: string
          waiting_period_days?: number | null
          water_quantity?: number | null
          water_quantity_unit?: string | null
        }
        Update: {
          active_ingredient?: string | null
          application_frequency?: string | null
          application_method?: string | null
          created_at?: string
          dosage?: number | null
          dosage_unit?: string | null
          id?: string
          is_active?: boolean
          purpose?: string | null
          safety_precautions?: string | null
          treatment_name?: string
          treatment_name_hindi?: string | null
          treatment_name_marathi?: string | null
          treatment_type?: string
          updated_at?: string
          waiting_period_days?: number | null
          water_quantity?: number | null
          water_quantity_unit?: string | null
        }
        Relationships: []
      }
      data_fetch_logs: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          http_status_code: number | null
          id: string
          records_fetched: number
          records_inserted: number
          records_skipped: number
          records_updated: number
          request_parameters: Json | null
          response_metadata: Json | null
          source_id: string
          started_at: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          http_status_code?: number | null
          id?: string
          records_fetched?: number
          records_inserted?: number
          records_skipped?: number
          records_updated?: number
          request_parameters?: Json | null
          response_metadata?: Json | null
          source_id: string
          started_at?: string
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          http_status_code?: number | null
          id?: string
          records_fetched?: number
          records_inserted?: number
          records_skipped?: number
          records_updated?: number
          request_parameters?: Json | null
          response_metadata?: Json | null
          source_id?: string
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_fetch_logs_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "data_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      data_sources: {
        Row: {
          api_key_reference: string | null
          base_url: string | null
          created_at: string
          data_category: string
          description: string | null
          endpoint_url: string | null
          id: string
          is_active: boolean
          last_failed_fetch_at: string | null
          last_successful_fetch_at: string | null
          provider_name: string | null
          source_code: string
          source_name: string
          source_type: string
          update_frequency: string | null
          updated_at: string
        }
        Insert: {
          api_key_reference?: string | null
          base_url?: string | null
          created_at?: string
          data_category: string
          description?: string | null
          endpoint_url?: string | null
          id?: string
          is_active?: boolean
          last_failed_fetch_at?: string | null
          last_successful_fetch_at?: string | null
          provider_name?: string | null
          source_code: string
          source_name: string
          source_type: string
          update_frequency?: string | null
          updated_at?: string
        }
        Update: {
          api_key_reference?: string | null
          base_url?: string | null
          created_at?: string
          data_category?: string
          description?: string | null
          endpoint_url?: string | null
          id?: string
          is_active?: boolean
          last_failed_fetch_at?: string | null
          last_successful_fetch_at?: string | null
          provider_name?: string | null
          source_code?: string
          source_name?: string
          source_type?: string
          update_frequency?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      farm_plots: {
        Row: {
          area_acres: number
          boundary_geojson: Json | null
          created_at: string
          farm_id: string
          id: string
          irrigation_type: string | null
          is_active: boolean
          latitude: number | null
          longitude: number | null
          plot_name: string
          plot_number: number | null
          soil_type: string | null
          updated_at: string
          water_source: string | null
        }
        Insert: {
          area_acres: number
          boundary_geojson?: Json | null
          created_at?: string
          farm_id: string
          id?: string
          irrigation_type?: string | null
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          plot_name: string
          plot_number?: number | null
          soil_type?: string | null
          updated_at?: string
          water_source?: string | null
        }
        Update: {
          area_acres?: number
          boundary_geojson?: Json | null
          created_at?: string
          farm_id?: string
          id?: string
          irrigation_type?: string | null
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          plot_name?: string
          plot_number?: number | null
          soil_type?: string | null
          updated_at?: string
          water_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "farm_plots_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      farmer_activity_logs: {
        Row: {
          activity_data: Json | null
          activity_type: string
          created_at: string
          crop_cycle_id: string | null
          farm_id: string | null
          farmer_id: string
          id: string
          plot_id: string | null
          source: string | null
        }
        Insert: {
          activity_data?: Json | null
          activity_type: string
          created_at?: string
          crop_cycle_id?: string | null
          farm_id?: string | null
          farmer_id: string
          id?: string
          plot_id?: string | null
          source?: string | null
        }
        Update: {
          activity_data?: Json | null
          activity_type?: string
          created_at?: string
          crop_cycle_id?: string | null
          farm_id?: string | null
          farmer_id?: string
          id?: string
          plot_id?: string | null
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "farmer_activity_logs_crop_cycle_id_fkey"
            columns: ["crop_cycle_id"]
            isOneToOne: false
            referencedRelation: "crop_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "farmer_activity_logs_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "farmer_activity_logs_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "farmer_activity_logs_plot_id_fkey"
            columns: ["plot_id"]
            isOneToOne: false
            referencedRelation: "farm_plots"
            referencedColumns: ["id"]
          },
        ]
      }
      farmer_advisories: {
        Row: {
          advisory_type: string
          category_id: string | null
          confidence_score: number | null
          created_at: string
          crop_cycle_id: string | null
          data_inputs: Json | null
          farm_id: string | null
          farmer_id: string
          id: string
          is_read: boolean
          message: string
          message_hindi: string | null
          message_marathi: string | null
          model_name: string | null
          plot_id: string | null
          priority: string
          read_at: string | null
          reason: string | null
          recommendation_source: string | null
          recommended_action: string | null
          recommended_action_hindi: string | null
          recommended_action_marathi: string | null
          status: string
          title: string
          title_hindi: string | null
          title_marathi: string | null
          updated_at: string
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          advisory_type: string
          category_id?: string | null
          confidence_score?: number | null
          created_at?: string
          crop_cycle_id?: string | null
          data_inputs?: Json | null
          farm_id?: string | null
          farmer_id: string
          id?: string
          is_read?: boolean
          message: string
          message_hindi?: string | null
          message_marathi?: string | null
          model_name?: string | null
          plot_id?: string | null
          priority?: string
          read_at?: string | null
          reason?: string | null
          recommendation_source?: string | null
          recommended_action?: string | null
          recommended_action_hindi?: string | null
          recommended_action_marathi?: string | null
          status?: string
          title: string
          title_hindi?: string | null
          title_marathi?: string | null
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          advisory_type?: string
          category_id?: string | null
          confidence_score?: number | null
          created_at?: string
          crop_cycle_id?: string | null
          data_inputs?: Json | null
          farm_id?: string | null
          farmer_id?: string
          id?: string
          is_read?: boolean
          message?: string
          message_hindi?: string | null
          message_marathi?: string | null
          model_name?: string | null
          plot_id?: string | null
          priority?: string
          read_at?: string | null
          reason?: string | null
          recommendation_source?: string | null
          recommended_action?: string | null
          recommended_action_hindi?: string | null
          recommended_action_marathi?: string | null
          status?: string
          title?: string
          title_hindi?: string | null
          title_marathi?: string | null
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "farmer_advisories_crop_cycle_id_fkey"
            columns: ["crop_cycle_id"]
            isOneToOne: false
            referencedRelation: "crop_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "farmer_advisories_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "farmer_advisories_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "farmer_advisories_plot_id_fkey"
            columns: ["plot_id"]
            isOneToOne: false
            referencedRelation: "farm_plots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_advisory_category"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "advisory_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      farmer_analytics_snapshots: {
        Row: {
          active_crops: number | null
          completed_advisories: number | null
          completed_sales: number | null
          created_at: string
          disease_scans: number | null
          farmer_id: string
          id: string
          irrigation_actions: number | null
          market_checks: number | null
          produce_listings: number | null
          scheme_applications: number | null
          snapshot_date: string
          spray_actions: number | null
          total_advisories: number | null
          total_area_acres: number | null
          total_farms: number | null
          total_sales_amount: number | null
          voice_queries: number | null
        }
        Insert: {
          active_crops?: number | null
          completed_advisories?: number | null
          completed_sales?: number | null
          created_at?: string
          disease_scans?: number | null
          farmer_id: string
          id?: string
          irrigation_actions?: number | null
          market_checks?: number | null
          produce_listings?: number | null
          scheme_applications?: number | null
          snapshot_date: string
          spray_actions?: number | null
          total_advisories?: number | null
          total_area_acres?: number | null
          total_farms?: number | null
          total_sales_amount?: number | null
          voice_queries?: number | null
        }
        Update: {
          active_crops?: number | null
          completed_advisories?: number | null
          completed_sales?: number | null
          created_at?: string
          disease_scans?: number | null
          farmer_id?: string
          id?: string
          irrigation_actions?: number | null
          market_checks?: number | null
          produce_listings?: number | null
          scheme_applications?: number | null
          snapshot_date?: string
          spray_actions?: number | null
          total_advisories?: number | null
          total_area_acres?: number | null
          total_farms?: number | null
          total_sales_amount?: number | null
          voice_queries?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "farmer_analytics_snapshots_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      farmer_decision_records: {
        Row: {
          advisory_received: string | null
          created_at: string
          crop_cycle_id: string | null
          decision_after: string | null
          decision_before: string | null
          decision_date: string
          decision_type: string
          farm_id: string | null
          farmer_id: string
          id: string
          plot_id: string | null
          reason_for_change: string | null
        }
        Insert: {
          advisory_received?: string | null
          created_at?: string
          crop_cycle_id?: string | null
          decision_after?: string | null
          decision_before?: string | null
          decision_date?: string
          decision_type: string
          farm_id?: string | null
          farmer_id: string
          id?: string
          plot_id?: string | null
          reason_for_change?: string | null
        }
        Update: {
          advisory_received?: string | null
          created_at?: string
          crop_cycle_id?: string | null
          decision_after?: string | null
          decision_before?: string | null
          decision_date?: string
          decision_type?: string
          farm_id?: string | null
          farmer_id?: string
          id?: string
          plot_id?: string | null
          reason_for_change?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "farmer_decision_records_crop_cycle_id_fkey"
            columns: ["crop_cycle_id"]
            isOneToOne: false
            referencedRelation: "crop_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "farmer_decision_records_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "farmer_decision_records_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "farmer_decision_records_plot_id_fkey"
            columns: ["plot_id"]
            isOneToOne: false
            referencedRelation: "farm_plots"
            referencedColumns: ["id"]
          },
        ]
      }
      farmer_notifications: {
        Row: {
          action_required: boolean | null
          action_url: string | null
          advisory_id: string | null
          created_at: string
          crop_cycle_id: string | null
          expires_at: string | null
          farmer_id: string
          id: string
          is_read: boolean
          message: string
          message_hindi: string | null
          message_marathi: string | null
          notification_type: string
          priority: string | null
          read_at: string | null
          scheduled_for: string | null
          sent_at: string | null
          title: string
          title_hindi: string | null
          title_marathi: string | null
        }
        Insert: {
          action_required?: boolean | null
          action_url?: string | null
          advisory_id?: string | null
          created_at?: string
          crop_cycle_id?: string | null
          expires_at?: string | null
          farmer_id: string
          id?: string
          is_read?: boolean
          message: string
          message_hindi?: string | null
          message_marathi?: string | null
          notification_type: string
          priority?: string | null
          read_at?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          title: string
          title_hindi?: string | null
          title_marathi?: string | null
        }
        Update: {
          action_required?: boolean | null
          action_url?: string | null
          advisory_id?: string | null
          created_at?: string
          crop_cycle_id?: string | null
          expires_at?: string | null
          farmer_id?: string
          id?: string
          is_read?: boolean
          message?: string
          message_hindi?: string | null
          message_marathi?: string | null
          notification_type?: string
          priority?: string | null
          read_at?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          title?: string
          title_hindi?: string | null
          title_marathi?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "farmer_notifications_advisory_id_fkey"
            columns: ["advisory_id"]
            isOneToOne: false
            referencedRelation: "farmer_advisories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "farmer_notifications_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_notification_crop_cycle"
            columns: ["crop_cycle_id"]
            isOneToOne: false
            referencedRelation: "crop_cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      farmer_sales: {
        Row: {
          buyer_mobile: string | null
          buyer_name: string | null
          created_at: string
          crop_category: string | null
          crop_name: string
          farmer_id: string
          id: string
          listing_id: string | null
          market_name: string | null
          notes: string | null
          order_id: string | null
          price_per_unit: number
          quantity: number
          quantity_unit: string
          sale_date: string
          total_amount: number
        }
        Insert: {
          buyer_mobile?: string | null
          buyer_name?: string | null
          created_at?: string
          crop_category?: string | null
          crop_name: string
          farmer_id: string
          id?: string
          listing_id?: string | null
          market_name?: string | null
          notes?: string | null
          order_id?: string | null
          price_per_unit: number
          quantity: number
          quantity_unit?: string
          sale_date?: string
          total_amount: number
        }
        Update: {
          buyer_mobile?: string | null
          buyer_name?: string | null
          created_at?: string
          crop_category?: string | null
          crop_name?: string
          farmer_id?: string
          id?: string
          listing_id?: string | null
          market_name?: string | null
          notes?: string | null
          order_id?: string | null
          price_per_unit?: number
          quantity?: number
          quantity_unit?: string
          sale_date?: string
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "farmer_sales_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "farmer_sales_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "produce_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "farmer_sales_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "produce_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      farmer_scheme_recommendations: {
        Row: {
          created_at: string
          dismissed_at: string | null
          eligibility_status: string
          farmer_id: string
          id: string
          match_score: number | null
          matched_criteria: Json | null
          recommendation_reason: string | null
          scheme_id: string
          status: string
          updated_at: string
          viewed_at: string | null
        }
        Insert: {
          created_at?: string
          dismissed_at?: string | null
          eligibility_status?: string
          farmer_id: string
          id?: string
          match_score?: number | null
          matched_criteria?: Json | null
          recommendation_reason?: string | null
          scheme_id: string
          status?: string
          updated_at?: string
          viewed_at?: string | null
        }
        Update: {
          created_at?: string
          dismissed_at?: string | null
          eligibility_status?: string
          farmer_id?: string
          id?: string
          match_score?: number | null
          matched_criteria?: Json | null
          recommendation_reason?: string | null
          scheme_id?: string
          status?: string
          updated_at?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "farmer_scheme_recommendations_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "farmer_scheme_recommendations_scheme_id_fkey"
            columns: ["scheme_id"]
            isOneToOne: false
            referencedRelation: "government_schemes"
            referencedColumns: ["id"]
          },
        ]
      }
      farms: {
        Row: {
          boundary_geojson: Json | null
          created_at: string
          district: string | null
          farm_name: string | null
          farmer_id: string
          id: string
          irrigation_type: string | null
          is_active: boolean
          latitude: number | null
          longitude: number | null
          ownership_type: string | null
          pincode: string | null
          primary_water_source: string | null
          soil_type: string | null
          state: string | null
          taluka: string | null
          total_area_acres: number
          updated_at: string
          village: string | null
        }
        Insert: {
          boundary_geojson?: Json | null
          created_at?: string
          district?: string | null
          farm_name?: string | null
          farmer_id: string
          id?: string
          irrigation_type?: string | null
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          ownership_type?: string | null
          pincode?: string | null
          primary_water_source?: string | null
          soil_type?: string | null
          state?: string | null
          taluka?: string | null
          total_area_acres: number
          updated_at?: string
          village?: string | null
        }
        Update: {
          boundary_geojson?: Json | null
          created_at?: string
          district?: string | null
          farm_name?: string | null
          farmer_id?: string
          id?: string
          irrigation_type?: string | null
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          ownership_type?: string | null
          pincode?: string | null
          primary_water_source?: string | null
          soil_type?: string | null
          state?: string | null
          taluka?: string | null
          total_area_acres?: number
          updated_at?: string
          village?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "farms_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      government_schemes: {
        Row: {
          application_mode: string | null
          application_url: string | null
          benefit_amount: number | null
          benefit_description: string | null
          benefit_type: string | null
          category: string | null
          created_at: string
          department: string | null
          description: string | null
          eligible_categories: string[] | null
          eligible_districts: string[] | null
          eligible_farmer_types: string[] | null
          eligible_states: string[] | null
          id: string
          is_active: boolean
          last_synced_at: string | null
          official_website: string | null
          scheme_code: string | null
          scheme_name: string
          scheme_name_hindi: string | null
          scheme_name_marathi: string | null
          short_description: string | null
          source_name: string | null
          source_scheme_id: string | null
          source_url: string | null
          updated_at: string
        }
        Insert: {
          application_mode?: string | null
          application_url?: string | null
          benefit_amount?: number | null
          benefit_description?: string | null
          benefit_type?: string | null
          category?: string | null
          created_at?: string
          department?: string | null
          description?: string | null
          eligible_categories?: string[] | null
          eligible_districts?: string[] | null
          eligible_farmer_types?: string[] | null
          eligible_states?: string[] | null
          id?: string
          is_active?: boolean
          last_synced_at?: string | null
          official_website?: string | null
          scheme_code?: string | null
          scheme_name: string
          scheme_name_hindi?: string | null
          scheme_name_marathi?: string | null
          short_description?: string | null
          source_name?: string | null
          source_scheme_id?: string | null
          source_url?: string | null
          updated_at?: string
        }
        Update: {
          application_mode?: string | null
          application_url?: string | null
          benefit_amount?: number | null
          benefit_description?: string | null
          benefit_type?: string | null
          category?: string | null
          created_at?: string
          department?: string | null
          description?: string | null
          eligible_categories?: string[] | null
          eligible_districts?: string[] | null
          eligible_farmer_types?: string[] | null
          eligible_states?: string[] | null
          id?: string
          is_active?: boolean
          last_synced_at?: string | null
          official_website?: string | null
          scheme_code?: string | null
          scheme_name?: string
          scheme_name_hindi?: string | null
          scheme_name_marathi?: string | null
          short_description?: string | null
          source_name?: string | null
          source_scheme_id?: string | null
          source_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      health_issue_crop_rules: {
        Row: {
          created_at: string
          crop_category_id: string | null
          crop_name: string | null
          favorable_conditions: string | null
          health_issue_id: string
          id: string
          identification_notes: string | null
          is_active: boolean
          susceptibility_level: string | null
        }
        Insert: {
          created_at?: string
          crop_category_id?: string | null
          crop_name?: string | null
          favorable_conditions?: string | null
          health_issue_id: string
          id?: string
          identification_notes?: string | null
          is_active?: boolean
          susceptibility_level?: string | null
        }
        Update: {
          created_at?: string
          crop_category_id?: string | null
          crop_name?: string | null
          favorable_conditions?: string | null
          health_issue_id?: string
          id?: string
          identification_notes?: string | null
          is_active?: boolean
          susceptibility_level?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_rule_crop_category"
            columns: ["crop_category_id"]
            isOneToOne: false
            referencedRelation: "crop_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_rule_health_issue"
            columns: ["health_issue_id"]
            isOneToOne: false
            referencedRelation: "crop_health_issues"
            referencedColumns: ["id"]
          },
        ]
      }
      health_treatment_recommendations: {
        Row: {
          additional_precautions: string | null
          created_at: string
          health_issue_id: string
          id: string
          is_active: boolean
          minimum_interval_days: number | null
          recommendation_priority: number
          recommendation_text: string | null
          recommendation_text_hindi: string | null
          recommendation_text_marathi: string | null
          suitable_severity: string | null
          treatment_id: string
          updated_at: string
          weather_condition_note: string | null
        }
        Insert: {
          additional_precautions?: string | null
          created_at?: string
          health_issue_id: string
          id?: string
          is_active?: boolean
          minimum_interval_days?: number | null
          recommendation_priority?: number
          recommendation_text?: string | null
          recommendation_text_hindi?: string | null
          recommendation_text_marathi?: string | null
          suitable_severity?: string | null
          treatment_id: string
          updated_at?: string
          weather_condition_note?: string | null
        }
        Update: {
          additional_precautions?: string | null
          created_at?: string
          health_issue_id?: string
          id?: string
          is_active?: boolean
          minimum_interval_days?: number | null
          recommendation_priority?: number
          recommendation_text?: string | null
          recommendation_text_hindi?: string | null
          recommendation_text_marathi?: string | null
          suitable_severity?: string | null
          treatment_id?: string
          updated_at?: string
          weather_condition_note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_recommendation_issue"
            columns: ["health_issue_id"]
            isOneToOne: false
            referencedRelation: "crop_health_issues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_recommendation_treatment"
            columns: ["treatment_id"]
            isOneToOne: false
            referencedRelation: "crop_treatments"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          created_at: string
          id: number
          is_active: boolean
          level: string
          lgd_code: number
          name: string
          name_local: string | null
          parent_code: number | null
          state_code: number
        }
        Insert: {
          created_at?: string
          id?: never
          is_active?: boolean
          level: string
          lgd_code: number
          name: string
          name_local?: string | null
          parent_code?: number | null
          state_code: number
        }
        Update: {
          created_at?: string
          id?: never
          is_active?: boolean
          level?: string
          lgd_code?: number
          name?: string
          name_local?: string | null
          parent_code?: number | null
          state_code?: number
        }
        Relationships: []
      }
      market_prices: {
        Row: {
          created_at: string | null
          crop_category_id: string | null
          crop_name: string
          data_source_id: string | null
          district: string | null
          fetched_at: string | null
          id: string
          market_location: string | null
          market_name: string
          max_price: number | null
          min_price: number | null
          modal_price: number | null
          price_date: string
          price_unit: string | null
          state: string | null
          taluka: string | null
          updated_at: string | null
          village: string | null
        }
        Insert: {
          created_at?: string | null
          crop_category_id?: string | null
          crop_name: string
          data_source_id?: string | null
          district?: string | null
          fetched_at?: string | null
          id?: string
          market_location?: string | null
          market_name: string
          max_price?: number | null
          min_price?: number | null
          modal_price?: number | null
          price_date: string
          price_unit?: string | null
          state?: string | null
          taluka?: string | null
          updated_at?: string | null
          village?: string | null
        }
        Update: {
          created_at?: string | null
          crop_category_id?: string | null
          crop_name?: string
          data_source_id?: string | null
          district?: string | null
          fetched_at?: string | null
          id?: string
          market_location?: string | null
          market_name?: string
          max_price?: number | null
          min_price?: number | null
          modal_price?: number | null
          price_date?: string
          price_unit?: string | null
          state?: string | null
          taluka?: string | null
          updated_at?: string | null
          village?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "market_prices_crop_category_id_fkey"
            columns: ["crop_category_id"]
            isOneToOne: false
            referencedRelation: "crop_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_prices_data_source_id_fkey"
            columns: ["data_source_id"]
            isOneToOne: false
            referencedRelation: "data_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_delivery_logs: {
        Row: {
          created_at: string
          delivered_at: string | null
          delivery_channel: string
          delivery_status: string
          error_message: string | null
          farmer_id: string
          id: string
          notification_id: string
          provider_message_id: string | null
          provider_name: string | null
        }
        Insert: {
          created_at?: string
          delivered_at?: string | null
          delivery_channel: string
          delivery_status?: string
          error_message?: string | null
          farmer_id: string
          id?: string
          notification_id: string
          provider_message_id?: string | null
          provider_name?: string | null
        }
        Update: {
          created_at?: string
          delivered_at?: string | null
          delivery_channel?: string
          delivery_status?: string
          error_message?: string | null
          farmer_id?: string
          id?: string
          notification_id?: string
          provider_message_id?: string | null
          provider_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_delivery_logs_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_delivery_logs_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "farmer_notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      produce_listings: {
        Row: {
          asking_price_per_unit: number | null
          created_at: string
          crop_category: string | null
          crop_cycle_id: string | null
          crop_name: string
          description: string | null
          district: string | null
          expires_at: string | null
          farm_id: string | null
          farmer_id: string
          harvest_date: string | null
          id: string
          latitude: number | null
          listed_at: string
          listing_status: string
          longitude: number | null
          minimum_quantity: number | null
          plot_id: string | null
          quality_grade: string | null
          quantity: number
          quantity_unit: string
          state: string | null
          status: string
          taluka: string | null
          updated_at: string
          village: string | null
        }
        Insert: {
          asking_price_per_unit?: number | null
          created_at?: string
          crop_category?: string | null
          crop_cycle_id?: string | null
          crop_name: string
          description?: string | null
          district?: string | null
          expires_at?: string | null
          farm_id?: string | null
          farmer_id: string
          harvest_date?: string | null
          id?: string
          latitude?: number | null
          listed_at?: string
          listing_status?: string
          longitude?: number | null
          minimum_quantity?: number | null
          plot_id?: string | null
          quality_grade?: string | null
          quantity: number
          quantity_unit?: string
          state?: string | null
          status?: string
          taluka?: string | null
          updated_at?: string
          village?: string | null
        }
        Update: {
          asking_price_per_unit?: number | null
          created_at?: string
          crop_category?: string | null
          crop_cycle_id?: string | null
          crop_name?: string
          description?: string | null
          district?: string | null
          expires_at?: string | null
          farm_id?: string | null
          farmer_id?: string
          harvest_date?: string | null
          id?: string
          latitude?: number | null
          listed_at?: string
          listing_status?: string
          longitude?: number | null
          minimum_quantity?: number | null
          plot_id?: string | null
          quality_grade?: string | null
          quantity?: number
          quantity_unit?: string
          state?: string | null
          status?: string
          taluka?: string | null
          updated_at?: string
          village?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "produce_listings_crop_cycle_id_fkey"
            columns: ["crop_cycle_id"]
            isOneToOne: false
            referencedRelation: "crop_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produce_listings_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produce_listings_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produce_listings_plot_id_fkey"
            columns: ["plot_id"]
            isOneToOne: false
            referencedRelation: "farm_plots"
            referencedColumns: ["id"]
          },
        ]
      }
      produce_orders: {
        Row: {
          accepted_at: string | null
          agreed_price_per_unit: number
          buyer_id: string | null
          buyer_mobile: string | null
          buyer_name: string | null
          buyer_notes: string | null
          cancelled_at: string | null
          completed_at: string | null
          created_at: string
          delivery_location: string | null
          farmer_id: string
          farmer_notes: string | null
          id: string
          listing_id: string
          notes: string | null
          order_date: string
          quantity: number
          quantity_unit: string
          rejected_at: string | null
          requested_at: string
          status: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          agreed_price_per_unit: number
          buyer_id?: string | null
          buyer_mobile?: string | null
          buyer_name?: string | null
          buyer_notes?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          delivery_location?: string | null
          farmer_id: string
          farmer_notes?: string | null
          id?: string
          listing_id: string
          notes?: string | null
          order_date?: string
          quantity: number
          quantity_unit?: string
          rejected_at?: string | null
          requested_at?: string
          status?: string
          total_amount: number
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          agreed_price_per_unit?: number
          buyer_id?: string | null
          buyer_mobile?: string | null
          buyer_name?: string | null
          buyer_notes?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          delivery_location?: string | null
          farmer_id?: string
          farmer_notes?: string | null
          id?: string
          listing_id?: string
          notes?: string | null
          order_date?: string
          quantity?: number
          quantity_unit?: string
          rejected_at?: string | null
          requested_at?: string
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "produce_orders_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produce_orders_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produce_orders_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "produce_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      produce_price_snapshots: {
        Row: {
          captured_at: string
          crop_category: string | null
          crop_name: string
          farmer_asking_price_per_unit: number | null
          farmer_id: string
          id: string
          listing_id: string | null
          market_name: string | null
          market_price_per_unit: number | null
          price_unit: string | null
          source_name: string | null
          source_url: string | null
        }
        Insert: {
          captured_at?: string
          crop_category?: string | null
          crop_name: string
          farmer_asking_price_per_unit?: number | null
          farmer_id: string
          id?: string
          listing_id?: string | null
          market_name?: string | null
          market_price_per_unit?: number | null
          price_unit?: string | null
          source_name?: string | null
          source_url?: string | null
        }
        Update: {
          captured_at?: string
          crop_category?: string | null
          crop_name?: string
          farmer_asking_price_per_unit?: number | null
          farmer_id?: string
          id?: string
          listing_id?: string | null
          market_name?: string | null
          market_price_per_unit?: number | null
          price_unit?: string | null
          source_name?: string | null
          source_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "produce_price_snapshots_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produce_price_snapshots_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "produce_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          created_at: string
          date_of_birth: string | null
          district: string | null
          first_name: string | null
          full_name: string | null
          gender: string | null
          id: string
          is_active: boolean
          is_profile_complete: boolean
          last_name: string | null
          latitude: number | null
          longitude: number | null
          mobile: string | null
          notifications_enabled: boolean
          pincode: string | null
          preferred_language: string
          profile_image_url: string | null
          state: string | null
          taluka: string | null
          updated_at: string
          village: string | null
          voice_enabled: boolean
        }
        Insert: {
          address?: string | null
          created_at?: string
          date_of_birth?: string | null
          district?: string | null
          first_name?: string | null
          full_name?: string | null
          gender?: string | null
          id: string
          is_active?: boolean
          is_profile_complete?: boolean
          last_name?: string | null
          latitude?: number | null
          longitude?: number | null
          mobile?: string | null
          notifications_enabled?: boolean
          pincode?: string | null
          preferred_language?: string
          profile_image_url?: string | null
          state?: string | null
          taluka?: string | null
          updated_at?: string
          village?: string | null
          voice_enabled?: boolean
        }
        Update: {
          address?: string | null
          created_at?: string
          date_of_birth?: string | null
          district?: string | null
          first_name?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          is_active?: boolean
          is_profile_complete?: boolean
          last_name?: string | null
          latitude?: number | null
          longitude?: number | null
          mobile?: string | null
          notifications_enabled?: boolean
          pincode?: string | null
          preferred_language?: string
          profile_image_url?: string | null
          state?: string | null
          taluka?: string | null
          updated_at?: string
          village?: string | null
          voice_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "profiles_preferred_language_fkey"
            columns: ["preferred_language"]
            isOneToOne: false
            referencedRelation: "supported_languages"
            referencedColumns: ["language_code"]
          },
        ]
      }
      scheme_applications: {
        Row: {
          application_notes: string | null
          application_reference: string | null
          application_status: string
          applied_at: string | null
          approved_at: string | null
          created_at: string
          farmer_id: string
          id: string
          rejected_at: string | null
          scheme_id: string
          updated_at: string
        }
        Insert: {
          application_notes?: string | null
          application_reference?: string | null
          application_status?: string
          applied_at?: string | null
          approved_at?: string | null
          created_at?: string
          farmer_id: string
          id?: string
          rejected_at?: string | null
          scheme_id: string
          updated_at?: string
        }
        Update: {
          application_notes?: string | null
          application_reference?: string | null
          application_status?: string
          applied_at?: string | null
          approved_at?: string | null
          created_at?: string
          farmer_id?: string
          id?: string
          rejected_at?: string | null
          scheme_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheme_applications_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheme_applications_scheme_id_fkey"
            columns: ["scheme_id"]
            isOneToOne: false
            referencedRelation: "government_schemes"
            referencedColumns: ["id"]
          },
        ]
      }
      scheme_eligibility_rules: {
        Row: {
          additional_conditions: Json | null
          created_at: string
          crop_categories: string[] | null
          crop_names: string[] | null
          districts: string[] | null
          farmer_types: string[] | null
          gender_criteria: string[] | null
          id: string
          irrigation_types: string[] | null
          is_active: boolean
          land_max_acres: number | null
          land_min_acres: number | null
          scheme_id: string
          social_categories: string[] | null
          soil_types: string[] | null
          states: string[] | null
          talukas: string[] | null
          updated_at: string
          villages: string[] | null
        }
        Insert: {
          additional_conditions?: Json | null
          created_at?: string
          crop_categories?: string[] | null
          crop_names?: string[] | null
          districts?: string[] | null
          farmer_types?: string[] | null
          gender_criteria?: string[] | null
          id?: string
          irrigation_types?: string[] | null
          is_active?: boolean
          land_max_acres?: number | null
          land_min_acres?: number | null
          scheme_id: string
          social_categories?: string[] | null
          soil_types?: string[] | null
          states?: string[] | null
          talukas?: string[] | null
          updated_at?: string
          villages?: string[] | null
        }
        Update: {
          additional_conditions?: Json | null
          created_at?: string
          crop_categories?: string[] | null
          crop_names?: string[] | null
          districts?: string[] | null
          farmer_types?: string[] | null
          gender_criteria?: string[] | null
          id?: string
          irrigation_types?: string[] | null
          is_active?: boolean
          land_max_acres?: number | null
          land_min_acres?: number | null
          scheme_id?: string
          social_categories?: string[] | null
          soil_types?: string[] | null
          states?: string[] | null
          talukas?: string[] | null
          updated_at?: string
          villages?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "scheme_eligibility_rules_scheme_id_fkey"
            columns: ["scheme_id"]
            isOneToOne: false
            referencedRelation: "government_schemes"
            referencedColumns: ["id"]
          },
        ]
      }
      scheme_sync_logs: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          records_failed: number | null
          records_fetched: number | null
          records_inserted: number | null
          records_updated: number | null
          source_name: string
          source_url: string | null
          status: string
          sync_completed_at: string | null
          sync_started_at: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          records_failed?: number | null
          records_fetched?: number | null
          records_inserted?: number | null
          records_updated?: number | null
          source_name: string
          source_url?: string | null
          status?: string
          sync_completed_at?: string | null
          sync_started_at?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          records_failed?: number | null
          records_fetched?: number | null
          records_inserted?: number | null
          records_updated?: number | null
          source_name?: string
          source_url?: string | null
          status?: string
          sync_completed_at?: string | null
          sync_started_at?: string
        }
        Relationships: []
      }
      soil_data: {
        Row: {
          created_at: string | null
          data_source_id: string | null
          district: string
          electrical_conductivity: number | null
          fetched_at: string | null
          groundwater_level_m: number | null
          id: string
          latitude: number | null
          longitude: number | null
          nitrogen: number | null
          observation_date: string
          organic_carbon: number | null
          phosphorus: number | null
          potassium: number | null
          soil_moisture_percent: number | null
          soil_ph: number | null
          soil_type: string | null
          state: string | null
          taluka: string | null
          updated_at: string | null
          village: string | null
        }
        Insert: {
          created_at?: string | null
          data_source_id?: string | null
          district: string
          electrical_conductivity?: number | null
          fetched_at?: string | null
          groundwater_level_m?: number | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          nitrogen?: number | null
          observation_date: string
          organic_carbon?: number | null
          phosphorus?: number | null
          potassium?: number | null
          soil_moisture_percent?: number | null
          soil_ph?: number | null
          soil_type?: string | null
          state?: string | null
          taluka?: string | null
          updated_at?: string | null
          village?: string | null
        }
        Update: {
          created_at?: string | null
          data_source_id?: string | null
          district?: string
          electrical_conductivity?: number | null
          fetched_at?: string | null
          groundwater_level_m?: number | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          nitrogen?: number | null
          observation_date?: string
          organic_carbon?: number | null
          phosphorus?: number | null
          potassium?: number | null
          soil_moisture_percent?: number | null
          soil_ph?: number | null
          soil_type?: string | null
          state?: string | null
          taluka?: string | null
          updated_at?: string | null
          village?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "soil_data_data_source_id_fkey"
            columns: ["data_source_id"]
            isOneToOne: false
            referencedRelation: "data_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      supported_languages: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          language_code: string
          language_name: string
          native_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          language_code: string
          language_name: string
          native_name: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          language_code?: string
          language_name?: string
          native_name?: string
        }
        Relationships: []
      }
      weather_data: {
        Row: {
          created_at: string | null
          data_source_id: string | null
          district: string
          feels_like_celsius: number | null
          fetched_at: string | null
          humidity_percent: number | null
          id: string
          is_forecast: boolean | null
          latitude: number | null
          longitude: number | null
          observation_date: string
          observation_time: string | null
          pressure_hpa: number | null
          rainfall_mm: number | null
          state: string | null
          taluka: string | null
          temperature_celsius: number | null
          updated_at: string | null
          village: string | null
          weather_condition: string | null
          wind_direction_degree: number | null
          wind_speed_kmh: number | null
        }
        Insert: {
          created_at?: string | null
          data_source_id?: string | null
          district: string
          feels_like_celsius?: number | null
          fetched_at?: string | null
          humidity_percent?: number | null
          id?: string
          is_forecast?: boolean | null
          latitude?: number | null
          longitude?: number | null
          observation_date: string
          observation_time?: string | null
          pressure_hpa?: number | null
          rainfall_mm?: number | null
          state?: string | null
          taluka?: string | null
          temperature_celsius?: number | null
          updated_at?: string | null
          village?: string | null
          weather_condition?: string | null
          wind_direction_degree?: number | null
          wind_speed_kmh?: number | null
        }
        Update: {
          created_at?: string | null
          data_source_id?: string | null
          district?: string
          feels_like_celsius?: number | null
          fetched_at?: string | null
          humidity_percent?: number | null
          id?: string
          is_forecast?: boolean | null
          latitude?: number | null
          longitude?: number | null
          observation_date?: string
          observation_time?: string | null
          pressure_hpa?: number | null
          rainfall_mm?: number | null
          state?: string | null
          taluka?: string | null
          temperature_celsius?: number | null
          updated_at?: string | null
          village?: string | null
          weather_condition?: string | null
          wind_direction_degree?: number | null
          wind_speed_kmh?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "weather_data_data_source_id_fkey"
            columns: ["data_source_id"]
            isOneToOne: false
            referencedRelation: "data_sources"
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
