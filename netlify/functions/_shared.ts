import { GeneratedProblem, OperationType, ValidationResult } from '../../src/types/problem';

export const OPENCODE_GO_BASE_URL = 'https://opencode.ai/zen/go/v1/chat/completions';

export interface StructuredLogEvent {
  functionName: string;
  event: string;
  level?: 'info' | 'warn' | 'error';
  details?: Record<string, unknown>;
}

export function logStructured({
  functionName,
  event,
  level = 'info',
  details = {},
}: StructuredLogEvent): void {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    functionName,
    event,
    hasOpenCodeApiKey: Boolean((process.env.OPENCODE_API_KEY || '').trim()),
    hasFamilyAccessCode: Boolean((process.env.FAMILY_ACCESS_CODE || '').trim()),
    mockLlm: process.env.MOCK_LLM === 'true',
    ...details,
  };
  const serialized = JSON.stringify(payload);
  if (level === 'error') {
    console.error(serialized);
  } else if (level === 'warn') {
    console.warn(serialized);
  } else {
    console.info(serialized);
  }
}

export function verifyFamilyAccessCode(providedCode?: string | null): {
  authorized: boolean;
  error?: string;
} {
  const isMockMode = process.env.MOCK_LLM === 'true';
  if (isMockMode) {
    return { authorized: true };
  }

  const expected = (process.env.FAMILY_ACCESS_CODE || '').trim();

  // Fail-closed in production if FAMILY_ACCESS_CODE is not set in Netlify environment variables
  if (!expected) {
    return {
      authorized: false,
      error:
        '⚠️ Configuración pendiente en Netlify: falta añadir la variable de entorno FAMILY_ACCESS_CODE.',
    };
  }

  if (!providedCode || providedCode.trim() !== expected) {
    return {
      authorized: false,
      error: '🔑 Contraseña Mágica incorrecta o necesaria. Pídele la clave a papá.',
    };
  }
  return { authorized: true };
}

export const OPERATION_LABELS_ES: Record<OperationType, string> = {
  addition: 'Suma (+)',
  subtraction: 'Resta (-)',
  multiplication: 'Multiplicación (×)',
  division: 'División (÷)',
  mixed: 'Operaciones combinadas (suma, resta, multiplicación o división)',
};

export function extractJsonFromLlmText(text: string): unknown {
  const trimmed = text.trim();
  // Strip markdown code fences if present
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenceMatch ? fenceMatch[1].trim() : trimmed;

  const firstBrace = candidate.indexOf('{');
  const lastBrace = candidate.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return JSON.parse(candidate.slice(firstBrace, lastBrace + 1));
  }
  return JSON.parse(candidate);
}

