import validatorConfig from '../../prompts/answer-validator.json';
import { GeneratedProblem, ValidationResult } from '../../src/types/problem';
import { callOpenCodeGo, evaluateAnswerFallback, extractJsonFromLlmText } from './_shared';

export interface ValidateAnswerRequest {
  problem: GeneratedProblem;
  userAnswer: string;
}

export async function handleValidateAnswer(
  body: ValidateAnswerRequest
): Promise<ValidationResult> {
  const { problem, userAnswer } = body;

  if (!problem || typeof userAnswer !== 'string' || !userAnswer.trim()) {
    return {
      isCorrect: false,
      status: 'incorrect',
      feedback: 'Por favor, escribe tu solución en la cajita antes de comprobar.',
      encouragement: '¡Seguro que en tu cuaderno tienes una gran idea! ✏️',
    };
  }

  const apiKey = process.env.OPENCODE_API_KEY || '';
  const useMock = process.env.MOCK_LLM === 'true' || !apiKey;

  if (useMock) {
    return evaluateAnswerFallback(problem, userAnswer);
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
    return parsed;
  } catch (err) {
    console.warn('Falling back to deterministic validator due to LLM error:', err);
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

  try {
    const body = (await req.json()) as ValidateAnswerRequest;
    const result = await handleValidateAnswer(body);
    return new Response(JSON.stringify(result), {
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
