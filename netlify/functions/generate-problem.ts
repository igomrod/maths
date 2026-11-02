import promptConfig from '../../prompts/problem-generator.json';
import { GeneratedProblem, OperationType } from '../../src/types/problem';
import {
  callOpenCodeGo,
  extractJsonFromLlmText,
  getDeterministicProblem,
  OPERATION_LABELS_ES,
  verifyFamilyAccessCode,
} from './_shared';

export interface GenerateProblemRequest {
  operations?: OperationType[];
  difficulty?: string;
  recentThemes?: string[];
}

export async function handleGenerateProblem(body: GenerateProblemRequest): Promise<GeneratedProblem> {
  const operations: OperationType[] =
    Array.isArray(body.operations) && body.operations.length > 0
      ? body.operations
      : ['addition'];
  const difficulty = body.difficulty || '4.º de Primaria (9 años)';
  const recentThemes = Array.isArray(body.recentThemes) ? body.recentThemes : [];

  const apiKey = process.env.OPENCODE_API_KEY || '';
  const useMock = process.env.MOCK_LLM === 'true' || !apiKey;

  if (useMock) {
    return getDeterministicProblem(operations, recentThemes);
  }

  const operationsLabel = operations.map((op) => OPERATION_LABELS_ES[op] || op).join(', ');
  const recentList = recentThemes.length > 0 ? recentThemes.slice(0, 6).join(' | ') : 'ninguno';

  const userPrompt = promptConfig.userPromptTemplate
    .replace('{{operations}}', operationsLabel)
    .replace('{{difficulty}}', difficulty)
    .replace('{{recentThemes}}', recentList);

  try {
    const rawResponse = await callOpenCodeGo({
      model: promptConfig.model,
      systemPrompt: promptConfig.systemPrompt,
      userPrompt,
      apiKey,
    });

    const parsed = extractJsonFromLlmText(rawResponse) as GeneratedProblem;
    if (!parsed || !parsed.title || !parsed.story || !parsed.question) {
      throw new Error('Incomplete problem JSON from LLM');
    }
    return parsed;
  } catch (err) {
    console.warn('Falling back to deterministic problem due to LLM error:', err);
    return getDeterministicProblem(operations, recentThemes);
  }
}

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const authCheck = verifyFamilyAccessCode(req.headers.get('x-family-code'));
  if (!authCheck.authorized) {
    return new Response(JSON.stringify({ error: authCheck.error, code: 'UNAUTHORIZED_FAMILY_CODE' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = (await req.json()) as GenerateProblemRequest;
    const problem = await handleGenerateProblem(body);
    return new Response(JSON.stringify(problem), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
