// Cria (ou RECRIA, apagando o anterior pelo nome) o workflow do n8n que chama
// POST /api/importar-escala de hora em hora, aos :15 -- dez minutos depois do
// Ingestor da Escala (:05), que e quem traz o Airtable para o banco de la.
//
// Substitui o GitHub Actions (2x/dia), que parou em 26/09 porque a cobranca da
// conta do GitHub falhou e nenhum job era iniciado -- e ninguem viu, porque o
// curl -f engolia o erro.
//
// Uso:
//   N8N_API_KEY=... CRON_SECRET=... node n8n/sincronizar_escala.js --criar-credencial
//       -> cria a credencial httpHeaderAuth com o Bearer e imprime o id
//   N8N_API_KEY=... node n8n/sincronizar_escala.js --credencial <id> [--cron "15 * * * *"] [--ativar]
//       -> recria o workflow apontando para essa credencial
//
// O valor do CRON_SECRET vive so na Vercel, no GitHub (secret) e na credencial do
// n8n -- nunca em arquivo versionado.
const B = 'https://n8nops.livemode.com/api/v1';
const NOME = 'Atividades OPEC · Sincronizar Escala';
const ROTA = 'https://opec-atividades.vercel.app/api/importar-escala';
const ERROR_WORKFLOW_ID = 'm2hpac1wn4SbMI1w'; // Escala OPEC · Erro de workflow -> Registro

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const val = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };

const KEY = process.env.N8N_API_KEY;
if (!KEY) { console.error('falta N8N_API_KEY'); process.exit(1); }
const H = { 'X-N8N-API-KEY': KEY, 'Content-Type': 'application/json', 'User-Agent': 'opec-atividades/1.0' };

async function api(metodo, caminho, corpo) {
  const r = await fetch(B + caminho, { method: metodo, headers: H, body: corpo ? JSON.stringify(corpo) : undefined });
  const texto = await r.text();
  if (!r.ok) throw new Error(`${metodo} ${caminho} -> ${r.status}: ${texto.slice(0, 300)}`);
  return texto ? JSON.parse(texto) : null;
}

async function criarCredencial() {
  const segredo = process.env.CRON_SECRET;
  if (!segredo) { console.error('falta CRON_SECRET'); process.exit(1); }
  const c = await api('POST', '/credentials', {
    name: 'Atividades OPEC · CRON_SECRET',
    type: 'httpHeaderAuth',
    data: { name: 'Authorization', value: `Bearer ${segredo}` },
  });
  console.log('credencial criada:', c.id);
}

async function recriarWorkflow() {
  const credId = val('--credencial');
  if (!credId) { console.error('falta --credencial <id>'); process.exit(1); }
  const cron = val('--cron', '15 * * * *');

  const lista = await api('GET', '/workflows?limit=250');
  for (const w of lista.data || []) {
    if (w.name === NOME) { await api('DELETE', `/workflows/${w.id}`); console.log('apagado o anterior:', w.id); }
  }

  const nodes = [
    {
      name: 'A cada hora', type: 'n8n-nodes-base.scheduleTrigger', typeVersion: 1.2, position: [0, 0],
      parameters: { rule: { interval: [{ field: 'cronExpression', expression: cron }] } },
    },
    {
      name: 'POST /api/importar-escala', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: [260, 0],
      parameters: {
        method: 'POST', url: ROTA,
        authentication: 'genericCredentialType', genericAuthType: 'httpHeaderAuth',
        sendHeaders: true, headerParameters: { parameters: [{ name: 'content-type', value: 'application/json' }] },
        options: { timeout: 120000 },
      },
      credentials: { httpHeaderAuth: { id: credId, name: 'Atividades OPEC · CRON_SECRET' } },
    },
  ];
  const connections = { 'A cada hora': { main: [[{ node: 'POST /api/importar-escala', type: 'main', index: 0 }]] } };
  const w = await api('POST', '/workflows', {
    name: NOME, nodes, connections,
    settings: { executionOrder: 'v1', saveDataSuccessExecution: 'all', saveDataErrorExecution: 'all', errorWorkflow: ERROR_WORKFLOW_ID },
  });
  console.log('workflow criado:', w.id, 'cron:', cron);
  if (flag('--ativar')) { await api('POST', `/workflows/${w.id}/activate`); console.log('ativado'); }
  return w.id;
}

(async () => {
  if (flag('--criar-credencial')) await criarCredencial();
  else await recriarWorkflow();
})().catch((e) => { console.error(e.message); process.exit(1); });
