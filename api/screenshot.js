import chromium from '@sparticuz/chromium-min';
import puppeteer from 'puppeteer-core';

export default async function handler(req, res) {
  // CORS Setup
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  
  // Validação simples
  const { url, width = 1200, height = 1600 } = req.body || {};
  if (!url) return res.status(400).json({ error: 'URL missing' });

  let browser = null;

  try {
    // URL EXATA do pacote compatível com Node 20 / AL2023
    // Isso resolve o erro libnss3.so
    const remoteExecutablePath = "https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar";

    // Configuração do binário
    await chromium.font('https://raw.githack.com/googlei18n/noto-emoji/master/fonts/NotoColorEmoji.ttf'); // Previne crash de fonte
    const executablePath = await chromium.executablePath(remoteExecutablePath);

    browser = await puppeteer.launch({
      args: [...chromium.args, "--hide-scrollbars", "--disable-web-security"],
      defaultViewport: chromium.defaultViewport,
      executablePath: executablePath,
      headless: chromium.headless,
    });

    const page = await browser.newPage();

    // Viewport
    await page.setViewport({ 
        width: parseInt(width), 
        height: parseInt(height), 
        deviceScaleFactor: 1 
    });

    // Navegação otimizada para evitar timeout
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 50000 });

    const file = await page.screenshot({ type: 'png' });

    res.statusCode = 200;
    res.setHeader('Content-Type', 'image/png');
    res.end(file);

  } catch (error) {
    console.error("ERRO CRÍTICO:", error);
    res.status(500).json({ 
      error: 'Falha na geracao', 
      details: error.message,
      stack: error.stack 
    });
  } finally {
    if (browser) await browser.close();
  }
}