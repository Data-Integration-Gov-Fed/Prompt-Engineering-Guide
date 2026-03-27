import type { NextApiRequest, NextApiResponse } from 'next';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

export interface DimensionScore {
  score: number;
  max: 10;
  notes: string;
}

export interface PromptAnalysis {
  overall_score: number;
  grade: string;
  summary: string;
  dimensions: {
    clarity: DimensionScore;
    specificity: DimensionScore;
    context: DimensionScore;
    instruction_quality: DimensionScore;
    format_guidance: DimensionScore;
    role_persona: DimensionScore;
  };
  issues: string[];
  improvements: string[];
  improved_prompt: string;
  techniques: Array<{
    name: string;
    path: string;
    relevance: string;
  }>;
}

const ANALYSIS_SYSTEM_PROMPT = `You are an expert prompt engineer. Analyze prompts for LLMs and return a JSON object (no markdown, no code fences — raw JSON only).

Score each dimension 0–10:
- clarity: How clear and unambiguous is the instruction?
- specificity: How precisely defined is the expected output?
- context: Is sufficient background/context provided?
- instruction_quality: Are instructions logically structured and complete?
- format_guidance: Does the prompt specify output format, length, or structure?
- role_persona: Does the prompt use role/persona framing effectively?

overall_score is 0–100 (weighted average × 10).
grade is A/B/C/D/F based on overall_score.
summary is 1–2 sentences describing the prompt's main strengths and weaknesses.
issues is an array of 2–5 specific problems.
improvements is an array of 2–5 concrete, actionable suggestions.
improved_prompt is a rewritten version that applies all improvements (preserve the original intent).
techniques lists 1–3 prompt engineering techniques from this list that would help most, with a brief relevance note:
  - { name: "Few-Shot Prompting", path: "/techniques/fewshot" }
  - { name: "Chain-of-Thought", path: "/techniques/cot" }
  - { name: "Zero-Shot Prompting", path: "/techniques/zero-shot" }
  - { name: "Role Prompting", path: "/techniques/zero-shot" }
  - { name: "ReAct Prompting", path: "/techniques/react" }
  - { name: "Tree of Thoughts", path: "/techniques/tot" }
  - { name: "Retrieval Augmented Generation", path: "/techniques/rag" }
  - { name: "Prompt Chaining", path: "/techniques/prompt_chaining" }
  - { name: "Directional Stimulus", path: "/techniques/dsp" }

Respond with raw JSON only. No markdown. No explanation outside the JSON.`;

function calcGrade(score: number): string {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PromptAnalysis | { error: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt } = req.body;

  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    return res.status(400).json({ error: 'A prompt is required' });
  }

  if (prompt.length > 10000) {
    return res.status(400).json({ error: 'Prompt must be under 10,000 characters' });
  }

  try {
    const response = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 2048,
      thinking: { type: 'adaptive' },
      system: ANALYSIS_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Analyze this prompt:\n\n<prompt>\n${prompt.trim()}\n</prompt>`,
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return res.status(500).json({ error: 'No text response from model' });
    }

    let analysis: PromptAnalysis;
    try {
      analysis = JSON.parse(textBlock.text.trim());
    } catch {
      // Try to extract JSON if wrapped in any stray text
      const match = textBlock.text.match(/\{[\s\S]*\}/);
      if (!match) {
        return res.status(500).json({ error: 'Could not parse model response as JSON' });
      }
      analysis = JSON.parse(match[0]);
    }

    // Ensure grade is consistent
    analysis.grade = calcGrade(analysis.overall_score);

    return res.status(200).json(analysis);
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      return res.status(401).json({ error: 'Invalid API key — set ANTHROPIC_API_KEY' });
    }
    if (err instanceof Anthropic.RateLimitError) {
      return res.status(429).json({ error: 'Rate limited — please try again in a moment' });
    }
    if (err instanceof Anthropic.APIError) {
      return res.status(500).json({ error: `API error: ${err.message}` });
    }
    return res.status(500).json({ error: 'Unexpected error occurred' });
  }
}
