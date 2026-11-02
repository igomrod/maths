# 🦄 Mates Mágicas ✨

Web educativa en español (España, nivel **4.º de Primaria / 9 años**) diseñada para usar en **tablet** junto con un **cuaderno de papel**.

## Características principales

- **Generación de problemas con IA (OpenCode Go)**: Crea problemas divertidos de suma (`+`), resta (`-`), multiplicación (`×`), división (`÷`) y operaciones combinadas (`🎲`).
- **Pistas visuales dinámicas (SVG / Bloques)**: Cada problema viene acompañado de un bloque visual estructurado (`grouped_items`, `bar_model`, `price_tag_shop`, o `grid_array`).
- **Corrección inteligente en texto libre**: La niña resuelve las cuentas en su cuaderno de papel y escribe su respuesta con sus propias palabras en la tablet; el modelo LLM evalúa su respuesta y la anima con cariño.
- **Historial en `localStorage` organizado por fecha**:
  - Agrupado por día (*Hoy*, *Ayer*, fecha completa).
  - Permite **borrar problemas pendientes** (`⏳`) para mantener la lista limpia.
  - **Protege para siempre los problemas resueltos** (`✅ Trofeo`), que nunca se pueden borrar.
- **Herramienta Ad-Hoc para mejorar el prompt (`npm run prompt:tune`)**:
  - Permite refinar fácilmente `prompts/problem-generator.json` desde la terminal o mediante el comando `/tune-prompt` de OpenCode.

## Desarrollo local

```bash
npm install
npm run dev
```

Para usar el modelo en vivo de OpenCode Go, configura tu clave en `.env`:

```bash
cp .env.example .env
# Edita OPENCODE_API_KEY=...
```

## Herramienta Ad-Hoc para mejorar el prompt

Puedes probar el prompt actual o pedir mejoras directamente por línea de comandos:

```bash
# Ver un ejemplo con el prompt actual
npm run prompt:tune -- --preview

# Mejorar el prompt con nuevas instrucciones
npm run prompt:tune -- "Incluye más problemas de baloncesto y gimnasia rítmica" --yes
```

También dispones del comando personalizado `/tune-prompt` dentro de OpenCode.

## Tests E2E (Playwright)

```bash
npm run test:e2e
```

## Despliegue continuo (Trunk-Based Development + Netlify)

El flujo en `.github/workflows/ci-cd.yml` ejecuta el build y los tests E2E de Playwright en cada push a `main`, desplegando automáticamente a Netlify (configurando `NETLIFY_AUTH_TOKEN` y `NETLIFY_SITE_ID` en los secretos del repositorio de GitHub, o vinculando el repo directamente desde el panel de Netlify).
