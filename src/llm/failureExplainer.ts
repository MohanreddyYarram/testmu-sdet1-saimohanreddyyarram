import Anthropic from '@anthropic-ai/sdk';
 
// Why Option A (Failure Explainer) over Option B (Flaky Classifier):
// Our suite is new and doesn't have historical run data yet - a flaky
// classifier needs multiple runs over time to compare against. A failure
// explainer is useful from run #1: it turns a raw error into something
// actionable immediately, which directly attacks the ticket's core
// problem of engineers spending too much time debugging failures.
 
export interface FailureContext {
  testTitle: string;
  filePath: string;
  errorMessage: string;
  contextSnapshot?: string;
  kind: 'ui' | 'api';
}
 
export interface FailureExplanation {
  summary: string;
  likelyCause: string;
  suggestedFix: string;
  confidence: 'low' | 'medium' | 'high';
  raw: string;
}
 
const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});
 
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';
 
function buildPrompt(ctx: FailureContext): string {
  return `You are a senior SDET reviewing a failed automated test. Respond ONLY with a JSON object with keys: "summary" (1 sentence), "likelyCause" (2-3 sentences), "suggestedFix" (2-4 sentences, concrete), and "confidence" ("low", "medium", or "high"). No markdown fences, no text outside the JSON.
 
Test title: ${ctx.testTitle}
Test file: ${ctx.filePath}
Test type: ${ctx.kind === 'ui' ? 'UI/browser test (Playwright)' : 'API test'}
 
Error message:
${ctx.errorMessage}
 
${ctx.contextSnapshot ? `Additional context:\n${ctx.contextSnapshot.slice(0, 4000)}` : ''}
 
Determine if this looks like a genuine application bug, a test/locator problem, or an environment issue, and give a fix that can be applied right away.`;
}
 
function safeParse(text: string): Omit<FailureExplanation, 'raw'> {
  try {
    const cleaned = text.trim().replace(/^```json\s*/i, '').replace(/```$/i, '');
    const parsed = JSON.parse(cleaned);
    return {
      summary: parsed.summary ?? 'No summary returned.',
      likelyCause: parsed.likelyCause ?? 'Not determined.',
      suggestedFix: parsed.suggestedFix ?? 'Not determined.',
      confidence: ['low', 'medium', 'high'].includes(parsed.confidence) ? parsed.confidence : 'low',
    };
  } catch {
    return {
      summary: text.slice(0, 300),
      likelyCause: 'Could not parse structured response from model.',
      suggestedFix: 'See raw response.',
      confidence: 'low',
    };
  }
}
 
export async function explainFailure(ctx: FailureContext): Promise<FailureExplanation> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      summary: 'AI explanation skipped: ANTHROPIC_API_KEY is not set.',
      likelyCause: 'Missing API key in environment.',
      suggestedFix: 'Set ANTHROPIC_API_KEY in your .env file and re-run.',
      confidence: 'low',
      raw: '',
    };
  }
 
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 500,
    messages: [{ role: 'user', content: buildPrompt(ctx) }],
  });
 
  const textBlock = response.content.find((b) => b.type === 'text');
  const raw = textBlock && 'text' in textBlock ? textBlock.text : '';
  const parsed = safeParse(raw);
 
  return { ...parsed, raw };
}
 