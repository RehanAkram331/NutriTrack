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
For each food item, provide estimated nutritional values per 100g.
For foods naturally counted as pieces (egg, banana, apple, orange, slice of bread, cookie, etc.), also include unit_weight_g (approximate grams per one piece) and unit_label (singular name like "egg", "banana", "slice").
Respond with ONLY a valid JSON object — no markdown, no code fences, no extra text:
{
  "foods": [
    {
      "name": "Food Name",
      "calories": 0,
      "protein_g": 0,
      "carbs_g": 0,
      "fat_g": 0,
      "fiber_g": 0,
      "saturated_fat_g": 0,
      "sugar_g": 0,
      "unit_weight_g": 60,
      "unit_label": "egg"
    }
  ]
}
Omit unit_weight_g and unit_label for foods measured by weight/volume (rice, oatmeal, liquids, mixed dishes).
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
