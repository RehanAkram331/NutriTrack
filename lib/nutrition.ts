// BMR calculation using Mifflin-St Jeor equation
export function calculateBMR(weight_kg: number, height_cm: number, age: number, gender: string = 'male'): number {
  if (gender === 'female') {
    return 10 * weight_kg + 6.25 * height_cm - 5 * age - 161
  }
  return 10 * weight_kg + 6.25 * height_cm - 5 * age + 5
}

const activityMultipliers = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
}

export function calculateTDEE(bmr: number, activity: string): number {
  return bmr * (activityMultipliers[activity as keyof typeof activityMultipliers] || 1.2)
}

export function calculateGoalCalories(tdee: number, goal: string): number {
  if (goal === 'lose') return Math.round(tdee - 500)
  if (goal === 'gain') return Math.round(tdee + 300)
  return Math.round(tdee)
}

export function calculateBMI(weight_kg: number, height_cm: number): number {
  const height_m = height_cm / 100
  return weight_kg / (height_m * height_m)
}

export function getBMICategory(bmi: number): { label: string; color: string } {
  if (bmi < 18.5) return { label: 'Underweight', color: '#60a5fa' }
  if (bmi < 25) return { label: 'Normal', color: '#34d399' }
  if (bmi < 30) return { label: 'Overweight', color: '#fbbf24' }
  return { label: 'Obese', color: '#f87171' }
}

// Daily recommended intake values (based on 2000 cal diet, general adult)
export function getDailyTargets(goalCalories: number, weight_kg: number) {
  return {
    calories: goalCalories,
    protein_g: Math.round(weight_kg * 1.6), // 1.6g/kg body weight
    carbs_g: Math.round((goalCalories * 0.45) / 4),
    fat_g: Math.round((goalCalories * 0.30) / 9),
    saturated_fat_g: Math.round((goalCalories * 0.07) / 9),
    fiber_g: 28,
    sugar_g: 50,
    vitamin_a: 900,   // mcg
    vitamin_c: 90,    // mg
    vitamin_d: 20,    // mcg
    vitamin_e: 15,    // mg
    calcium_mg: 1000, // mg
    iron_mg: 18,      // mg
    potassium_mg: 3500, // mg
    sodium_mg: 2300,  // mg
  }
}

export interface FoodItem {
  name: string
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
  unit_weight_g?: number  // approx grams per one piece/unit
  unit_label?: string     // e.g. "egg", "banana"
}

