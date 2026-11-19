// Funções de distância entre coordenadas (latitude/longitude).

const RAIO_TERRA_METROS = 6371000;

// Velocidade média de caminhada: ~4,8 km/h = 80 metros por minuto.
const METROS_POR_MINUTO_A_PE = 80;

// As ruas não são uma linha reta. Multiplicamos a distância em linha reta
// por 1,3 para estimar o caminho real a pé.
const FATOR_RUAS = 1.3;

function emRadianos(graus) {
  return (graus * Math.PI) / 180;
}

// Fórmula de Haversine: distância em metros entre dois pontos do globo.
export function distanciaEmMetros(lat1, lon1, lat2, lon2) {
  const dLat = emRadianos(lat2 - lat1);
  const dLon = emRadianos(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(emRadianos(lat1)) * Math.cos(emRadianos(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * RAIO_TERRA_METROS * Math.asin(Math.sqrt(a));
}

// Minutos estimados para andar uma distância (em linha reta) até o ponto.
export function minutosCaminhando(metros) {
  return Math.ceil((metros * FATOR_RUAS) / METROS_POR_MINUTO_A_PE);
}

export function formatarDistancia(metros) {
  if (metros < 1000) {
    return `${Math.round(metros)} m`;
  }
  return `${(metros / 1000).toFixed(1).replace('.', ',')} km`;
}

// Desloca uma coordenada alguns metros para o norte/sul e leste/oeste.
// Usado para consultar ruas ao redor do usuário, e não só a rua dele.
export function deslocarCoordenada(lat, lon, metrosNorte, metrosLeste) {
  const novaLat = lat + (metrosNorte / RAIO_TERRA_METROS) * (180 / Math.PI);
  const novaLon =
    lon + (metrosLeste / (RAIO_TERRA_METROS * Math.cos(emRadianos(lat)))) * (180 / Math.PI);
  return { latitude: novaLat, longitude: novaLon };
}
