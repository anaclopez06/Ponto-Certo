// Gera os arquivos src/data/paradas.json e src/data/trajetos.json a partir
// do GTFS da SPTrans (área de desenvolvedores > GTFS).
//
// Por que isso existe: a API Olho Vivo só lista os pontos dos corredores de
// ônibus. Os pontos comuns de rua não aparecem em /Parada/Buscar, mas a
// previsão de chegada (/Previsao/Parada) funciona para qualquer ponto, desde
// que o app saiba o código dele. O GTFS traz todos os pontos da cidade com o
// mesmo código usado pela API Olho Vivo.
//
// Como usar (com Node.js):
//   1. Baixe o GTFS e extraia stops.txt, trips.txt e stop_times.txt numa pasta.
//   2. Rode: node scripts/gerarDadosGtfs.js caminho/da/pasta
//
// Saída:
//   paradas.json  -> [[codigo, nome, referencia, latitude, longitude], ...]
//   trajetos.json -> { "875A-10-0": [codigo, codigo, ...], ... }  (pontos em ordem)
//                    a chave é "letreiro-sentido", com sentido 0 ou 1.

const fs = require('fs');
const path = require('path');

const pastaGtfs = process.argv[2];
if (!pastaGtfs) {
  console.error('Uso: node scripts/gerarDadosGtfs.js caminho/da/pasta/do/gtfs');
  process.exit(1);
}

// Leitor de CSV simples, que entende campos entre aspas.
function lerCsv(arquivo) {
  const texto = fs.readFileSync(path.join(pastaGtfs, arquivo), 'utf8').replace(/^﻿/, '');
  const linhas = texto.split(/\r?\n/).filter(Boolean);
  const separar = (linha) => {
    const campos = [];
    let atual = '';
    let entreAspas = false;
    for (let i = 0; i < linha.length; i++) {
      const c = linha[i];
      if (c === '"') {
        if (entreAspas && linha[i + 1] === '"') {
          atual += '"';
          i++;
        } else {
          entreAspas = !entreAspas;
        }
      } else if (c === ',' && !entreAspas) {
        campos.push(atual);
        atual = '';
      } else {
        atual += c;
      }
    }
    campos.push(atual);
    return campos;
  };
  const cabecalho = separar(linhas[0]);
  return linhas.slice(1).map((linha) => {
    const campos = separar(linha);
    return Object.fromEntries(cabecalho.map((nome, i) => [nome, campos[i]]));
  });
}

const arredondar = (n) => Math.round(Number(n) * 1e5) / 1e5;

// ---- Pontos ----
const paradas = lerCsv('stops.txt').map((p) => [
  Number(p.stop_id),
  p.stop_name.trim(),
  p.stop_desc.trim(),
  arredondar(p.stop_lat),
  arredondar(p.stop_lon),
]);

// ---- Trajetos (pontos de cada linha, na ordem) ----
const viagens = lerCsv('stop_times.txt');
const porViagem = {};
viagens.forEach((v) => {
  (porViagem[v.trip_id] ??= []).push([Number(v.stop_sequence), Number(v.stop_id)]);
});
const trajetos = {};
Object.entries(porViagem).forEach(([viagem, pontos]) => {
  trajetos[viagem] = pontos.sort((a, b) => a[0] - b[0]).map(([, codigo]) => codigo);
});

const destino = path.join(__dirname, '..', 'src', 'data');
fs.mkdirSync(destino, { recursive: true });
fs.writeFileSync(path.join(destino, 'paradas.json'), JSON.stringify(paradas));
fs.writeFileSync(path.join(destino, 'trajetos.json'), JSON.stringify(trajetos));

console.log(`${paradas.length} pontos e ${Object.keys(trajetos).length} trajetos gerados em ${destino}`);
