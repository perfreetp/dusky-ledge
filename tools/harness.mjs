import { chromium } from 'playwright-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.map': 'application/json',
  '.css': 'text/css',
  '.json': 'application/json',
};

export async function startServer(port = 0) {
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p === '/') p = '/index.html';
    const fp = path.join(root, p);
    if (!fp.startsWith(root)) return res.writeHead(403).end();
    fs.readFile(fp, (err, data) => {
      if (err) return res.writeHead(404).end('404');
      res.writeHead(200, { 'content-type': MIME[path.extname(fp)] || 'application/octet-stream' });
      res.end(data);
    });
  });
  await new Promise((r) => server.listen(port, r));
  const addr = server.address();
  return { server, port: addr.port, url: `http://127.0.0.1:${addr.port}/` };
}

export async function launch() {
  return chromium.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--disable-dev-shm-usage'],
  });
}

export async function openPage(browser, url, { width = 1440, height = 900 } = {}) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push('console: ' + m.text());
  });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(400);
  return { page, errors };
}
