import { list } from '@vercel/blob';
import chromium from '@sparticuz/chromium-min';
import puppeteer from 'puppeteer-core';

async function fetchCookies() {
  try {
    // Busca o blob mais recente com o prefixo 'cookies/current.json'
    const { blobs } = await list({ prefix: 'cookies/current.json', limit: 1 });
    if (!blobs || blobs.length === 0) {
      console.warn('Nenhum blob de cookies encontrado com prefixo cookies/current.json');
      return null;
    }

    // Pega a URL do primeiro (e único) blob encontrado
    const cookieBlobUrl = blobs[0].url;
    console.log('Tentando buscar cookies de:', cookieBlobUrl);

    const response = await fetch(cookieBlobUrl);
    if (!response.ok) throw new Error(`Falha ao buscar cookies: ${response.statusText}`);
    return await response.json();
  } catch (error) {
    console.error('Erro ao buscar cookies do blob:', error);
    return null;
  }
}

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
    const remoteExecutablePath = "https://github.com/Sparticuz/chromium/releases/download/v141.0.0/chromium-v141.0.0-pack.x64.tar";
    // Configuração do binário
    // await chromium.font('https://raw.githack.com/googlei18n/noto-emoji/master/fonts/NotoColorEmoji.ttf'); // talvez dando erro silencioso
    const executablePath = await chromium.executablePath(remoteExecutablePath);

    browser = await puppeteer.launch({
      args: [...chromium.args, "--hide-scrollbars", "--disable-web-security"],
      defaultViewport: chromium.defaultViewport,
      executablePath: executablePath,
      headless: chromium.headless,
    });

    const page = await browser.newPage();

    // 🍪 Busca os cookies atualizados do Blob e injeta
    const cookiesArray = await fetchCookies();
    if (cookiesArray && cookiesArray.length > 0) {
      const puppeteerCookies = cookiesArray.map(c => ({
        name: c.name,
        value: c.value,
        domain: c.domain,
        path: c.path || '/',
        secure: c.secure || false,
        httpOnly: c.httpOnly || false,
        sameSite: c.sameSite || 'Lax',
        expires: c.expirationDate,
      }));
      // Filtra cookies inválidos se necessário, mas puppeteer geralmente aceita
      await page.setCookie(...puppeteerCookies);
      console.log('✅ Cookies injetados do blob');
    } else {
      console.warn('⚠️ Nenhum cookie encontrado no blob, continuando sem cookies...');
    }

    // Viewport
    await page.setViewport({
      width: parseInt(width),
      height: parseInt(height),
      deviceScaleFactor: 1
    });

    // Navegação otimizada para evitar timeout
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 50000 });

    const file = await page.screenshot({
      type: 'png',
      fullPage: true
    });

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