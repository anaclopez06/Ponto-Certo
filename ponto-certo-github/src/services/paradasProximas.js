// Pontos de ônibus perto de uma coordenada (a posição do GPS do usuário ou
// um endereço digitado na busca).
//
// A API Olho Vivo não tem uma busca "pontos perto de mim" e só lista os
// pontos dos corredores. Por isso o cálculo é feito no próprio celular, com a
// lista oficial de pontos da SPTrans que vem dentro do app (paradasLocais.js).

import { paradasPerto } from './paradasLocais';
import { distanciaEmMetros } from '../utils/geo';

const RAIO_METROS = 800;
const QUANTIDADE_MAXIMA = 15;

export function buscarParadasProximas(latitude, longitude) {
  return paradasPerto(latitude, longitude, RAIO_METROS, QUANTIDADE_MAXIMA);
}

// Calcula a distância de cada parada até o usuário e ordena da mais perto
// para a mais longe.
export function ordenarPorDistancia(paradas, latitude, longitude) {
  return paradas
    .map((parada) => ({
      ...parada,
      distancia: distanciaEmMetros(latitude, longitude, parada.py, parada.px),
    }))
    .sort((a, b) => a.distancia - b.distancia);
}
