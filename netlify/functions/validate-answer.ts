import validatorConfig from '../../prompts/answer-validator.json';
import { GeneratedProblem, ValidationResult } from '../../src/types/problem';
import {
  callOpenCodeGo,
  evaluateAnswerFallback,
  extractJsonFromLlmText,
  logStructured,
  verifyFamilyAccessCode,
} from './_shared';

export interface ValidateAnswerRequest {
  problem: GeneratedProblem;
  userAnswer: string;
}

export async function handleValidateAnswer(
  body: ValidateAnswerRequest
): Promise<ValidationResult> {
  const startTime = Date.now();
  const { problem, userAnswer } = body;

  if (!problem || typeof userAnswer !== 'string' || !userAnswer.trim()) {
    return {
      isCorrect: false,
      status: 'incorrect',
      feedback: 'Por favor, escribe tu solución en la cajita antes de comprobar.',
      encouragement: '¡Seguro que en tu cuaderno tienes una gran idea! ✏️',
    };
  }

  const apiKey = (process.env.OPENCODE_API_KEY || '').trim();
  const useMock = process.env.MOCK_LLM === 'true' || !apiKey;

  logStructured({
    functionName: 'validate-answer',
    event: 'invoke_start',
    details: {
      problemTitle: problem.title,
      useMock,
      model: validatorConfig.model,
    },
  });

  if (useMock) {
    const fallbackResult = evaluateAnswerFallback(problem, userAnswer);
    logStructured({
      functionName: 'validate-answer',
      event: 'mock_validation_returned',
      level: !apiKey && process.env.MOCK_LLM !== 'true' ? 'warn' : 'info',
      details: {
        reason: !apiKey ? 'missing_opencode_api_key' : 'mock_llm_enabled',
        status: fallbackResult.status,
        isCorrect: fallbackResult.isCorrect,
        durationMs: Date.now() - startTime,
      },
    });
    return fallbackResult;
  }

  const userPrompt = validatorConfig.userPromptTemplate
    .replace('{{title}}', problem.title)
    .replace('{{story}}', problem.story)
    .replace('{{question}}', problem.question)
    .replace('{{expectedAnswer}}', problem.expectedAnswer)
    .replace('{{numericAnswer}}', String(problem.numericAnswer))
    .replace('{{unit}}', problem.unit || '')
    .replace('{{userAnswer}}', userAnswer);

  try {
    const rawResponse = await callOpenCodeGo({
      model: validatorConfig.model,
      systemPrompt: validatorConfig.systemPrompt,
      userPrompt,
      apiKey,
    });

    const parsed = extractJsonFromLlmText(rawResponse) as ValidationResult;
    if (typeof parsed?.isCorrect !== 'boolean' || !parsed?.feedback) {
      throw new Error('Incomplete validation JSON from LLM');
    }

    logStructured({
      functionName: 'validate-answer',
      event: 'llm_validation_completed',
      details: {
        model: validatorConfig.model,
        status: parsed.status,
        isCorrect: parsed.isCorrect,
        durationMs: Date.now() - startTime,
      },
    });

    return parsed;
  } catch (err) {
    logStructured({
      functionName: 'validate-answer',
      event: 'llm_error_fallback',
      level: 'error',
      details: {
        error: err instanceof Error ? err.message : String(err),
        durationMs: Date.now() - startTime,
      },
    });
    return evaluateAnswerFallback(problem, userAnswer);
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
      functionName: 'validate-answer',
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
    const body = (await req.json()) as ValidateAnswerRequest;
    const result = await handleValidateAnswer(body);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    logStructured({
      functionName: 'validate-answer',
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
