import { list } from '@vercel/blob';
import chromium from '@sparticuz/chromium-min';
import puppeteer from 'puppeteer-core';

// Função auxiliar para buscar cookies no Blob
async function fetchCookies() {
  try {
    const { blobs } = await list({ prefix: 'cookies/current.json', limit: 1 });
    if (!blobs || blobs.length === 0) {
      console.warn('Nenhum blob de cookies encontrado.');
      return null;
    }
    const response = await fetch(blobs[0].url);
    if (!response.ok) throw new Error('Falha ao buscar cookies');
    return await response.json();
  } catch (error) {
    console.error('Erro ao buscar cookies:', error);
    return null;
  }
}

export default async function handler(req, res) {
  // --- Configuração de CORS ---
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  // Validação básica
  const { url, width = 1200, height = 1600 } = req.body || {};
  if (!url) return res.status(400).json({ error: 'URL is required' });

  let browser = null;

  try {
    // --- Configuração do Navegador (Versão v141 compatível com Node 20) ---
    const remoteExecutablePath = "https://github.com/Sparticuz/chromium/releases/download/v141.0.0/chromium-v141.0.0-pack.x64.tar";
    const executablePath = await chromium.executablePath(remoteExecutablePath);

    browser = await puppeteer.launch({
      args: [...chromium.args, "--hide-scrollbars", "--disable-web-security", "--font-render-hinting=none"],
      defaultViewport: chromium.defaultViewport,
      executablePath: executablePath,
      headless: chromium.headless,
    });

    const page = await browser.newPage();

    // --- Injeção de Cookies (Login) ---
    const cookiesArray = await fetchCookies();
    if (cookiesArray && cookiesArray.length > 0) {
      await page.setCookie(...cookiesArray.map(c => ({
        name: c.name,
        value: c.value,
        domain: c.domain,
        path: c.path || '/',
        secure: c.secure,
        httpOnly: c.httpOnly,
        sameSite: c.sameSite,
        expires: c.expirationDate,
      })));
      console.log('✅ Cookies injetados com sucesso');
    } else {
      console.warn('⚠️ Seguindo sem cookies (pode dar erro de acesso)');
    }

    // Configura tamanho da tela
    await page.setViewport({
      width: parseInt(width),
      height: parseInt(height),
      deviceScaleFactor: 1
    });

    // --- Navegação ---
    console.log(`Navegando para: ${url}`);
    // Timeout de 40s para navegação (deixando margem para o wait)
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 40000 });

    // --- O PULO DO GATO (Correção da Tela Branca) ---
    // Espera explícita de 10 segundos para o JS do Looker Studio desenhar os gráficos
    console.log('⏳ Aguardando renderização visual (10s)...');
    await new Promise(r => setTimeout(r, 10000));

    // --- Captura ---
    const file = await page.screenshot({ type: 'png', fullPage: true });

    res.statusCode = 200;
    res.setHeader('Content-Type', 'image/png');
    res.end(file);

  } catch (error) {
    console.error("ERRO CRÍTICO:", error);
    res.status(500).json({
      error: 'Erro interno ao gerar PDF',
      details: error.message,
      stack: error.stack
    });
  } finally {
    if (browser) await browser.close();
  }
}