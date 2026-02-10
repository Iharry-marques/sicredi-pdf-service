import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

export default async function handler(req, res) {
  // Permite que seu site chame esta API (CORS)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Responde rápido para requisições de verificação (OPTIONS)
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Aceita apenas POST
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { url, height = 1600, width = 1200 } = req.body;

  if (!url) return res.status(400).json({ error: 'URL is required' });

  let browser = null;

  try {
    // Inicia o Chrome Leve da Vercel
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });

    const page = await browser.newPage();

    // Define o tamanho exato do relatório (evita cortes!)
    await page.setViewport({ 
        width: parseInt(width), 
        height: parseInt(height), 
        deviceScaleFactor: 2 
    });

    // Navega e espera carregar
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });

    // Tira o print
    const file = await page.screenshot({ type: 'png', fullPage: true });

    res.statusCode = 200;
    res.setHeader('Content-Type', 'image/png');
    res.end(file);

  } catch (error) {
    console.error("Erro no Puppeteer:", error);
    res.status(500).json({ error: 'Erro ao gerar imagem', details: error.message });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}