import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          name: string
          age: number
          weight_kg: number
          height_cm: number
          goal: 'lose' | 'maintain' | 'gain'
          activity_level: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
      food_logs: {
        Row: {
          id: string
          user_id: string
          date: string
          meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
          food_name: string
          quantity_g: number
          calories: number
          protein_g: number
          carbs_g: number
          fat_g: number
          saturated_fat_g: number
          fiber_g: number
          sugar_g: number
          vitamin_a: number
          vitamin_c: number
          vitamin_d: number
          vitamin_e: number
          calcium_mg: number
          iron_mg: number
          potassium_mg: number
          sodium_mg: number
          created_at: string
        }
      }
      weight_logs: {
        Row: {
          id: string
          user_id: string
          date: string
          weight_kg: number
          created_at: string
        }
      }
    }
  }
}
