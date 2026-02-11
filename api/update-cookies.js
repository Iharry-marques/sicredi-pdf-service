import { put } from '@vercel/blob';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authToken = req.headers['x-auth-token'];
  if (authToken !== process.env.PANEL_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { cookies } = req.body;
  if (!cookies) {
    return res.status(400).json({ error: 'Cookies array is required' });
  }

  try {
    // CORREÇÃO: Adicionado allowOverwrite: true para permitir atualizar os cookies
    const blobFixed = await put('cookies/current.json', JSON.stringify(cookies), {
      access: 'public',
      addRandomSuffix: false,
      contentType: 'application/json',
      token: process.env.BLOB_READ_WRITE_TOKEN, // Garante o uso do token correto
      allowOverwrite: true // <--- O PULO DO GATO PARA CORRIGIR O ERRO
    });

    res.status(200).json({
      success: true,
      message: 'Cookies atualizados com sucesso!',
      url: blobFixed.url
    });
  } catch (error) {
    console.error('Erro ao salvar cookies:', error);
    res.status(500).json({ error: 'Falha ao salvar cookies', details: error.message });
  }
}