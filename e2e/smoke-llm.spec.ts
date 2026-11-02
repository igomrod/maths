import { test, expect } from '@playwright/test';
import { GeneratedProblem, ValidationResult } from '../src/types/problem';

const FALLBACK_TITLES = [
  '🍪 La pastelería mágica de Sofía',
  '🦄 Colección de cromos brillantes',
  '🎈 Los globos de la fiesta del cole',
  '🧁 Cajas de pastelitos para el cumple',
  '🌟 Reparto de estrellas mágicas',
  '🎟️ Tarde de feria con amigos',
];

test.describe('Mates Mágicas - Ad-Hoc Live LLM Smoke Suite', () => {
  test('authenticates with Family Passcode, generates a real LLM problem with visuals, handles a wrong attempt, and validates a natural-language correct answer', async ({
    page,
  }) => {
    const familyCode = process.env.PROD_FAMILY_ACCESS_CODE || process.env.FAMILY_ACCESS_CODE || '';
    expect(
      familyCode.length,
      'FAMILY_ACCESS_CODE (or PROD_FAMILY_ACCESS_CODE) must be set to run live smoke tests'
    ).toBeGreaterThan(0);

    // 1. Verify /api/health confirms LIVE LLM mode (mockLlm: false, hasOpenCodeApiKey: true)
    const healthRes = await page.request.get('/api/health', {
      headers: { 'x-family-code': familyCode },
    });
    expect(healthRes.ok()).toBeTruthy();
    const healthJson = await healthRes.json();
    expect(healthJson.environment.mockLlm).toBe(false);
    expect(healthJson.environment.hasOpenCodeApiKey).toBe(true);
    expect(healthJson.environment.hasFamilyAccessCode).toBe(true);
    expect(
      healthJson.authCheck?.authorized,
      'The FAMILY_ACCESS_CODE in your local .env does not match the FAMILY_ACCESS_CODE configured in Netlify production! Set PROD_FAMILY_ACCESS_CODE in .env to match Netlify.'
    ).toBe(true);

    // 2. Load the app on a clean tablet session; verify the Family Code modal pops up automatically
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    const modal = page.getByTestId('family-code-modal');
    await expect(modal).toBeVisible();

    // First test a wrong password to confirm 401 protection works
    await page.getByTestId('family-code-input').fill('clave-incorrecta-123');
    await page.getByTestId('save-family-code-btn').click();
    await expect(modal).toBeVisible();
    await expect(modal).toContainText('Contraseña Mágica incorrecta');

    // Now enter the real FAMILY_ACCESS_CODE and unlock the tablet
    await page.getByTestId('family-code-input').fill(familyCode);
    await page.getByTestId('save-family-code-btn').click();
    await expect(modal).toBeHidden();
    await expect(page.getByTestId('open-family-code-btn')).toContainText('Clave Guardada');

    // 3. Select Multiplication and generate a real problem from OpenCode Go LLM
    await page.getByTestId('op-multiplication').click();

    const generateResponsePromise = page.waitForResponse(
      (res) => res.url().includes('/api/generate-problem') && res.status() === 200,
      { timeout: 45_000 }
    );

    await page.getByTestId('generate-problem-btn').click();
    const generateResponse = await generateResponsePromise;
    const generatedProblem = (await generateResponse.json()) as GeneratedProblem;

    console.log('\n🤖 [Smoke LLM] Problema generado en vivo:', {
      title: generatedProblem.title,
      question: generatedProblem.question,
      expectedAnswer: generatedProblem.expectedAnswer,
      numericAnswer: generatedProblem.numericAnswer,
      visualType: generatedProblem.visual?.type,
    });

    // Verify it is a genuinely generated LLM problem, not a fallback
    expect(FALLBACK_TITLES).not.toContain(generatedProblem.title);
    expect(typeof generatedProblem.numericAnswer).toBe('number');

    await expect(page.getByTestId('problem-card')).toBeVisible();
    await expect(page.getByTestId('problem-title')).toHaveText(generatedProblem.title);
    await expect(page.getByTestId('problem-visual')).toBeVisible();
    await expect(page.getByTestId('problem-status-badge')).toContainText('Pendiente');

    // 4. Scenario A: Kid writes an incorrect answer first -> LLM gives encouraging hint
    const wrongNumber = generatedProblem.numericAnswer + 999;
    const wrongText = `Creo que el resultado es ${wrongNumber} porque sumé rápido en el papel`;

    const wrongValidationPromise = page.waitForResponse(
      (res) => res.url().includes('/api/validate-answer') && res.status() === 200,
      { timeout: 45_000 }
    );

    await page.getByTestId('answer-input').fill(wrongText);
    await page.getByTestId('submit-answer-btn').click();

    const wrongValidationRes = await wrongValidationPromise;
    const wrongValidation = (await wrongValidationRes.json()) as ValidationResult;

    console.log('📝 [Smoke LLM] Evaluación de intento incorrecto:', wrongValidation);

    expect(wrongValidation.isCorrect).toBe(false);
    await expect(page.getByTestId('validation-feedback')).toBeVisible();
    await expect(page.getByTestId('problem-status-badge')).toContainText('Pendiente');

    // 5. Scenario B: Kid recalculates on paper and writes the correct solution in natural Spanish
    const rightText = `Después de hacer la cuenta en mi cuaderno me salen ${generatedProblem.numericAnswer} ${generatedProblem.unit || ''} en total.`;

    const rightValidationPromise = page.waitForResponse(
      (res) => res.url().includes('/api/validate-answer') && res.status() === 200,
      { timeout: 45_000 }
    );

    await page.getByTestId('answer-input').fill(rightText);
    await page.getByTestId('submit-answer-btn').click();

    const rightValidationRes = await rightValidationPromise;
    const rightValidation = (await rightValidationRes.json()) as ValidationResult;

    console.log('🌟 [Smoke LLM] Evaluación de intento correcto:', rightValidation);

    expect(rightValidation.isCorrect).toBe(true);
    expect(rightValidation.status).toBe('correct');
    await expect(page.getByTestId('problem-status-badge')).toContainText('¡Problema Resuelto!');
    await expect(page.getByTestId('solved-counter')).toContainText('1 estrella');

    // Verify it is locked as a Trophy in the date-grouped history and cannot be deleted
    const historyPanel = page.getByTestId('problem-history');
    await expect(historyPanel.locator('[data-testid^="locked-solved-"]')).toHaveCount(1);
    await expect(historyPanel.locator('[data-testid^="delete-problem-"]')).toHaveCount(0);
  });
});
