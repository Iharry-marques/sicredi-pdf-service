import { put } from '@vercel/blob';
import { randomUUID } from 'crypto';

export default async function handler(req, res) {
  // Apenas POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 🔐 Proteção simples – você pode trocar por um token fixo
  const authToken = req.headers['x-auth-token'];
  if (authToken !== process.env.PANEL_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { cookies } = req.body;
  if (!cookies) {
    return res.status(400).json({ error: 'Cookies array is required' });
  }

  try {
    // Gera um nome único para o arquivo (sempre sobrescreve o mesmo)
    const blob = await put('looker-cookies.json', JSON.stringify(cookies), {
      access: 'public',       // O arquivo será público, mas o nome é aleatório
      addRandomSuffix: true, // Garante que seja um novo arquivo a cada upload
      contentType: 'application/json',
    });

    // Opcional: guarda a URL do blob atual em uma variável de ambiente? 
    // Melhor: usar o mesmo nome fixo com sobrescrita? Vamos usar um nome fixo com sobrescrita.
    // Para simplificar, vou usar um nome fixo e sobrescrever:
    
    // Vamos usar put com nome fixo e `addRandomSuffix: false` para sempre substituir
    const blobFixed = await put('cookies/current.json', JSON.stringify(cookies), {
      access: 'public',
      addRandomSuffix: false,
      contentType: 'application/json',
    });

    res.status(200).json({
      success: true,
      message: 'Cookies atualizados com sucesso!',
      url: blobFixed.url
    });
  } catch (error) {
    console.error('Erro ao salvar cookies:', error);
    res.status(500).json({ error: 'Falha ao salvar cookies' });
  }
}