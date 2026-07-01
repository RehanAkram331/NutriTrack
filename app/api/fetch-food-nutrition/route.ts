import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY?.trim() ?? '')

export async function POST(req: NextRequest) {
  try {
    const { foodName } = await req.json()
    if (!foodName?.trim()) {
      return NextResponse.json({ error: 'Missing foodName' }, { status: 400 })
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const result = await model.generateContent(
      `You are a nutrition database expert. Give accurate nutritional values per 100g for: "${foodName}".
Also provide the Bengali name if it is a common food in Bangladesh.
Choose the most fitting category from: Grains, Vegetables, Fruits, Legumes, Fish & Seafood, Meat & Poultry, Eggs & Dairy, Oils & Fats, Nuts & Seeds, Spices, Snacks, Beverages, Traditional.
Return ONLY valid JSON — no explanation, no markdown, no code fences:
{
  "name": "Proper English Name",
  "name_bn": "বাংলা নাম or null",
  "category": "Category",
  "calories": 0,
  "protein_g": 0,
  "carbs_g": 0,
  "fat_g": 0,
  "saturated_fat_g": 0,
  "fat_unsaturated_g": 0,
  "fat_trans_g": 0,
  "fiber_g": 0,
  "sugar_g": 0,
  "vitamin_a": 0,
  "vitamin_b1_mg": 0,
  "vitamin_b2_mg": 0,
  "vitamin_b3_mg": 0,
  "vitamin_b6_mg": 0,
  "vitamin_b12_mcg": 0,
  "vitamin_c": 0,
  "vitamin_d": 0,
  "vitamin_e": 0,
  "vitamin_k_mcg": 0,
  "calcium_mg": 0,
  "iron_mg": 0,
  "magnesium_mg": 0,
  "phosphorus_mg": 0,
  "potassium_mg": 0,
  "sodium_mg": 0,
  "zinc_mg": 0,
  "unit_weight_g": null,
  "unit_label": null
}
All nutrient values are per 100g of food. Use realistic numbers — never return 0 for all nutrients.
Set unit_weight_g (integer grams) and unit_label (singular word) ONLY for foods naturally counted as pieces: egg=60/"egg", banana=118/"banana", orange=131/"orange", apple=182/"apple", bread slice=30/"slice". Set null for rice, curries, liquids, and mixed dishes.`
    )

    const text = result.response.text()
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Could not parse nutrition data' }, { status: 422 })
    }

    return NextResponse.json(JSON.parse(jsonMatch[0]))
  } catch (err) {
    console.error('fetch-food-nutrition error:', err)
    return NextResponse.json({ error: 'Failed to fetch nutrition data' }, { status: 500 })
  }
}
