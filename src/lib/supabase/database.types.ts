
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "body_scans": {
                  Row: {
                    "arm_l_fat_kg": number | null,"arm_l_muscle_kg": number | null,"arm_r_fat_kg": number | null,"arm_r_muscle_kg": number | null,"bcm_score": number | null,"bf_pct": number,"bmi": number | null,"bmr_kcal": number | null,"body_age": number | null,"condition": string,"created_at": string,"device": string,"fat_mass_kg": number,"id": string,"leg_l_fat_kg": number | null,"leg_l_muscle_kg": number | null,"leg_r_fat_kg": number | null,"leg_r_muscle_kg": number | null,"muscle_pct": number | null,"other_pct": number | null,"post_workout": boolean,"scanned_at": string,"torso_fat_kg": number | null,"torso_muscle_kg": number | null,"updated_at": string,"user_id": string,"visceral_fat": number | null,"weight_kg": number,"whr": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "arm_l_fat_kg"?: number | null,"arm_l_muscle_kg"?: number | null,"arm_r_fat_kg"?: number | null,"arm_r_muscle_kg"?: number | null,"bcm_score"?: number | null,"bf_pct": number,"bmi"?: number | null,"bmr_kcal"?: number | null,"body_age"?: number | null,"condition"?: string,"created_at"?: string,"device"?: string,"fat_mass_kg": number,"id"?: string,"leg_l_fat_kg"?: number | null,"leg_l_muscle_kg"?: number | null,"leg_r_fat_kg"?: number | null,"leg_r_muscle_kg"?: number | null,"muscle_pct"?: number | null,"other_pct"?: number | null,"post_workout"?: boolean,"scanned_at": string,"torso_fat_kg"?: number | null,"torso_muscle_kg"?: number | null,"updated_at"?: string,"user_id"?: string,"visceral_fat"?: number | null,"weight_kg": number,"whr"?: number | null
                  }
                  Update: {
                    "arm_l_fat_kg"?: number | null,"arm_l_muscle_kg"?: number | null,"arm_r_fat_kg"?: number | null,"arm_r_muscle_kg"?: number | null,"bcm_score"?: number | null,"bf_pct"?: number,"bmi"?: number | null,"bmr_kcal"?: number | null,"body_age"?: number | null,"condition"?: string,"created_at"?: string,"device"?: string,"fat_mass_kg"?: number,"id"?: string,"leg_l_fat_kg"?: number | null,"leg_l_muscle_kg"?: number | null,"leg_r_fat_kg"?: number | null,"leg_r_muscle_kg"?: number | null,"muscle_pct"?: number | null,"other_pct"?: number | null,"post_workout"?: boolean,"scanned_at"?: string,"torso_fat_kg"?: number | null,"torso_muscle_kg"?: number | null,"updated_at"?: string,"user_id"?: string,"visceral_fat"?: number | null,"weight_kg"?: number,"whr"?: number | null
                  }
                  Relationships: [
                    
                  ]
                },"food_entries": {
                  Row: {
                    "added_sugar_g": number | null,"carb_g": number,"client_id": string,"created_at": string,"date": string,"deleted_at": string | null,"fat_g": number,"fiber_g": number | null,"food_id": string,"grams": number,"id": string,"kcal": number,"logged_at": string,"meal_label": string | null,"meal_slot": string,"partial_nutrients": (string)[],"portion_label": string | null,"protein_g": number,"satfat_g": number | null,"sodium_mg": number | null,"sugar_g": number | null,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "added_sugar_g"?: number | null,"carb_g": number,"client_id": string,"created_at"?: string,"date": string,"deleted_at"?: string | null,"fat_g": number,"fiber_g"?: number | null,"food_id": string,"grams": number,"id"?: string,"kcal": number,"logged_at": string,"meal_label"?: string | null,"meal_slot": string,"partial_nutrients"?: (string)[],"portion_label"?: string | null,"protein_g": number,"satfat_g"?: number | null,"sodium_mg"?: number | null,"sugar_g"?: number | null,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "added_sugar_g"?: number | null,"carb_g"?: number,"client_id"?: string,"created_at"?: string,"date"?: string,"deleted_at"?: string | null,"fat_g"?: number,"fiber_g"?: number | null,"food_id"?: string,"grams"?: number,"id"?: string,"kcal"?: number,"logged_at"?: string,"meal_label"?: string | null,"meal_slot"?: string,"partial_nutrients"?: (string)[],"portion_label"?: string | null,"protein_g"?: number,"satfat_g"?: number | null,"sodium_mg"?: number | null,"sugar_g"?: number | null,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "food_entries_food_id_fkey"
      columns: ["food_id"]
isOneToOne: false
      referencedRelation: "foods"
      referencedColumns: ["id"]
    }
                  ]
                },"food_portions": {
                  Row: {
                    "created_at": string,"food_id": string,"grams": number,"id": string,"is_calibrated": boolean,"label": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"food_id": string,"grams": number,"id"?: string,"is_calibrated"?: boolean,"label": string,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "created_at"?: string,"food_id"?: string,"grams"?: number,"id"?: string,"is_calibrated"?: boolean,"label"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "food_portions_food_id_fkey"
      columns: ["food_id"]
isOneToOne: false
      referencedRelation: "foods"
      referencedColumns: ["id"]
    }
                  ]
                },"foods": {
                  Row: {
                    "added_sugar_g": number | null,"aliases": (string)[],"archived_at": string | null,"carb_g": number,"created_at": string,"fat_g": number,"fiber_g": number | null,"id": string,"is_estimate": boolean,"is_favorite": boolean,"is_sweetener": boolean,"kcal": number,"label_added_sugar_g": number | null,"name": string,"partial_nutrients": (string)[],"protein_g": number,"satfat_g": number | null,"search_text": string,"sodium_mg": number | null,"source": string,"source_ref": string | null,"sugar_g": number | null,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "added_sugar_g"?: number | null,"aliases"?: (string)[],"archived_at"?: string | null,"carb_g": number,"created_at"?: string,"fat_g": number,"fiber_g"?: number | null,"id"?: string,"is_estimate"?: boolean,"is_favorite"?: boolean,"is_sweetener"?: boolean,"kcal": number,"label_added_sugar_g"?: number | null,"name": string,"partial_nutrients"?: (string)[],"protein_g": number,"satfat_g"?: number | null,"search_text"?: string,"sodium_mg"?: number | null,"source": string,"source_ref"?: string | null,"sugar_g"?: number | null,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "added_sugar_g"?: number | null,"aliases"?: (string)[],"archived_at"?: string | null,"carb_g"?: number,"created_at"?: string,"fat_g"?: number,"fiber_g"?: number | null,"id"?: string,"is_estimate"?: boolean,"is_favorite"?: boolean,"is_sweetener"?: boolean,"kcal"?: number,"label_added_sugar_g"?: number | null,"name"?: string,"partial_nutrients"?: (string)[],"protein_g"?: number,"satfat_g"?: number | null,"search_text"?: string,"sodium_mg"?: number | null,"source"?: string,"source_ref"?: string | null,"sugar_g"?: number | null,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"goals": {
                  Row: {
                    "created_at": string,"end_date": string | null,"id": string,"notes": string | null,"rate_pct_per_week": number,"start_date": string,"target_bf_pct": number | null,"target_date": string | null,"target_weight_kg": number | null,"type": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"end_date"?: string | null,"id"?: string,"notes"?: string | null,"rate_pct_per_week": number,"start_date": string,"target_bf_pct"?: number | null,"target_date"?: string | null,"target_weight_kg"?: number | null,"type": string,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "created_at"?: string,"end_date"?: string | null,"id"?: string,"notes"?: string | null,"rate_pct_per_week"?: number,"start_date"?: string,"target_bf_pct"?: number | null,"target_date"?: string | null,"target_weight_kg"?: number | null,"type"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"profile": {
                  Row: {
                    "activity_factor": number,"birth_date": string,"bmr_method": string,"created_at": string,"height_cm": number,"sex": string,"timezone": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "activity_factor": number,"birth_date": string,"bmr_method"?: string,"created_at"?: string,"height_cm": number,"sex": string,"timezone"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "activity_factor"?: number,"birth_date"?: string,"bmr_method"?: string,"created_at"?: string,"height_cm"?: number,"sex"?: string,"timezone"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"recipe_items": {
                  Row: {
                    "created_at": string,"grams": number,"id": string,"ingredient_food_id": string,"recipe_food_id": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"grams": number,"id"?: string,"ingredient_food_id": string,"recipe_food_id": string,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "created_at"?: string,"grams"?: number,"id"?: string,"ingredient_food_id"?: string,"recipe_food_id"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "recipe_items_ingredient_food_id_fkey"
      columns: ["ingredient_food_id"]
isOneToOne: false
      referencedRelation: "foods"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "recipe_items_recipe_food_id_fkey"
      columns: ["recipe_food_id"]
isOneToOne: false
      referencedRelation: "foods"
      referencedColumns: ["id"]
    }
                  ]
                },"saved_meal_items": {
                  Row: {
                    "created_at": string,"food_id": string,"grams": number,"id": string,"portion_label": string | null,"saved_meal_id": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"food_id": string,"grams": number,"id"?: string,"portion_label"?: string | null,"saved_meal_id": string,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "created_at"?: string,"food_id"?: string,"grams"?: number,"id"?: string,"portion_label"?: string | null,"saved_meal_id"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "saved_meal_items_food_id_fkey"
      columns: ["food_id"]
isOneToOne: false
      referencedRelation: "foods"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "saved_meal_items_saved_meal_id_fkey"
      columns: ["saved_meal_id"]
isOneToOne: false
      referencedRelation: "saved_meals"
      referencedColumns: ["id"]
    }
                  ]
                },"saved_meals": {
                  Row: {
                    "created_at": string,"id": string,"name": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"name": string,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"name"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"targets": {
                  Row: {
                    "added_sugar_max_g": number,"calc_inputs": Json | null,"carb_g": number,"created_at": string,"effective_from": string,"fat_g": number,"fiber_g": number,"id": string,"is_manual_override": boolean,"kcal": number,"protein_g": number,"satfat_max_g": number,"sodium_max_mg": number,"updated_at": string,"user_id": string,"water_ml": number
                  }
                  ComputedFields: never
                  Insert: {
                    "added_sugar_max_g": number,"calc_inputs"?: Json | null,"carb_g": number,"created_at"?: string,"effective_from": string,"fat_g": number,"fiber_g": number,"id"?: string,"is_manual_override"?: boolean,"kcal": number,"protein_g": number,"satfat_max_g": number,"sodium_max_mg": number,"updated_at"?: string,"user_id"?: string,"water_ml": number
                  }
                  Update: {
                    "added_sugar_max_g"?: number,"calc_inputs"?: Json | null,"carb_g"?: number,"created_at"?: string,"effective_from"?: string,"fat_g"?: number,"fiber_g"?: number,"id"?: string,"is_manual_override"?: boolean,"kcal"?: number,"protein_g"?: number,"satfat_max_g"?: number,"sodium_max_mg"?: number,"updated_at"?: string,"user_id"?: string,"water_ml"?: number
                  }
                  Relationships: [
                    
                  ]
                },"water_entries": {
                  Row: {
                    "client_id": string,"created_at": string,"date": string,"id": string,"logged_at": string,"ml": number,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "client_id": string,"created_at"?: string,"date": string,"id"?: string,"logged_at": string,"ml": number,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "client_id"?: string,"created_at"?: string,"date"?: string,"id"?: string,"logged_at"?: string,"ml"?: number,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"weight_entries": {
                  Row: {
                    "client_id": string,"condition": string,"created_at": string,"date": string,"id": string,"measured_at": string,"source": string,"updated_at": string,"user_id": string,"weight_kg": number
                  }
                  ComputedFields: never
                  Insert: {
                    "client_id": string,"condition"?: string,"created_at"?: string,"date": string,"id"?: string,"measured_at": string,"source"?: string,"updated_at"?: string,"user_id"?: string,"weight_kg": number
                  }
                  Update: {
                    "client_id"?: string,"condition"?: string,"created_at"?: string,"date"?: string,"id"?: string,"measured_at"?: string,"source"?: string,"updated_at"?: string,"user_id"?: string,"weight_kg"?: number
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            "daily_totals": {
                  Row: {
                    "date": string,"fiber_g": number | null,"kcal": number | null,"protein_g": number | null,"slots_logged": number | null,"user_id": string
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                }
          }
          Functions: {
            "search_foods":
{ Args: { "max_results"?: number,"q": string }; Returns: {
              "added_sugar_g": number | null,
"aliases": (string)[],
"archived_at": string | null,
"carb_g": number,
"created_at": string,
"fat_g": number,
"fiber_g": number | null,
"id": string,
"is_estimate": boolean,
"is_favorite": boolean,
"is_sweetener": boolean,
"kcal": number,
"label_added_sugar_g": number | null,
"name": string,
"partial_nutrients": (string)[],
"protein_g": number,
"satfat_g": number | null,
"search_text": string,
"sodium_mg": number | null,
"source": string,
"source_ref": string | null,
"sugar_g": number | null,
"updated_at": string,
"user_id": string
            }[]
                          SetofOptions: {
        from: "*"
        to: "foods"
        isOneToOne: false
        isSetofReturn: true
      } }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
