import chromium from '@sparticuz/chromium-min';
import puppeteer from 'puppeteer-core';

export default async function handler(req, res) {
  // Configuração CORS (Mantive igual)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { url, height = 1600, width = 1200 } = req.body;

  if (!url) return res.status(400).json({ error: 'URL is required' });

  let browser = null;

  try {
    // A MÁGICA ESTÁ AQUI: Apontamos para o arquivo remoto
    // Isso evita o erro de "libnss3.so" local
    const executablePath = await chromium.executablePath(
      "https://github.com/Sparticuz/chromium/releases/download/v119.0.0/chromium-v119.0.0-pack.tar"
    );

    browser = await puppeteer.launch({
      args: [...chromium.args, "--hide-scrollbars", "--disable-web-security"],
      defaultViewport: chromium.defaultViewport,
      executablePath: executablePath,
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });

    const page = await browser.newPage();

    await page.setViewport({ 
        width: parseInt(width), 
        height: parseInt(height), 
        deviceScaleFactor: 1 
    });

    // Timeout maior para garantir
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    const file = await page.screenshot({ type: 'png', fullPage: true });

    res.statusCode = 200;
    res.setHeader('Content-Type', 'image/png');
    res.end(file);

  } catch (error) {
    console.error("ERRO:", error);
    res.status(500).json({ error: 'Erro no servidor', details: error.message });
  } finally {
    if (browser) await browser.close();
  }
}