import { list } from '@vercel/blob';
import chromium from '@sparticuz/chromium-min';
import puppeteer from 'puppeteer-core';

async function fetchCookies() {
  try {
    const { blobs } = await list({ prefix: 'cookies/current.json', limit: 1 });
    if (!blobs || blobs.length === 0) return null;
    const response = await fetch(blobs[0].url);
    if (!response.ok) throw new Error('Falha ao buscar cookies');
    return await response.json();
  } catch (error) {
    console.error('Erro cookie:', error);
    return null;
  }
}

// Função para traduzir o cookie da extensão para o Puppeteer
function sanitizeSameSite(value) {
  if (!value) return 'Lax'; // Padrão seguro
  const lower = value.toLowerCase();
  if (lower === 'no_restriction') return 'None'; // A tradução necessária!
  if (lower === 'lax') return 'Lax';
  if (lower === 'strict') return 'Strict';
  return 'Lax';
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const { url, width = 1200, height = 1600 } = req.body || {};
  if (!url) return res.status(400).json({ error: 'URL missing' });

  let browser = null;

  try {
    const remoteExecutablePath = "https://github.com/Sparticuz/chromium/releases/download/v141.0.0/chromium-v141.0.0-pack.x64.tar";
    const executablePath = await chromium.executablePath(remoteExecutablePath);

    browser = await puppeteer.launch({
      args: [...chromium.args, "--hide-scrollbars", "--disable-web-security", "--font-render-hinting=none"],
      defaultViewport: chromium.defaultViewport,
      executablePath: executablePath,
      headless: chromium.headless,
    });

    const page = await browser.newPage();

    // 🍪 Injeção de Cookies com correção de SameSite
    const cookiesArray = await fetchCookies();
    if (cookiesArray?.length) {
      const cleanCookies = cookiesArray.map(c => ({
        name: c.name,
        value: c.value,
        domain: c.domain,
        path: c.path || '/',
        secure: c.secure,
        httpOnly: c.httpOnly,
        // Corrige o erro "Invalid parameters" traduzindo "no_restriction" para "None"
        sameSite: sanitizeSameSite(c.sameSite), 
        expires: c.expirationDate
      }));
      
      await page.setCookie(...cleanCookies);
      console.log('✅ Cookies injetados e corrigidos');
    }

    await page.setViewport({ width: parseInt(width), height: parseInt(height), deviceScaleFactor: 1 });

    console.log(`Navegando: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 40000 });

    console.log('⏳ Esperando renderização (10s)...');
    await new Promise(r => setTimeout(r, 10000));

    const file = await page.screenshot({ type: 'png', fullPage: true });

    res.statusCode = 200;
    res.setHeader('Content-Type', 'image/png');
    res.end(file);

  } catch (error) {
    console.error("ERRO:", error);
    res.status(500).json({ error: 'Falha na geracao', details: error.message });
  } finally {
    if (browser) await browser.close();
  }
}