// Comprehensive food database with nutritional info per 100g
export const FOOD_DATABASE: FoodItem[] = [
  { name: 'Chicken Breast (cooked)', calories: 165, protein_g: 31, carbs_g: 0, fat_g: 3.6, saturated_fat_g: 1.0, fiber_g: 0, sugar_g: 0, vitamin_a: 6, vitamin_c: 0, vitamin_d: 0.1, vitamin_e: 0.3, calcium_mg: 15, iron_mg: 1.0, potassium_mg: 256, sodium_mg: 74 },
  { name: 'Brown Rice (cooked)', calories: 112, protein_g: 2.3, carbs_g: 23.5, fat_g: 0.8, saturated_fat_g: 0.2, fiber_g: 1.8, sugar_g: 0.4, vitamin_a: 0, vitamin_c: 0, vitamin_d: 0, vitamin_e: 0.1, calcium_mg: 10, iron_mg: 0.5, potassium_mg: 79, sodium_mg: 5 },
  { name: 'Egg (whole)', calories: 155, protein_g: 13, carbs_g: 1.1, fat_g: 11, saturated_fat_g: 3.3, fiber_g: 0, sugar_g: 1.1, vitamin_a: 149, vitamin_c: 0, vitamin_d: 2.0, vitamin_e: 1.0, calcium_mg: 56, iron_mg: 1.8, potassium_mg: 126, sodium_mg: 124, unit_weight_g: 60, unit_label: 'egg' },
  { name: 'Banana', calories: 89, protein_g: 1.1, carbs_g: 23, fat_g: 0.3, saturated_fat_g: 0.1, fiber_g: 2.6, sugar_g: 12, vitamin_a: 3, vitamin_c: 8.7, vitamin_d: 0, vitamin_e: 0.1, calcium_mg: 5, iron_mg: 0.3, potassium_mg: 358, sodium_mg: 1, unit_weight_g: 118, unit_label: 'banana' },
  { name: 'Salmon (cooked)', calories: 208, protein_g: 20, carbs_g: 0, fat_g: 13, saturated_fat_g: 3.1, fiber_g: 0, sugar_g: 0, vitamin_a: 13, vitamin_c: 3.9, vitamin_d: 14.7, vitamin_e: 3.6, calcium_mg: 12, iron_mg: 0.8, potassium_mg: 363, sodium_mg: 59 },
  { name: 'Whole Milk', calories: 61, protein_g: 3.2, carbs_g: 4.8, fat_g: 3.3, saturated_fat_g: 1.9, fiber_g: 0, sugar_g: 5.1, vitamin_a: 46, vitamin_c: 0.9, vitamin_d: 1.3, vitamin_e: 0.1, calcium_mg: 113, iron_mg: 0.1, potassium_mg: 143, sodium_mg: 43 },
  { name: 'Broccoli (raw)', calories: 34, protein_g: 2.8, carbs_g: 6.6, fat_g: 0.4, saturated_fat_g: 0.1, fiber_g: 2.6, sugar_g: 1.7, vitamin_a: 31, vitamin_c: 89.2, vitamin_d: 0, vitamin_e: 0.8, calcium_mg: 47, iron_mg: 0.7, potassium_mg: 316, sodium_mg: 33 },
  { name: 'Greek Yogurt (plain)', calories: 59, protein_g: 10, carbs_g: 3.6, fat_g: 0.4, saturated_fat_g: 0.1, fiber_g: 0, sugar_g: 3.2, vitamin_a: 1, vitamin_c: 0, vitamin_d: 0, vitamin_e: 0.1, calcium_mg: 111, iron_mg: 0.1, potassium_mg: 141, sodium_mg: 36 },
  { name: 'Oatmeal (cooked)', calories: 71, protein_g: 2.5, carbs_g: 12, fat_g: 1.5, saturated_fat_g: 0.3, fiber_g: 1.7, sugar_g: 0.3, vitamin_a: 0, vitamin_c: 0, vitamin_d: 0, vitamin_e: 0.1, calcium_mg: 11, iron_mg: 0.8, potassium_mg: 62, sodium_mg: 49 },
  { name: 'Apple', calories: 52, protein_g: 0.3, carbs_g: 14, fat_g: 0.2, saturated_fat_g: 0, fiber_g: 2.4, sugar_g: 10.3, vitamin_a: 3, vitamin_c: 4.6, vitamin_d: 0, vitamin_e: 0.2, calcium_mg: 6, iron_mg: 0.1, potassium_mg: 107, sodium_mg: 1, unit_weight_g: 182, unit_label: 'apple' },
  { name: 'Almond (raw)', calories: 579, protein_g: 21, carbs_g: 22, fat_g: 50, saturated_fat_g: 3.8, fiber_g: 12.5, sugar_g: 4.4, vitamin_a: 0, vitamin_c: 0, vitamin_d: 0, vitamin_e: 25.6, calcium_mg: 264, iron_mg: 3.7, potassium_mg: 733, sodium_mg: 1, unit_weight_g: 1, unit_label: 'almond' },
  { name: 'Sweet Potato (cooked)', calories: 90, protein_g: 2.0, carbs_g: 21, fat_g: 0.1, saturated_fat_g: 0, fiber_g: 3.3, sugar_g: 4.2, vitamin_a: 961, vitamin_c: 2.4, vitamin_d: 0, vitamin_e: 0.3, calcium_mg: 38, iron_mg: 0.7, potassium_mg: 475, sodium_mg: 36, unit_weight_g: 130, unit_label: 'sweet potato' },
  { name: 'Spinach (raw)', calories: 23, protein_g: 2.9, carbs_g: 3.6, fat_g: 0.4, saturated_fat_g: 0.1, fiber_g: 2.2, sugar_g: 0.4, vitamin_a: 469, vitamin_c: 28.1, vitamin_d: 0, vitamin_e: 2.0, calcium_mg: 99, iron_mg: 2.7, potassium_mg: 558, sodium_mg: 79 },
  { name: 'Beef (ground, lean)', calories: 215, protein_g: 26, carbs_g: 0, fat_g: 12, saturated_fat_g: 4.6, fiber_g: 0, sugar_g: 0, vitamin_a: 0, vitamin_c: 0, vitamin_d: 0.1, vitamin_e: 0.2, calcium_mg: 15, iron_mg: 2.7, potassium_mg: 318, sodium_mg: 82 },
  { name: 'Avocado', calories: 160, protein_g: 2.0, carbs_g: 9.0, fat_g: 15, saturated_fat_g: 2.1, fiber_g: 7.0, sugar_g: 0.7, vitamin_a: 7, vitamin_c: 10, vitamin_d: 0, vitamin_e: 2.1, calcium_mg: 12, iron_mg: 0.6, potassium_mg: 485, sodium_mg: 7, unit_weight_g: 200, unit_label: 'avocado' },
  { name: 'White Rice (cooked)', calories: 130, protein_g: 2.7, carbs_g: 28, fat_g: 0.3, saturated_fat_g: 0.1, fiber_g: 0.4, sugar_g: 0, vitamin_a: 0, vitamin_c: 0, vitamin_d: 0, vitamin_e: 0, calcium_mg: 10, iron_mg: 1.2, potassium_mg: 35, sodium_mg: 1 },
  { name: 'Orange', calories: 47, protein_g: 0.9, carbs_g: 12, fat_g: 0.1, saturated_fat_g: 0, fiber_g: 2.4, sugar_g: 9.4, vitamin_a: 11, vitamin_c: 53.2, vitamin_d: 0, vitamin_e: 0.2, calcium_mg: 40, iron_mg: 0.1, potassium_mg: 181, sodium_mg: 0, unit_weight_g: 131, unit_label: 'orange' },
  { name: 'Lentils (cooked)', calories: 116, protein_g: 9.0, carbs_g: 20, fat_g: 0.4, saturated_fat_g: 0.1, fiber_g: 7.9, sugar_g: 1.8, vitamin_a: 1, vitamin_c: 1.5, vitamin_d: 0, vitamin_e: 0.1, calcium_mg: 19, iron_mg: 3.3, potassium_mg: 369, sodium_mg: 2 },
  { name: 'Cottage Cheese (low fat)', calories: 72, protein_g: 12, carbs_g: 2.7, fat_g: 1.0, saturated_fat_g: 0.4, fiber_g: 0, sugar_g: 2.7, vitamin_a: 14, vitamin_c: 0, vitamin_d: 0.1, vitamin_e: 0, calcium_mg: 83, iron_mg: 0.1, potassium_mg: 137, sodium_mg: 364 },
  { name: 'Olive Oil', calories: 884, protein_g: 0, carbs_g: 0, fat_g: 100, saturated_fat_g: 13.8, fiber_g: 0, sugar_g: 0, vitamin_a: 0, vitamin_c: 0, vitamin_d: 0, vitamin_e: 14.4, calcium_mg: 1, iron_mg: 0.6, potassium_mg: 1, sodium_mg: 2 },
]
