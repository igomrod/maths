import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { handleGenerateProblem } from './netlify/functions/generate-problem';
import { handleValidateAnswer } from './netlify/functions/validate-answer';
import { getHealthReport } from './netlify/functions/health';
import { verifyFamilyAccessCode } from './netlify/functions/_shared';

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function localApiMiddleware(): Plugin {
  const attachMiddleware = (middlewares: {
    use: (fn: (req: IncomingMessage, res: ServerResponse, next: () => void) => void) => void;
  }) => {
    middlewares.use(async (req, res, next) => {
      if (!req.url) return next();

      if (req.url === '/api/health' || req.url === '/.netlify/functions/health') {
        const familyHeader = req.headers['x-family-code'];
        const code = Array.isArray(familyHeader) ? familyHeader[0] : familyHeader;
        const report = getHealthReport(code);
        if (req.method === 'POST') {
          const authCheck = verifyFamilyAccessCode(code);
          if (!authCheck.authorized) {
            res.statusCode = 401;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ...report, authorized: false, error: authCheck.error }));
            return;
          }
        }
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(report, null, 2));
        return;
      }

      if (
        (req.url === '/api/generate-problem' || req.url === '/.netlify/functions/generate-problem') &&
        req.method === 'POST'
      ) {
        const familyHeader = req.headers['x-family-code'];
        const authCheck = verifyFamilyAccessCode(Array.isArray(familyHeader) ? familyHeader[0] : familyHeader);
        if (!authCheck.authorized) {
          res.statusCode = 401;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: authCheck.error, code: 'UNAUTHORIZED_FAMILY_CODE' }));
          return;
        }
        try {
          const raw = await readBody(req);
          const body = raw ? JSON.parse(raw) : {};
          const result = await handleGenerateProblem(body);
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(result));
        } catch (err) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Server error' }));
        }
        return;
      }

      if (
        (req.url === '/api/validate-answer' || req.url === '/.netlify/functions/validate-answer') &&
        req.method === 'POST'
      ) {
        const familyHeader = req.headers['x-family-code'];
        const authCheck = verifyFamilyAccessCode(Array.isArray(familyHeader) ? familyHeader[0] : familyHeader);
        if (!authCheck.authorized) {
          res.statusCode = 401;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: authCheck.error, code: 'UNAUTHORIZED_FAMILY_CODE' }));
          return;
        }
        try {
          const raw = await readBody(req);
          const body = raw ? JSON.parse(raw) : {};
          const result = await handleValidateAnswer(body);
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(result));
        } catch (err) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Server error' }));
        }
        return;
      }

      next();
    });
  };

  return {
    name: 'local-netlify-functions-middleware',
    configureServer(server) {
      attachMiddleware(server.middlewares);
    },
    configurePreviewServer(server) {
      attachMiddleware(server.middlewares);
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), localApiMiddleware()],
});
