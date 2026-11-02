#!/usr/bin/env npx tsx
/**
 * Ad-hoc Prompt Improvement CLI Tool (`npm run prompt:tune`)
 *
 * Usage:
 *   npm run prompt:tune -- "Add more problems about basketball and gymnastics, and keep numbers under 200"
 *   npm run prompt:tune -- --preview
 */

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { callOpenCodeGo, extractJsonFromLlmText, getDeterministicProblem } from '../netlify/functions/_shared';
import { GeneratedProblem } from '../src/types/problem';

const PROMPT_PATH = path.resolve(process.cwd(), 'prompts/problem-generator.json');

interface PromptFile {
  version: string;
  lastUpdated: string;
  model: string;
  systemPrompt: string;
  userPromptTemplate: string;
}

function bumpVersion(ver: string): string {
  const parts = ver.split('.').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return '1.0.1';
  parts[2] += 1;
  return parts.join('.');
}

async function generateSample(promptData: PromptFile, apiKey: string): Promise<GeneratedProblem> {
  if (!apiKey) {
    return getDeterministicProblem(['multiplication']);
  }

  const userPrompt = promptData.userPromptTemplate
    .replace('{{operations}}', 'Multiplicación (×) y Suma (+)')
    .replace('{{difficulty}}', '4.º de Primaria (9 años)')
    .replace('{{recentThemes}}', 'ninguno');

  const raw = await callOpenCodeGo({
    model: promptData.model,
    systemPrompt: promptData.systemPrompt,
    userPrompt,
    apiKey,
  });

  return extractJsonFromLlmText(raw) as GeneratedProblem;
}

async function main() {
  const args = process.argv.slice(2);
  const rawContent = fs.readFileSync(PROMPT_PATH, 'utf-8');
  const currentPrompt: PromptFile = JSON.parse(rawContent);
  const apiKey = process.env.OPENCODE_API_KEY || '';

  console.log('\n✨ === Herramienta Ad-Hoc de Mejora de Prompts (Mates Mágicas) === ✨');
  console.log(`📄 Archivo: ${PROMPT_PATH}`);
  console.log(`🤖 Modelo OpenCode Go: ${currentPrompt.model} (v${currentPrompt.version})`);
  console.log(`📝 System Prompt actual:\n----------------------------------------\n${currentPrompt.systemPrompt}\n----------------------------------------\n`);

  if (args.includes('--preview')) {
    console.log('🧪 Generando problema de prueba con el prompt actual...');
    const sample = await generateSample(currentPrompt, apiKey);
    console.log(JSON.stringify(sample, null, 2));
    return;
  }

  let feedback = args.filter((a) => !a.startsWith('--')).join(' ').trim();
  const rl = readline.createInterface({ input, output });

  try {
    if (!feedback) {
      feedback = await rl.question(
        '💡 ¿Cómo quieres mejorar el prompt de generación de problemas?\n(Ej: "Usa más problemas de baloncesto y animales marinos, o incluye divisiones de 2 cifras")\n> '
      );
    }

    if (!feedback.trim()) {
      console.log('No se indicó ningún cambio. Saliendo sin modificar.');
      return;
    }

    console.log(`\n🔧 Aplicando mejora solicitada: "${feedback}"...`);

    let proposedSystemPrompt = currentPrompt.systemPrompt;

    if (apiKey) {
      const metaSystem =
        'Eres un experto en ingeniería de prompts educativos para primaria en España. Tu tarea es mejorar el systemPrompt actual incorporando las instrucciones del padre/madre, manteniendo todas las reglas de formato JSON e idioma español de España. Devuelve ÚNICAMENTE un JSON con la clave {"systemPrompt": "..."}';
      const metaUser = `SystemPrompt actual:\n${currentPrompt.systemPrompt}\n\nMejora solicitada por el padre/madre:\n"${feedback}"\n\nDevuelve el JSON {"systemPrompt": "nuevo prompt mejorado"}:`;

      const rawMeta = await callOpenCodeGo({
        model: currentPrompt.model,
        systemPrompt: metaSystem,
        userPrompt: metaUser,
        apiKey,
      });
      const parsed = extractJsonFromLlmText(rawMeta) as { systemPrompt?: string };
      if (parsed.systemPrompt) {
        proposedSystemPrompt = parsed.systemPrompt;
      }
    } else {
      console.log(
        'ℹ️  (Sin OPENCODE_API_KEY en el entorno: añadiendo la regla directamente al systemPrompt)'
      );
      proposedSystemPrompt = `${currentPrompt.systemPrompt}\n- Regla adicional personalizada: ${feedback.trim()}`;
    }

    console.log('\n✨ Nuevo System Prompt propuesto:\n----------------------------------------');
    console.log(proposedSystemPrompt);
    console.log('----------------------------------------\n');

    const updatedPrompt: PromptFile = {
      ...currentPrompt,
      version: bumpVersion(currentPrompt.version),
      lastUpdated: new Date().toISOString().slice(0, 10),
      systemPrompt: proposedSystemPrompt,
    };

    console.log('🧪 Vista previa de ejemplo con el prompt actualizado:');
    const sample = await generateSample(updatedPrompt, apiKey);
    console.log(`   Título:   ${sample.title}`);
    console.log(`   Historia: ${sample.story}`);
    console.log(`   Pregunta: ${sample.question}`);
    console.log(`   Visual:   [${sample.visual.type}] ${sample.visual.caption}\n`);

    const autoApprove = args.includes('--yes') || args.includes('-y');
    let confirm = 'y';
    if (!autoApprove && input.isTTY) {
      confirm = await rl.question('¿Guardar este nuevo prompt en prompts/problem-generator.json? (y/n): ');
    }

    if (confirm.toLowerCase().startsWith('y') || confirm.toLowerCase().startsWith('s')) {
      fs.writeFileSync(PROMPT_PATH, JSON.stringify(updatedPrompt, null, 2) + '\n', 'utf-8');
      console.log(`✅ Guardado en ${PROMPT_PATH} (versión ${updatedPrompt.version}).`);
    } else {
      console.log('❌ Cambios descartados.');
    }
  } finally {
    rl.close();
  }
}

main().catch((err) => {
  console.error('Error en prompt:tune:', err);
  process.exit(1);
});
