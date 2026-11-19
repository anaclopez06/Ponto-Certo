// "Desça no ponto certo": o usuário escolhe onde vai descer e o app
// acompanha o GPS durante a viagem. Quando o ponto está chegando, o celular
// vibra e mostra uma notificação.
import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import useLocalizacao from '../hooks/useLocalizacao';
import EstadoLocalizacao from '../components/EstadoLocalizacao';
import CreditoSPTrans from '../components/CreditoSPTrans';
import Botao from '../components/Botao';
import { Carregando, MensagemErro } from '../components/Estados';
import { buscarParadasDaLinha } from '../services/olhoVivo';
import { paradasDoTrajeto } from '../services/paradasLocais';
import {
  avisar,
  garantirPermissaoDeNotificacao,
  VIBRACAO_CURTA,
  VIBRACAO_FORTE,
} from '../services/alertas';
import { distanciaEmMetros, formatarDistancia } from '../utils/geo';
import { cores, fontes } from '../theme';

// Um ônibus em SP anda em média ~300 m por minuto.
// 500 m = cerca de 1 minuto e meio antes: tempo de levantar e dar o sinal.
const DISTANCIA_PREPARAR_METROS = 500;
const DISTANCIA_DESCER_METROS = 150;

// Se o usuário está a mais de 2 km de qualquer ponto da linha, ainda não
// está no trajeto: mostramos a linha inteira.
const DISTANCIA_MAXIMA_DA_LINHA = 2000;

function indiceDoPontoMaisProximo(paradas, posicao) {
  let melhorIndice = -1;
  let menorDistancia = Infinity;
  paradas.forEach((parada, indice) => {
    const d = distanciaEmMetros(posicao.latitude, posicao.longitude, parada.py, parada.px);
    if (d < menorDistancia) {
      menorDistancia = d;
      melhorIndice = indice;
    }
  });
  return menorDistancia <= DISTANCIA_MAXIMA_DA_LINHA ? melhorIndice : -1;
}

