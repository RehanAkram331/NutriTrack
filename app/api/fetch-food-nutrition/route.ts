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
      `You are a nutrition and medicine database expert. Given the name "${foodName}", determine if it is a FOOD/SUPPLEMENT or a MEDICINE/DRUG, then return accurate data.

Choose the most fitting category from: Grains, Vegetables, Fruits, Legumes, Fish & Seafood, Meat & Poultry, Eggs & Dairy, Oils & Fats, Nuts & Seeds, Spices, Snacks, Beverages, Supplement, Medicine, Traditional.

Also provide the Bengali name if it is a common item in Bangladesh.

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
  "omega3_mg": 0,
  "unit_weight_g": null,
  "unit_label": null
}

RULES:
1. All nutrient values are per 100g of the item.
2. For FOOD: use realistic nutritional values — never return 0 for all macros.
3. For MEDICINE or SUPPLEMENT (tablets, capsules, syrups, injections, vitamins, minerals, drugs):
   - Set calories=0, protein_g=0, carbs_g=0, fat_g=0, fiber_g=0, sugar_g=0 (tablets have no meaningful food energy)
   - Only fill in the specific vitamin/mineral that is the active ingredient. Example: Zinc 20mg tablet → set zinc_mg to (20 / tablet_weight_g * 100). Vitamin C 500mg → set vitamin_c to (500 / tablet_weight_g * 100).
   - Set unit_weight_g to the actual weight of one tablet/capsule in grams (can be decimal, e.g. 0.3, 0.5, 1.0, 1.5). Set unit_label to "tablet", "capsule", "syrup ml", "drop", etc.
4. For FOOD counted as pieces: egg=60g/"egg", banana=118g/"banana", orange=131g/"orange", apple=182g/"apple", bread slice=30g/"slice". Set null for rice, curries, liquids.
5. unit_weight_g can be a decimal number (e.g. 0.3 for a small tablet).`
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
