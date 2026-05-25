import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { imageBase64, mediaType } = await req.json()

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: 'No image provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType || 'image/jpeg',
                  data: imageBase64,
                },
              },
              {
                type: 'text',
                text: `Analyse this food image and identify all foods visible.
For each food item, estimate the portion size and nutritional content.
Respond ONLY with a valid JSON object in this exact format, no other text:
{
  "meal_name": "Brief descriptive name of the overall meal",
  "foods": [
    {
      "name": "food item name",
      "portion": "estimated portion e.g. 1 cup, 150g, 2 pieces",
      "calories": 0,
      "protein_g": 0,
      "carbs_g": 0,
      "fat_g": 0
    }
  ],
  "totals": {
    "calories": 0,
    "protein_g": 0,
    "carbs_g": 0,
    "fat_g": 0
  },
  "confidence": "high|medium|low",
  "notes": "any relevant notes about the meal or estimation accuracy"
}
Use realistic nutritional values based on standard portion sizes.
If you cannot identify the food clearly, set confidence to "low" and
provide your best estimate with a note explaining the uncertainty.`
              }
            ],
          }
        ],
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('Anthropic API error:', data)
      return new Response(
        JSON.stringify({ error: 'AI analysis failed', details: data }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Extract JSON from Claude's response
    const textContent = data.content?.find((c: { type: string }) => c.type === 'text')?.text || ''

    let mealData
    try {
      // Claude should return pure JSON per the prompt
      mealData = JSON.parse(textContent)
    } catch {
      // Fallback: try to extract JSON from response
      const jsonMatch = textContent.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        mealData = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('Could not parse meal data from AI response')
      }
    }

    return new Response(
      JSON.stringify({ success: true, meal: mealData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({ error: 'Analysis failed', message: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
