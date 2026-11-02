---
description: Improve and test the math problem generation prompt in prompts/problem-generator.json
---

The user wants to refine the prompt used to generate math problems for their 9-year-old daughter:
Feedback / Request: $ARGUMENTS

1. Read `prompts/problem-generator.json`.
2. Update `systemPrompt` and/or `userPromptTemplate` in `prompts/problem-generator.json` to incorporate the requested improvements while preserving the required JSON output schema and Spain Spanish (4.º de Primaria) tone.
3. Bump the `version` and `lastUpdated` fields in `prompts/problem-generator.json`.
4. Run `npm run prompt:tune -- --preview` to verify the prompt configuration works cleanly.
