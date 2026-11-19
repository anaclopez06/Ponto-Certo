// Busca de pontos pelo texto que o usuário digitou.
// 1. Procura o texto no nome e na referência dos pontos (ex.: "guilherme giorgi"
//    encontra "R. Aracê, 343 — Ref.: Av. Guilherme Giorgi").
// 2. Se não achar, trata o texto como um endereço: descobre onde ele fica pelo
//    OpenStreetMap e mostra os pontos perto desse lugar.

import { paradasPorNome } from './paradasLocais';
import { buscarParadasProximas } from './paradasProximas';

const NOMINATIM_BUSCA_URL = 'https://nominatim.openstreetmap.org/search';

// Descobre a latitude/longitude de um endereço ou lugar em São Paulo.
async function localizarEndereco(texto) {
  try {
    const consulta = encodeURIComponent(`${texto}, São Paulo, SP`);
    const resposta = await fetch(`${NOMINATIM_BUSCA_URL}?format=jsonv2&limit=1&q=${consulta}`, {
      headers: {
        'User-Agent': 'PontoCerto/1.0 (trabalho academico FIAP)',
        'Accept-Language': 'pt-BR',
      },
    });
    if (!resposta.ok) return null;
    const [lugar] = await resposta.json();
    return lugar ? { latitude: Number(lugar.lat), longitude: Number(lugar.lon) } : null;
  } catch {
    return null;
  }
}

export async function buscarParadasPorTexto(texto) {
  const porNome = paradasPorNome(texto);
  if (porNome.length > 0) return porNome;

  const lugar = await localizarEndereco(texto);
  if (!lugar) return [];
  return buscarParadasProximas(lugar.latitude, lugar.longitude);
}
