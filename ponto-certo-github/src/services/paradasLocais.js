// Pontos de ônibus de São Paulo guardados dentro do app.
//
// A API Olho Vivo só lista os pontos dos corredores. Por isso o app traz a
// lista oficial de pontos da SPTrans (GTFS), gerada pelo script
// scripts/gerarDadosGtfs.js. O código de cada ponto é o mesmo da API Olho
// Vivo, então a previsão de chegada continua vindo em tempo real da API.
//
// Os objetos seguem o formato da API: { cp, np, ed, py, px }
// (código, nome, referência, latitude, longitude).

import dadosParadas from '../data/paradas.json';
import dadosTrajetos from '../data/trajetos.json';
import { distanciaEmMetros } from '../utils/geo';
import { removerAcentos } from '../utils/texto';

function normalizar(texto) {
  return removerAcentos(texto ?? '').toLowerCase();
}

const PARADAS = dadosParadas.map(([cp, np, ed, py, px]) => ({
  cp,
  np,
  ed,
  py,
  px,
  textoDeBusca: normalizar(`${np} ${ed}`),
}));

const PARADAS_POR_CODIGO = new Map(PARADAS.map((p) => [p.cp, p]));

// Remove o campo interno usado só na busca.
function semCamposInternos({ textoDeBusca, ...parada }) {
  return parada;
}

// Pontos a até "raio" metros, do mais perto para o mais longe.
export function paradasPerto(latitude, longitude, raio = 800, quantidade = 15) {
  // Filtro rápido por "quadrado" antes de calcular a distância exata.
  const graus = raio / 111000;
  return PARADAS.filter(
    (p) => Math.abs(p.py - latitude) <= graus && Math.abs(p.px - longitude) <= graus * 1.1
  )
    .map((p) => ({
      ...semCamposInternos(p),
      distancia: distanciaEmMetros(latitude, longitude, p.py, p.px),
    }))
    .filter((p) => p.distancia <= raio)
    .sort((a, b) => a.distancia - b.distancia)
    .slice(0, quantidade);
}

// Pontos cujo nome ou referência contém todas as palavras digitadas.
// Ex.: "guilherme giorgi" encontra "R. Aracê, 343 — Ref.: Av. Guilherme Giorgi".
export function paradasPorNome(texto, quantidade = 200) {
  const palavras = normalizar(texto)
    .split(/[\s,.]+/)
    .filter((palavra) => palavra.length > 1);
  if (palavras.length === 0) return [];

  return PARADAS.filter((p) => palavras.every((palavra) => p.textoDeBusca.includes(palavra)))
    .slice(0, quantidade)
    .map(semCamposInternos);
}

// Pontos de uma linha, na ordem do trajeto.
// letreiro: "875A-10" (campo "c" da API). sentido: 1 ou 2 (campo "sl" da API).
export function paradasDoTrajeto(letreiro, sentido) {
  const codigos = dadosTrajetos[`${letreiro}-${sentido - 1}`] ?? [];
  return codigos
    .map((codigo) => PARADAS_POR_CODIGO.get(codigo))
    .filter(Boolean)
    .map(semCamposInternos);
}
