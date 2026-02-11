export default async function handler(req, res) {
    res.setHeader('Content-Type', 'text/html');
    res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>Atualizar Cookies do Looker</title>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial; max-width: 800px; margin: 50px auto; padding: 20px; }
    textarea { width: 100%; height: 400px; font-family: monospace; }
    button { padding: 10px 20px; background: #0070f3; color: white; border: none; border-radius: 5px; cursor: pointer; }
    pre { background: #f5f5f5; padding: 10px; border-radius: 5px; }
  </style>
</head>
<body>
  <h1>🔑 Atualizar Cookies do Looker Studio</h1>
  <p>Exporte os cookies do seu navegador (extensão EditThisCookie) e cole abaixo (formato JSON):</p>
  <textarea id="cookiesInput" placeholder='[ { "domain": ".google.com", "name": "SAPISID", ... } ]'></textarea>
  <br><br>
  <button onclick="updateCookies()">Atualizar Cookies</button>
  <div id="result"></div>

  <script>
    async function updateCookies() {
      const cookiesText = document.getElementById('cookiesInput').value;
      try {
        const cookies = JSON.parse(cookiesText);
        const token = prompt("Digite o token de segurança:"); // ou use um campo de senha
        const res = await fetch('/api/update-cookies', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-auth-token': token
          },
          body: JSON.stringify({ cookies })
        });
        const data = await res.json();
        if (res.ok) {
          document.getElementById('result').innerHTML = \`<pre style="background:#d4edc9;">✅ Sucesso! Cookies atualizados.</pre>\`;
        } else {
          document.getElementById('result').innerHTML = \`<pre style="background:#f8d7da;">❌ Erro: \${data.error}</pre>\`;
        }
      } catch (e) {
        alert('JSON inválido!');
      }
    }
  </script>
</body>
</html>
  `);
}
