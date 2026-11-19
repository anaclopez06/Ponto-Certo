# Ponto Certo 🚌

App mobile em **React Native (Expo)** que ajuda quem anda de ônibus em São Paulo,
usando a **API Olho Vivo da SPTrans**, o **GPS** do celular e **notificações locais**.

Global Solution 2026.2 · Cross-Platform Application Development · FIAP
Área de desafio: *Citizen Intelligence & Predictive Analytics*.

## O problema

Quem pega ônibus em SP perde tempo no ponto sem saber quando o ônibus chega,
sai de casa cedo ou tarde demais, e tem medo de passar do ponto de descida
(principalmente à noite, em trajetos novos ou com o celular no bolso).

## O que o app faz

| Funcionalidade | Como funciona | GPS | Alerta |
|---|---|---|---|
| **Pontos perto de você** | Pega a posição do GPS e calcula, no próprio celular, os pontos a até 800 m, com distância e tempo a pé. A busca aceita nome de ponto, rua de referência ou endereço (ex.: "Av. Guilherme Giorgi"). | ✅ | |
| **Próximos ônibus** | Mostra todas as linhas do ponto e em quantos minutos cada ônibus chega, destacando veículos acessíveis (♿). Atualiza a cada 30 s e diz se ainda dá tempo de ir a pé. | ✅ | |
| **Me avise (ônibus chegando)** | O usuário escolhe a linha e recebe uma notificação + vibração quando o ônibus estiver a 2, 5 ou 10 min do ponto. | | ✅ |
| **Me avise (hora de sair)** | Calcula pelo GPS quanto tempo o usuário leva a pé até o ponto e avisa a hora certa de sair de casa para não perder o ônibus. | ✅ | ✅ |
| **Desça no ponto certo** | Durante a viagem o app acompanha o GPS. A 500 m do ponto escolhido vibra e notifica "Prepare-se"; a 150 m vibra forte e avisa "Desça no próximo ponto!". | ✅ | ✅ |

Permissões são tratadas com telas próprias: se o usuário negar a localização,
o app explica por que precisa dela e oferece abrir as configurações; se negar as
notificações, o app continua avisando por vibração.

## Endpoints da API Olho Vivo usados

| Endpoint | Onde |
|---|---|
| `POST /Login/Autenticar?token=` | `src/services/olhoVivo.js` (reautentica sozinho se a sessão expirar) |
| `GET /Previsao/Parada?codigoParada=` | Painel "próximos ônibus" |
| `GET /Previsao?codigoParada=&codigoLinha=` | Monitoramento do "Me avise" |
| `GET /Parada/BuscarParadasPorLinha?codigoLinha=` | Reserva para os pontos de uma linha (ponto de descida) |
| `GET /Previsao/Linha?codigoLinha=` | Reserva da reserva, quando o endpoint acima vem vazio |

### Por que o app traz a lista de pontos (GTFS)

Durante os testes descobrimos que a API Olho Vivo **só lista os pontos dos
corredores de ônibus**: `/Parada/Buscar` não encontra os pontos comuns de rua
(a busca por "tatuape" volta vazia, por exemplo). Já a previsão de chegada
funciona para **qualquer** ponto, desde que se saiba o código dele.

Por isso o app traz a lista oficial de pontos e trajetos da SPTrans (GTFS),
em `src/data/`. Os códigos são os mesmos da API, então:
- os pontos próximos e a busca são calculados no celular, na hora;
- a previsão de chegada continua vindo **em tempo real** da API Olho Vivo.

Para atualizar os dados, baixe o GTFS na área de desenvolvedores da SPTrans,
extraia `stops.txt` e `stop_times.txt` numa pasta e rode
`node scripts/gerarDadosGtfs.js caminho/da/pasta`.

## Como executar

Pré-requisitos: Node.js 20+ e o app **Expo Go** no celular (Play Store / App Store).

1. **Gere o token da SPTrans**: crie uma conta em
   <https://www.sptrans.com.br/desenvolvedores/>, vá em *Meus Aplicativos* e adicione
   um aplicativo. A liberação pode levar algum tempo.
2. **Instale as dependências**:
   ```bash
   npm install
   ```
3. **Configure o token**: copie `.env.example` para `.env.local` e cole o token:
   ```
   EXPO_PUBLIC_OLHOVIVO_TOKEN=seu_token_aqui
   ```
   O `.env.local` está no `.gitignore` e não vai para o GitHub.
4. **Rode o projeto**:
   ```bash
   npx expo start
   ```
5. Leia o QR Code com o Expo Go (Android) ou com a câmera (iPhone).
   Celular e computador precisam estar na mesma rede Wi-Fi; se não for possível,
   use `npx expo start --tunnel`.
6. Aceite as permissões de **localização** e de **notificações** quando o app pedir.

> Os avisos funcionam com o app aberto (pode ser com a tela ligada no bolso).
> O Expo Go não permite rodar GPS e consultas em segundo plano.

## Estrutura do código

```
scripts/gerarDadosGtfs.js      gera src/data/ a partir do GTFS da SPTrans
App.js                         navegação (stack) e configuração das notificações
src/
  theme.js                     cores e tamanhos de fonte (alto contraste)
  services/
    olhoVivo.js                cliente da API Olho Vivo (autenticação + endpoints)
    paradasLocais.js           lista oficial de pontos e trajetos (GTFS) e buscas nela
    paradasProximas.js         pontos perto de uma coordenada
    buscaDeParadas.js          busca por nome/referência ou por endereço (OpenStreetMap)
    alertas.js                 notificações locais e vibração
  hooks/
    useLocalizacao.js          permissão de GPS, posição única ou contínua
  components/                  Botao, Estados (carregando/erro), EstadoLocalizacao, CreditoSPTrans
  screens/
    PontosProximos.js          tela inicial
    PrevisaoParada.js          próximos ônibus de um ponto
    AvisoOnibus.js             "ônibus chegando" e "hora de sair"
    DescerNoPonto.js           acompanha a viagem e avisa a descida
  data/
    paradas.json               todos os pontos de SP (GTFS da SPTrans)
    trajetos.json              pontos de cada linha, na ordem (GTFS)
  utils/
    geo.js                     distância (Haversine) e tempo a pé
    tempo.js                   minutos até um horário "HH:MM"
    texto.js                   remove acentos para comparar textos
    previsao.js                organiza a resposta de previsão da API
```

## Serviços externos

Além da SPTrans, o app usa o **OpenStreetMap (Nominatim)** para descobrir onde
fica um endereço digitado na busca, quando ele não é nome de nenhum ponto.

## Tecnologias

React Native · Expo SDK 58 · React Navigation · expo-location · expo-notifications ·
Vibration/Alert do React Native.

## Créditos

Dados de ônibus em tempo real: **SPTrans – API Olho Vivo**. Pontos e trajetos: **GTFS da SPTrans**.
Endereços: © colaboradores do **OpenStreetMap**.
Integrantes e divisão do trabalho: veja [`INTEGRANTES.txt`](INTEGRANTES.txt).
