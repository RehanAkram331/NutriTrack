import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY?.trim() ?? '')

export async function POST(req: NextRequest) {
  try {
    const { image, mediaType } = await req.json()

    if (!image || !mediaType) {
      return NextResponse.json({ error: 'Missing image or mediaType' }, { status: 400 })
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: mediaType,
          data: image,
        },
      },
      `You are a nutrition expert. Analyze this food image and identify all food items visible.
For each food item, provide estimated nutritional values per 100g, Bengali name if applicable, and a category.
Categories: Grains, Vegetables, Fruits, Legumes, Fish & Seafood, Meat & Poultry, Eggs & Dairy, Oils & Fats, Nuts & Seeds, Spices, Snacks, Beverages, Traditional.
Respond with ONLY a valid JSON object — no markdown, no code fences, no extra text:
{
  "foods": [
    {
      "name": "Food Name",
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
  ]
}
Set unit_weight_g (integer grams) and unit_label (singular word) only for foods naturally counted as pieces (egg=60/"egg", banana=118/"banana", slice of bread=30/"slice"). Set null for rice, curries, liquids, mixed dishes.
If you cannot identify any food, return: {"foods": []}`,
    ])

    const text = result.response.text()
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Could not parse food data from image' }, { status: 422 })
    }

    return NextResponse.json(JSON.parse(jsonMatch[0]))
  } catch (err) {
    console.error('analyze-food error:', err)
    return NextResponse.json({ error: 'Failed to analyze image' }, { status: 500 })
  }
}
