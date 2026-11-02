import promptConfig from '../../prompts/problem-generator.json';
import { GeneratedProblem, OperationType } from '../../src/types/problem';
import {
  callOpenCodeGo,
  extractJsonFromLlmText,
  getDeterministicProblem,
  logStructured,
  OPERATION_LABELS_ES,
  verifyFamilyAccessCode,
} from './_shared';

export interface GenerateProblemRequest {
  operations?: OperationType[];
  difficulty?: string;
  recentThemes?: string[];
}

export async function handleGenerateProblem(body: GenerateProblemRequest): Promise<GeneratedProblem> {
  const startTime = Date.now();
  const operations: OperationType[] =
    Array.isArray(body.operations) && body.operations.length > 0
      ? body.operations
      : ['addition'];
  const difficulty = body.difficulty || '4.º de Primaria (9 años)';
  const recentThemes = Array.isArray(body.recentThemes) ? body.recentThemes : [];

  const apiKey = (process.env.OPENCODE_API_KEY || '').trim();
  const useMock = process.env.MOCK_LLM === 'true' || !apiKey;

  logStructured({
    functionName: 'generate-problem',
    event: 'invoke_start',
    details: {
      operations,
      difficulty,
      recentThemesCount: recentThemes.length,
      useMock,
      model: promptConfig.model,
    },
  });

  if (useMock) {
    const mockProblem = getDeterministicProblem(operations, recentThemes);
    logStructured({
      functionName: 'generate-problem',
      event: 'mock_problem_returned',
      level: !apiKey && process.env.MOCK_LLM !== 'true' ? 'warn' : 'info',
      details: {
        reason: !apiKey ? 'missing_opencode_api_key' : 'mock_llm_enabled',
        title: mockProblem.title,
        durationMs: Date.now() - startTime,
      },
    });
    return mockProblem;
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

    logStructured({
      functionName: 'generate-problem',
      event: 'llm_problem_generated',
      details: {
        model: promptConfig.model,
        title: parsed.title,
        visualType: parsed.visual?.type,
        durationMs: Date.now() - startTime,
      },
    });

    return parsed;
  } catch (err) {
    logStructured({
      functionName: 'generate-problem',
      event: 'llm_error_fallback',
      level: 'error',
      details: {
        error: err instanceof Error ? err.message : String(err),
        durationMs: Date.now() - startTime,
      },
    });
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

  const providedCode = req.headers.get('x-family-code');
  const authCheck = verifyFamilyAccessCode(providedCode);
  if (!authCheck.authorized) {
    logStructured({
      functionName: 'generate-problem',
      event: 'unauthorized_family_code',
      level: 'warn',
      details: {
        providedHeader: Boolean(providedCode),
        reason: authCheck.error,
      },
    });
    return new Response(
      JSON.stringify({ error: authCheck.error, code: 'UNAUTHORIZED_FAMILY_CODE' }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    const body = (await req.json()) as GenerateProblemRequest;
    const problem = await handleGenerateProblem(body);
    return new Response(JSON.stringify(problem), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    logStructured({
      functionName: 'generate-problem',
      event: 'unhandled_exception',
      level: 'error',
      details: {
        error: err instanceof Error ? err.message : String(err),
      },
    });
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
