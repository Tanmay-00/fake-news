import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Get request input
    const { text, url } = await req.json();
    if (!text && !url) {
      throw new Error('Please provide text or url to analyze');
    }

    // 2. Auth Context check
    const authHeader = req.headers.get('Authorization')!;
    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );
    
    const token = authHeader.replace('Bearer ', '').trim();
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      throw new Error(`Unauthorized - Error: ${authError?.message || 'none'}, TokenPrefix: ${token.substring(0, 15)}...`);
    }

    const startTime = Date.now();

    // 3. Call LLM API (Google Gemini)
    const geminiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiKey) {
        throw new Error('AI API not configured');
    }
    
    const systemPrompt = 'You are a highly advanced fake news detection AI. Respond ONLY in valid JSON with the exact following structure: { "verdict": "likely_true"|"likely_false"|"misleading"|"unverified", "confidence_score": 0-100, "explanation": "string", "heatmap": [{ "phrase": "string", "risk_score": 0-100, "reason": "string" }], "bias": { "emotional_tone": "string", "clickbait_score": 0-100, "urgency_level": "low"|"medium"|"high", "fear_signals": ["string"], "manipulation_tactics": ["string"] }, "claims": [{ "text": "string", "verdict": "true"|"false"|"misleading"|"unverified", "reasoning": "string" }], "evidence": [{ "title": "string", "url": "string", "stance": "supporting"|"contradicting"|"neutral", "credibility": 0-100, "summary": "string" }] }';
    const userPrompt = `Text: ${text}\nURL: ${url}`;

    const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: userPrompt }]
        }],
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        },
        generationConfig: {
          responseMimeType: "application/json"
        }
      })
    });

    const aiData = await aiResponse.json();
    if (aiData.error) {
      throw new Error(`Gemini API Error: ${aiData.error.message}`);
    }

    let result;
    try {
        const textContent = aiData.candidates[0].content.parts[0].text;
        result = JSON.parse(textContent);
        
        // Normalize verdict for Postgres Enum
        if (result.verdict === 'likely_true') result.verdict = 'true';
        if (result.verdict === 'likely_false') result.verdict = 'false';
    } catch (e: any) {
        throw new Error(`AI failed to return valid JSON: ${e.message}`);
    }
    
    // Create admin client to bypass RLS for inserting analysis logs
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 4. Store Result in DB
    const { data: report, error: reportError } = await supabaseClient
      .from('news_reports')
      .insert({
        user_id: user.id,
        input_text: text || '',
        source_url: url || null,
        verdict: result.verdict || 'unverified',
        confidence_score: result.confidence_score || 0,
        explanation: result.explanation || 'No explanation provided.'
      })
      .select()
      .single();

    if (reportError) {
      throw new Error(`Database error: ${reportError.message}`);
    }

    // 5. Store Analysis Logs
    await supabaseAdmin.from('analysis_logs').insert({
      report_id: report.id,
      model_used: 'gemini-1.5-flash',
      response_time: Date.now() - startTime,
      tokens_used: aiData.usageMetadata?.totalTokenCount || 0
    });

    // 6. Return response with enriched AI data
    const enrichedResponse = {
      ...report,
      verdict: result.verdict || report.verdict, // Sync verdict string if different
      heatmap: result.heatmap || [],
      bias: result.bias || null,
      claims: result.claims || [],
      evidence: result.evidence || []
    };

    return new Response(JSON.stringify(enrichedResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
