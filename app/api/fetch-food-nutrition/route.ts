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
      `You are a nutrition database. Give accurate nutritional values per 100g for: "${foodName}".
Return ONLY valid JSON — no explanation, no markdown, no code fences:
{
  "name": "Proper Name",
  "calories": 150,
  "protein_g": 8.0,
  "carbs_g": 20.0,
  "fat_g": 5.0,
  "saturated_fat_g": 1.5,
  "fiber_g": 2.0,
  "sugar_g": 3.0,
  "vitamin_a": 0,
  "vitamin_c": 0,
  "vitamin_d": 0,
  "vitamin_e": 0,
  "calcium_mg": 20,
  "iron_mg": 1.0,
  "potassium_mg": 150,
  "sodium_mg": 200,
  "unit_weight_g": null,
  "unit_label": null
}
Only set unit_weight_g and unit_label if the food is naturally counted as individual pieces (egg=60, banana=118, orange=131, apple=182, slice of bread=30). Set null for dishes, grains, beverages, and mixed foods.`
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
