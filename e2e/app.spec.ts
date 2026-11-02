import { test, expect } from '@playwright/test';

test.describe('Mates Mágicas - Tablet E2E Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('generates math problems with visuals, organizes by date in localStorage, allows deleting pending problems, and locks solved problems forever', async ({
    page,
  }) => {
    // 1. Verify Spanish kid-friendly header & initial empty state
    await expect(page.getByRole('heading', { name: /Mates Mágicas/i })).toBeVisible();
    await expect(page.getByTestId('solved-counter')).toContainText('0 estrellas');
    await expect(page.getByTestId('empty-problem-state')).toBeVisible();

    // 2. Generate first problem (Addition)
    await page.getByTestId('op-addition').click();
    await page.getByTestId('generate-problem-btn').click();

    await expect(page.getByTestId('problem-card')).toBeVisible();
    await expect(page.getByTestId('problem-title')).toContainText('La pastelería mágica de Sofía');
    await expect(page.getByTestId('problem-visual')).toBeVisible();
    await expect(page.getByTestId('problem-status-badge')).toContainText('Pendiente');

    // Verify it is organized under "Hoy" in the date-grouped history panel
    const historyPanel = page.getByTestId('problem-history');
    await expect(historyPanel).toContainText('Hoy (');
    await expect(historyPanel).toContainText('1 pendientes');

    // 3. Generate a second problem (Multiplication) so we have 2 pending problems
    await page.getByTestId('op-multiplication').click();
    await page.getByTestId('generate-problem-btn').click();

    await expect(page.getByTestId('problem-title')).toContainText('Cajas de pastelitos para el cumple');
    await expect(historyPanel).toContainText('2 pendientes');

    // 4. Delete the first pending problem and verify it is removed
    const deleteButtons = historyPanel.locator('[data-testid^="delete-problem-"]');
    await expect(deleteButtons).toHaveCount(2);
    // Delete the second item in the list (the earlier addition problem)
    await deleteButtons.nth(1).click();
    await expect(deleteButtons).toHaveCount(1);
    await expect(historyPanel).toContainText('1 pendientes');

    // 5. Solve the active multiplication problem (4 boxes x 6 cupcakes = 24)
    const answerInput = page.getByTestId('answer-input');
    await answerInput.fill('Ha traído 24 pastelitos en total');
    await page.getByTestId('submit-answer-btn').click();

    // Verify positive LLM validation feedback & updated star counter
    await expect(page.getByTestId('validation-feedback')).toContainText('24 pastelitos');
    await expect(page.getByTestId('problem-status-badge')).toContainText('¡Problema Resuelto!');
    await expect(page.getByTestId('solved-counter')).toContainText('1 estrella');

    // 6. Verify solved problem CANNOT be deleted (no delete button, shows permanent "Trofeo" lock)
    await expect(historyPanel.locator('[data-testid^="delete-problem-"]')).toHaveCount(0);
    await expect(historyPanel.locator('[data-testid^="locked-solved-"]')).toHaveCount(1);
    await expect(historyPanel).toContainText('1 resueltos');

    // 7. Reload page to verify localStorage persistence across sessions
    await page.reload();
    await expect(page.getByTestId('solved-counter')).toContainText('1 estrella');
    await expect(page.getByTestId('problem-status-badge')).toContainText('¡Problema Resuelto!');
    await expect(page.getByTestId('problem-history').locator('[data-testid^="locked-solved-"]')).toHaveCount(1);

    // 8. Verify /api/health diagnostic endpoint confirms mock mode & no API key loaded
    const healthRes = await page.request.get('/api/health');
    expect(healthRes.ok()).toBeTruthy();
    const healthJson = await healthRes.json();
    expect(healthJson.status).toBe('ok');
    expect(healthJson.environment.mockLlm).toBe(true);
    expect(healthJson.environment.hasOpenCodeApiKey).toBe(false);
    expect(healthJson.models.generatorModel).toBeTruthy();

    await page.getByTestId('open-family-code-btn').click();
    await expect(page.getByTestId('family-code-modal')).toBeVisible();
    await page.getByTestId('family-code-input').fill('unicornio9');
    await page.getByTestId('save-family-code-btn').click();
    await expect(page.getByTestId('family-code-modal')).toBeHidden();
    await expect(page.getByTestId('open-family-code-btn')).toContainText('Clave Guardada');
  });
});
