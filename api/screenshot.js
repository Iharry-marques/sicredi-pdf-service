import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { url, height = 1600, width = 1200 } = req.body;

  if (!url) return res.status(400).json({ error: 'URL is required' });

  let browser = null;

  try {
    // Tenta configurar fontes para evitar crash em render de texto (opcional, mas bom)
    // await chromium.font('https://raw.githack.com/googlei18n/noto-emoji/master/fonts/NotoColorEmoji.ttf'); 

    browser = await puppeteer.launch({
      args: [...chromium.args, "--hide-scrollbars", "--disable-web-security"],
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });

    const page = await browser.newPage();

    // Reduzi deviceScaleFactor para 1 para evitar estouro de memória (Crash 500)
    await page.setViewport({ 
        width: parseInt(width), 
        height: parseInt(height), 
        deviceScaleFactor: 1 
    });

    // Mudei para networkidle2: Permite até 2 conexões ativas (ideal para dashboards que não param de carregar)
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 55000 });

    const file = await page.screenshot({ type: 'png', fullPage: true });

    res.statusCode = 200;
    res.setHeader('Content-Type', 'image/png');
    res.end(file);

  } catch (error) {
    console.error("ERRO CRÍTICO NO ROBÔ:", error);
    // Devolve o erro exato para o navegador para sabermos o que houve
    res.status(500).json({ error: 'Erro interno no servidor', details: error.message });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}