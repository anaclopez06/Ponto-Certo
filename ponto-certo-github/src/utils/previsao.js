import { minutosAte } from './tempo';

// Converte a resposta da API em uma lista de linhas mais fácil de exibir,
// com os ônibus ordenados pelo tempo de chegada.
export function organizarPrevisao(resposta) {
  const linhas = resposta?.p?.l ?? [];
  return linhas
    .map((linha) => ({
      codigo: linha.cl,
      letreiro: linha.c,
      sentido: linha.sl,
      destino: linha.lt0,
      origem: linha.lt1,
      onibus: (linha.vs ?? [])
        .map((v) => ({
          prefixo: v.p,
          minutos: minutosAte(v.t, resposta.hr),
          acessivel: v.a,
        }))
        .sort((a, b) => a.minutos - b.minutos),
    }))
    .filter((linha) => linha.onibus.length > 0)
    .sort((a, b) => a.onibus[0].minutos - b.onibus[0].minutos);
}