export default function DescerNoPonto({ route, navigation }) {
  const { linha } = route.params;
  const gps = useLocalizacao({ acompanhar: true });

  const [paradas, setParadas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [destino, setDestino] = useState(null);
  const avisos = useRef({ preparar: false, descer: false });

  useLayoutEffect(() => {
    navigation.setOptions({ title: `Viagem no ${linha.letreiro}` });
  }, [navigation, linha.letreiro]);

  async function carregarParadas() {
    setCarregando(true);
    setErro(null);
    try {
      // Primeiro o trajeto oficial que vem no app (GTFS); a API é a reserva.
      const doTrajeto = paradasDoTrajeto(linha.letreiro, linha.sentido);
      setParadas(doTrajeto.length > 0 ? doTrajeto : await buscarParadasDaLinha(linha.codigo));
    } catch (e) {
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarParadas();
    // Carrega só uma vez, quando a tela abre.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const indiceAtual = gps.posicao ? indiceDoPontoMaisProximo(paradas, gps.posicao) : -1;
  const indiceDestino = destino ? paradas.findIndex((p) => p.cp === destino.cp) : -1;
  const distanciaAteDestino =
    destino && gps.posicao
      ? distanciaEmMetros(gps.posicao.latitude, gps.posicao.longitude, destino.py, destino.px)
      : null;

  // A cada nova posição do GPS, verifica se é hora de avisar.
  useEffect(() => {
    if (distanciaAteDestino == null) return;

    if (distanciaAteDestino <= DISTANCIA_DESCER_METROS && !avisos.current.descer) {
      avisos.current.descer = true;
      avisos.current.preparar = true;
      avisar('🛑 Desça no próximo ponto!', `Você está chegando em ${destino.np}.`, VIBRACAO_FORTE);
      Alert.alert('Desça agora!', `Você está chegando em ${destino.np}. Dê o sinal ao motorista.`);
    } else if (distanciaAteDestino <= DISTANCIA_PREPARAR_METROS && !avisos.current.preparar) {
      avisos.current.preparar = true;
      avisar(
        '🔔 Prepare-se para descer',
        `Seu ponto ${destino.np} está a ${formatarDistancia(distanciaAteDestino)}.`,
        VIBRACAO_CURTA
      );
    }
  }, [distanciaAteDestino, destino]);

  async function escolherDestino(parada) {
    await garantirPermissaoDeNotificacao();
    avisos.current = { preparar: false, descer: false };
    setDestino(parada);
  }

  if (gps.status !== 'ok') {
    return <EstadoLocalizacao {...gps} />;
  }
  if (carregando) {
    return <Carregando mensagem="Carregando os pontos da linha..." />;
  }
  if (erro) {
    return <MensagemErro mensagem={erro} onTentarDeNovo={carregarParadas} />;
  }

  // ---- Viagem em andamento ----
  if (destino) {
    const pontosRestantes =
      indiceAtual >= 0 && indiceDestino >= 0 ? indiceDestino - indiceAtual : null;
    const chegando = distanciaAteDestino <= DISTANCIA_PREPARAR_METROS;
    const horaDeDescer = distanciaAteDestino <= DISTANCIA_DESCER_METROS;

    return (
      <View style={[styles.tela, styles.viagem]}>
        <Text style={styles.legenda}>Seu ponto de descida</Text>
        <Text style={styles.destinoNome}>{destino.np}</Text>

        <View style={[styles.painel, chegando && styles.painelChegando]}>
          <Text style={[styles.painelValor, chegando && styles.painelValorChegando]}>
            {formatarDistancia(distanciaAteDestino)}
          </Text>
          <Text style={[styles.painelLegenda, chegando && styles.painelLegendaChegando]}>
            {horaDeDescer
              ? 'Desça no próximo ponto!'
              : chegando
                ? 'Prepare-se para descer!'
                : 'até o seu ponto'}
          </Text>
          {pontosRestantes != null && pontosRestantes > 0 ? (
            <Text style={[styles.painelLegenda, chegando && styles.painelLegendaChegando]}>
              {pontosRestantes === 1 ? 'É o próximo ponto' : `Faltam ${pontosRestantes} pontos`}
            </Text>
          ) : null}
        </View>

        <Text style={styles.explicacao}>
          Pode guardar o celular no bolso com o app aberto: ele vibra a{' '}
          {DISTANCIA_PREPARAR_METROS} m do ponto e de novo quando for a hora de descer.
        </Text>

        <Botao titulo="Trocar ponto de descida" variante="secundario" onPress={() => setDestino(null)} />
        <Botao titulo="Encerrar viagem" variante="perigo" onPress={() => navigation.popToTop()} />
        <CreditoSPTrans />
      </View>
    );
  }

  // ---- Escolha do ponto de descida ----
  // Mostramos só os pontos que ainda estão à frente do usuário.
  const pontosAFrente = indiceAtual >= 0 ? paradas.slice(indiceAtual) : paradas;

  function renderParada({ item, index }) {
    const ehAtual = indiceAtual >= 0 && index === 0;
    return (
      <TouchableOpacity
        style={[styles.parada, ehAtual && styles.paradaAtual]}
        onPress={() => escolherDestino(item)}
        // O ponto onde o usuário já está não pode ser o ponto de descida.
        disabled={ehAtual}
        accessibilityLabel={`Descer em ${item.np}`}
      >
        <View style={[styles.bolinha, ehAtual && styles.bolinhaAtual]} />
        <View style={styles.paradaInfo}>
          <Text style={styles.paradaNome}>{item.np}</Text>
          {ehAtual ? <Text style={styles.voceEstaAqui}>Você está aqui</Text> : null}
          {!ehAtual && item.ed ? <Text style={styles.paradaEndereco}>{item.ed}</Text> : null}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <FlatList
      style={styles.tela}
      contentContainerStyle={styles.lista}
      data={pontosAFrente}
      keyExtractor={(item) => String(item.cp)}
      renderItem={renderParada}
      ListHeaderComponent={
        <View style={styles.cabecalho}>
          <Text style={styles.titulo}>Em qual ponto você vai descer?</Text>
          <Text style={styles.subtitulo}>
            Sentido {linha.destino}. Toque no ponto e avisamos quando ele estiver chegando.
          </Text>
        </View>
      }
      ListEmptyComponent={
        <Text style={styles.subtitulo}>A SPTrans não retornou pontos para esta linha.</Text>
      }
      ListFooterComponent={<CreditoSPTrans />}
    />
  );
}

const styles = StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: cores.fundo,
  },
  lista: {
    padding: 16,
  },
  cabecalho: {
    marginBottom: 12,
  },
  titulo: {
    color: cores.texto,
    fontSize: fontes.grande,
    fontWeight: 'bold',
  },
  subtitulo: {
    color: cores.textoSecundario,
    fontSize: fontes.normal,
    marginTop: 6,
    lineHeight: 22,
  },
  parada: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: cores.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  paradaAtual: {
    borderWidth: 2,
    borderColor: cores.sucesso,
  },
  bolinha: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: cores.destaque,
    marginRight: 14,
  },
  bolinhaAtual: {
    backgroundColor: cores.sucesso,
  },
  paradaInfo: {
    flex: 1,
  },
  paradaNome: {
    color: cores.texto,
    fontSize: fontes.normal,
    fontWeight: '700',
  },
  paradaEndereco: {
    color: cores.textoSecundario,
    fontSize: fontes.pequena,
    marginTop: 2,
  },
  voceEstaAqui: {
    color: cores.sucesso,
    fontSize: fontes.pequena,
    fontWeight: '700',
    marginTop: 2,
  },
  viagem: {
    padding: 20,
    justifyContent: 'center',
  },
  legenda: {
    color: cores.textoSecundario,
    fontSize: fontes.normal,
    textAlign: 'center',
  },
  destinoNome: {
    color: cores.texto,
    fontSize: fontes.grande,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  painel: {
    backgroundColor: cores.card,
    borderRadius: 20,
    paddingVertical: 28,
    alignItems: 'center',
  },
  painelChegando: {
    backgroundColor: cores.destaque,
  },
  painelValor: {
    color: cores.destaque,
    fontSize: 48,
    fontWeight: 'bold',
  },
  painelValorChegando: {
    color: cores.textoSobreDestaque,
  },
  painelLegenda: {
    color: cores.texto,
    fontSize: fontes.media,
    marginTop: 4,
  },
  painelLegendaChegando: {
    color: cores.textoSobreDestaque,
    fontWeight: '700',
  },
  explicacao: {
    color: cores.textoSecundario,
    fontSize: fontes.normal,
    textAlign: 'center',
    marginVertical: 18,
    lineHeight: 22,
  },
});