export async function callOpenCodeGo(options: {
  model: string;
  systemPrompt: string;
  userPrompt: string;
  apiKey: string;
}): Promise<string> {
  const sessionId = `ses_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  const response = await fetch(OPENCODE_GO_BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${options.apiKey}`,
      'x-opencode-session': sessionId,
    },
    body: JSON.stringify({
      model: options.model.replace(/^opencode-go\//, ''),
      messages: [
        { role: 'system', content: options.systemPrompt },
        { role: 'user', content: options.userPrompt },
      ],
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenCode Go API error (${response.status}): ${errText}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('Empty response from OpenCode Go LLM');
  }
  return content;
}

const FALLBACK_PROBLEMS: Record<OperationType, GeneratedProblem[]> = {
  addition: [
    {
      title: '🍪 La pastelería mágica de Sofía',
      story:
        'En la excursión del colegio a la pastelería mágica, Sofía ha preparado 24 magdalenas de chocolate por la mañana y 18 magdalenas de fresa por la tarde para compartir con su clase.',
      question: '¿Cuántas magdalenas ha preparado Sofía en total?',
      hint: 'Junta las magdalenas de la mañana con las de la tarde haciendo una suma en tu cuaderno.',
      expectedAnswer: '42 magdalenas (24 + 18 = 42)',
      numericAnswer: 42,
      unit: 'magdalenas',
      visual: {
        type: 'bar_model',
        caption: 'Magdalenas de la mañana y de la tarde',
        barModel: {
          totalLabel: 'Total de magdalenas: ¿?',
          parts: [
            { label: 'Mañana 🍫', value: '24', color: '#f472b6' },
            { label: 'Tarde 🍓', value: '18', color: '#60a5fa' },
          ],
        },
      },
    },
    {
      title: '🦄 Colección de cromos brillantes',
      story:
        'Lucía tenía 35 cromos de animales fantásticos en su álbum. En el recreo del cole, su mejor amiga le ha regalado un sobre especial con 17 cromos nuevos sin repetir.',
      question: '¿Cuántos cromos tiene Lucía ahora en su álbum?',
      hint: 'Suma los cromos que ya tenía Lucía más los cromos nuevos que le ha dado su amiga.',
      expectedAnswer: '52 cromos (35 + 17 = 52)',
      numericAnswer: 52,
      unit: 'cromos',
      visual: {
        type: 'bar_model',
        caption: 'Álbum de cromos de Lucía',
        barModel: {
          totalLabel: 'Total en el álbum: ¿?',
          parts: [
            { label: 'Tenía 🦄', value: '35', color: '#a78bfa' },
            { label: 'Regalo ✨', value: '17', color: '#34d399' },
          ],
        },
      },
    },
  ],
  subtraction: [
    {
      title: '🎈 Los globos de la fiesta del cole',
      story:
        'Para la fiesta de fin de trimestre en el polideportivo del colegio, inflaron 65 globos de colores. Con el viento del patio, se escaparon volando 19 globos hacia las nubes.',
      question: '¿Cuántos globos quedaron para decorar el polideportivo?',
      hint: 'A los 65 globos que había al principio, réstale los 19 que se escaparon.',
      expectedAnswer: '46 globos (65 - 19 = 46)',
      numericAnswer: 46,
      unit: 'globos',
      visual: {
        type: 'bar_model',
        caption: 'Globos de la fiesta',
        barModel: {
          totalLabel: 'Total inicial: 65 globos 🎈',
          parts: [
            { label: 'Escaparon 💨', value: '19', color: '#fb923c' },
            { label: 'Quedaron 🎉', value: '¿?', color: '#38bdf8' },
          ],
        },
      },
    },
  ],
  multiplication: [
    {
      title: '🧁 Cajas de pastelitos para el cumple',
      story:
        'Para celebrar su 9.º cumpleaños, Valeria ha traído al colegio 4 cajas de pastelitos de colores. En cada caja vienen exactamente 6 pastelitos.',
      question: '¿Cuántos pastelitos ha traído Valeria en total?',
      hint: 'Hay 4 cajas iguales con 6 pastelitos en cada una. ¡Puedes multiplicar 4 por 6!',
      expectedAnswer: '24 pastelitos (4 × 6 = 24)',
      numericAnswer: 24,
      unit: 'pastelitos',
      visual: {
        type: 'grouped_items',
        caption: '4 cajas con 6 pastelitos en cada caja',
        groups: [
          { label: 'Caja 1', emoji: '🧁', count: 6 },
          { label: 'Caja 2', emoji: '🧁', count: 6 },
          { label: 'Caja 3', emoji: '🧁', count: 6 },
          { label: 'Caja 4', emoji: '🧁', count: 6 },
        ],
      },
    },
  ],
  division: [
    {
      title: '🌟 Reparto de estrellas mágicas',
      story:
        'El mago Merlín tiene 20 estrellas mágicas brillantes y quiere repartirlas en partes iguales entre 4 cofres del tesoro sin que sobre ninguna.',
      question: '¿Cuántas estrellas mágicas debe poner en cada cofre?',
      hint: 'Reparte 20 entre 4 cofres haciendo la división 20 ÷ 4 en tu cuaderno.',
      expectedAnswer: '5 estrellas en cada cofre (20 ÷ 4 = 5)',
      numericAnswer: 5,
      unit: 'estrellas',
      visual: {
        type: 'grid_array',
        caption: '20 estrellas para repartir en 4 filas iguales',
        grid: {
          rows: 4,
          cols: 5,
          emoji: '🌟',
          label: '20 estrellas organizadas para los 4 cofres',
        },
      },
    },
  ],
  mixed: [
    {
      title: '🎟️ Tarde de feria con amigos',
      story:
        'Marta va a la feria con su hermano. Compran 3 fichas para los coches de choque y 1 algodón de azúcar gigante para compartir. Mira la lista de precios de la caseta.',
      question: '¿Cuántos euros se han gastado en total?',
      hint: 'Primero calcula cuánto cuestan las 3 fichas multiplicando, y luego súmale el precio del algodón de azúcar.',
      expectedAnswer: '14 euros (3 × 4 € = 12 €, más 2 € = 14 €)',
      numericAnswer: 14,
      unit: 'euros',
      visual: {
        type: 'price_tag_shop',
        caption: 'Precios de la caseta de la feria',
        shopItems: [
          { name: 'Ficha coches', emoji: '🚗', price: '4 €' },
          { name: 'Algodón dulce', emoji: '🍭', price: '2 €' },
          { name: 'Noria gigante', emoji: '🎡', price: '5 €' },
        ],
      },
    },
  ],
};

export function getDeterministicProblem(
  operations: OperationType[],
  recentTitles: string[] = []
): GeneratedProblem {
  const primaryOp: OperationType =
    operations.length > 1 ? 'mixed' : operations[0] || 'addition';
  const pool = FALLBACK_PROBLEMS[primaryOp] || FALLBACK_PROBLEMS.addition;
  const unseen = pool.filter((p) => !recentTitles.includes(p.title));
  const chosen = unseen[0] || pool[0];
  return chosen;
}

const SPANISH_NUMBERS: Record<string, number> = {
  cero: 0,
  uno: 1,
  una: 1,
  dos: 2,
  tres: 3,
  cuatro: 4,
  cinco: 5,
  seis: 6,
  siete: 7,
  ocho: 8,
  nueve: 9,
  diez: 10,
  once: 11,
  doce: 12,
  trece: 13,
  catorce: 14,
  quince: 15,
  dieciseis: 16,
  dieciséis: 16,
  diecisiete: 17,
  dieciocho: 18,
  diecinueve: 19,
  veinte: 20,
  veintiuno: 21,
  veintidos: 22,
  veintidós: 22,
  veintitres: 23,
  veintitrés: 23,
  veinticuatro: 24,
  veinticinco: 25,
  treinta: 30,
  cuarenta: 40,
   'cuarenta y dos': 42,
   'cuarenta y seis': 46,
  cincuenta: 50,
   'cincuenta y dos': 52,
};

export function evaluateAnswerFallback(
  problem: GeneratedProblem,
  userAnswer: string
): ValidationResult {
  const normalized = userAnswer.trim().toLowerCase();
  const target = Number(problem.numericAnswer);

  // Extract all numbers from the user's plain text
  const numberMatches = normalized.match(/-?\d+(?:[.,]\d+)?/g) || [];
  const parsedNumbers = numberMatches.map((n) => Number(n.replace(',', '.')));

  let matched = parsedNumbers.includes(target);

  if (!matched) {
    for (const [word, val] of Object.entries(SPANISH_NUMBERS)) {
      if (val === target && normalized.includes(word)) {
        matched = true;
        break;
      }
    }
  }

  if (matched) {
    return {
      isCorrect: true,
      status: 'correct',
      feedback: `¡Brutal! Has calculado genial en tu cuaderno: la respuesta correcta es ${problem.numericAnswer} ${problem.unit}. (${problem.expectedAnswer})`,
      encouragement: '¡Eres una auténtica crack de las matemáticas! 🌟🎉🦄',
    };
  }

  // Check if close (within 2)
  const isClose = parsedNumbers.some((n) => Math.abs(n - target) <= 2);
  if (isClose) {
    return {
      isCorrect: false,
      status: 'partial',
      feedback: `¡Uy, estás súper cerca! Revisa despacito las cuentas en tu cuaderno de papel, casi lo tienes. Pista: ${problem.hint}`,
      encouragement: '¡Casi, casi! Tú puedes conseguirlo 💪✨',
    };
  }

  return {
    isCorrect: false,
    status: 'incorrect',
    feedback: `Todavía no es el resultado exacto, ¡pero no pasa nada! Vuelve a leer la pregunta y revisa tu operación en el papel. Pista: ${problem.hint}`,
    encouragement: '¡Ánimo campeona, cada intento te hace más lista! 🚀🌈',
  };
}
