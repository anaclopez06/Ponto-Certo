// Cliente da API Olho Vivo da SPTrans.
// Documentação: https://www.sptrans.com.br/desenvolvedores/api-do-olho-vivo-guia-de-referencia/
//
// Como funciona a autenticação:
// 1. POST /Login/Autenticar?token=SEU_TOKEN responde "true".
// 2. A resposta traz um cookie de sessão. O fetch do React Native guarda esse
//    cookie sozinho e o envia nas próximas chamadas.
// 3. Se a sessão expirar, a API responde 401. Nesse caso autenticamos de novo
//    e repetimos a chamada uma vez.

const BASE_URL = 'https://api.olhovivo.sptrans.com.br/v2.1';
const TOKEN = process.env.EXPO_PUBLIC_OLHOVIVO_TOKEN;

let autenticado = false;
let autenticacaoEmAndamento = null;

async function autenticar() {
  if (!TOKEN || TOKEN === 'cole_seu_token_aqui') {
    throw new Error(
      'Token da SPTrans não configurado. Crie o arquivo .env.local com EXPO_PUBLIC_OLHOVIVO_TOKEN (veja o README).'
    );
  }

  const resposta = await fetch(`${BASE_URL}/Login/Autenticar?token=${TOKEN}`, {
    method: 'POST',
    credentials: 'include',
  });
  const ok = await resposta.json();

  if (ok !== true) {
    throw new Error('A SPTrans recusou o token. Confira o token no arquivo .env.local.');
  }
  autenticado = true;
}

// Garante que só uma autenticação acontece por vez, mesmo que várias telas
// chamem a API ao mesmo tempo.
function garantirAutenticacao() {
  if (autenticado) return Promise.resolve();
  if (!autenticacaoEmAndamento) {
    autenticacaoEmAndamento = autenticar().finally(() => {
      autenticacaoEmAndamento = null;
    });
  }
  return autenticacaoEmAndamento;
}

async function get(caminho, jaTentouDeNovo = false) {
  await garantirAutenticacao();

  const resposta = await fetch(`${BASE_URL}${caminho}`, { credentials: 'include' });

  if (resposta.status === 401 && !jaTentouDeNovo) {
    autenticado = false;
    return get(caminho, true);
  }
  if (!resposta.ok) {
    throw new Error(`Erro ${resposta.status} ao consultar a SPTrans.`);
  }
  return resposta.json();
}

// ---- Pontos de ônibus ----

// Todos os pontos de uma linha, na ordem do trajeto.
// Usado só como reserva: a API só conhece os pontos dos corredores, então o
// app usa primeiro os trajetos do GTFS (paradasLocais.js). Se a primeira
// consulta vier vazia, tentamos /Previsao/Linha, que também traz os pontos.
export async function buscarParadasDaLinha(codigoLinha) {
  const dados = await get(`/Parada/BuscarParadasPorLinha?codigoLinha=${codigoLinha}`).catch(
    () => []
  );
  if (dados?.length) return dados;

  const previsao = await get(`/Previsao/Linha?codigoLinha=${codigoLinha}`);
  return (previsao?.ps ?? []).map(({ cp, np, py, px }) => ({ cp, np, ed: '', py, px }));
}

// ---- Previsão de chegada ----

// Todas as linhas que passam no ponto e a previsão de cada ônibus.
// Retorna { hr, p: { cp, np, py, px, l: [{ c, cl, sl, lt0, lt1, qv, vs: [...] }] } }
export async function buscarPrevisaoDaParada(codigoParada) {
  return get(`/Previsao/Parada?codigoParada=${codigoParada}`);
}

// Previsão de uma linha específica em um ponto. Mesmo formato da anterior.
export async function buscarPrevisaoDaLinhaNaParada(codigoParada, codigoLinha) {
  return get(`/Previsao?codigoParada=${codigoParada}&codigoLinha=${codigoLinha}`);
}
