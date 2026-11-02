import promptConfig from '../../prompts/problem-generator.json';
import validatorConfig from '../../prompts/answer-validator.json';
import { logStructured, verifyFamilyAccessCode } from './_shared';

export interface HealthReport {
  status: 'ok' | 'misconfigured';
  timestamp: string;
  environment: {
    hasOpenCodeApiKey: boolean;
    hasFamilyAccessCode: boolean;
    mockLlm: boolean;
    nodeVersion: string;
  };
  authCheck?: {
    providedHeader: boolean;
    authorized: boolean;
  };
  models: {
    generatorModel: string;
    generatorPromptVersion: string;
    validatorModel: string;
    validatorPromptVersion: string;
  };
}

export function getHealthReport(providedFamilyCode?: string | null): HealthReport {
  const hasOpenCodeApiKey = Boolean((process.env.OPENCODE_API_KEY || '').trim());
  const hasFamilyAccessCode = Boolean((process.env.FAMILY_ACCESS_CODE || '').trim());
  const mockLlm = process.env.MOCK_LLM === 'true';

  const authResult = verifyFamilyAccessCode(providedFamilyCode);

  const isHealthy = mockLlm || (hasOpenCodeApiKey && hasFamilyAccessCode);

  return {
    status: isHealthy ? 'ok' : 'misconfigured',
    timestamp: new Date().toISOString(),
    environment: {
      hasOpenCodeApiKey,
      hasFamilyAccessCode,
      mockLlm,
      nodeVersion: process.version,
    },
    authCheck: {
      providedHeader: Boolean(providedFamilyCode && providedFamilyCode.trim()),
      authorized: authResult.authorized,
    },
    models: {
      generatorModel: promptConfig.model,
      generatorPromptVersion: promptConfig.version,
      validatorModel: validatorConfig.model,
      validatorPromptVersion: validatorConfig.version,
    },
  };
}

export default async (req: Request): Promise<Response> => {
  const providedCode = req.headers.get('x-family-code');
  const report = getHealthReport(providedCode);

  logStructured({
    functionName: 'health',
    event: 'health_check_requested',
    level: report.status === 'ok' ? 'info' : 'warn',
    details: {
      method: req.method,
      status: report.status,
      authorized: report.authCheck?.authorized,
    },
  });

  if (req.method === 'POST') {
    const authResult = verifyFamilyAccessCode(providedCode);
    if (!authResult.authorized) {
      return new Response(
        JSON.stringify({
          ...report,
          authorized: false,
          error: authResult.error,
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  }

  return new Response(JSON.stringify(report, null, 2), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
