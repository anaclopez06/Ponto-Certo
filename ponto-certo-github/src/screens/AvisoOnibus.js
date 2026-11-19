// "Meu ônibus está chegando" + "Hora de sair".
// O usuário escolhe como quer ser avisado e o app consulta a SPTrans a cada
// 30 segundos. Quando chega a hora, o celular vibra e mostra uma notificação.
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import useLocalizacao from '../hooks/useLocalizacao';
import EstadoLocalizacao from '../components/EstadoLocalizacao';
import CreditoSPTrans from '../components/CreditoSPTrans';
import Botao from '../components/Botao';
import { buscarPrevisaoDaLinhaNaParada } from '../services/olhoVivo';
import { avisar, garantirPermissaoDeNotificacao } from '../services/alertas';
import { organizarPrevisao } from '../utils/previsao';
import { distanciaEmMetros, formatarDistancia, minutosCaminhando } from '../utils/geo';
import { textoMinutos } from '../utils/tempo';
import { cores, fontes } from '../theme';

const INTERVALO_VERIFICACAO_MS = 30000;
const OPCOES_DE_MINUTOS = [2, 5, 10];

const MODOS = {
  chegada: {
    titulo: 'Ônibus perto do ponto',
    descricao: 'Aviso quando o ônibus estiver a poucos minutos do ponto.',
    legendaMinutos: 'Avisar quando faltar',
  },
  sair: {
    titulo: 'Hora de sair',
    descricao: 'Conto o tempo que você leva a pé até o ponto e aviso a hora de sair.',
    legendaMinutos: 'Avisar com uma folga de',
  },
};

export default function AvisoOnibus({ route }) {
  const { parada, linha } = route.params;
  const gps = useLocalizacao({ acompanhar: true });

  const [modo, setModo] = useState('chegada');
  const [minutosAntes, setMinutosAntes] = useState(5);
  const [monitorando, setMonitorando] = useState(false);
  const [proximo, setProximo] = useState(null);
  const [horaConsulta, setHoraConsulta] = useState(null);
  const [erro, setErro] = useState(null);
  const [avisoEnviado, setAvisoEnviado] = useState(null);

  const distancia = gps.posicao
    ? distanciaEmMetros(gps.posicao.latitude, gps.posicao.longitude, parada.py, parada.px)
    : null;
  const minutosAPe = distancia != null ? minutosCaminhando(distancia) : 0;

  // A verificação roda dentro de um setInterval. Guardamos os valores atuais
  // em uma ref para o intervalo sempre enxergar a posição e as opções mais novas.
  const atual = useRef({});
  atual.current = { modo, minutosAntes, minutosAPe };

  // podeAvisar = false só consulta e mostra o próximo ônibus, sem avisar.
  const verificar = useCallback(async (podeAvisar = true) => {
    try {
      const resposta = await buscarPrevisaoDaLinhaNaParada(parada.cp, linha.codigo);
      const linhaAtual = organizarPrevisao(resposta).find((l) => l.codigo === linha.codigo);
      const { modo: modoAtual, minutosAntes: limite, minutosAPe: aPe } = atual.current;

      // No modo "hora de sair", ignoramos ônibus que o usuário não alcança mais a pé.
      const onibus = (linhaAtual?.onibus ?? []).find(
        (o) => modoAtual === 'chegada' || o.minutos >= aPe
      );

      setHoraConsulta(resposta?.hr ?? null);
      setProximo(onibus ?? null);
      setErro(null);
      if (!onibus || !podeAvisar) return;

      if (modoAtual === 'chegada' && onibus.minutos <= limite) {
        await avisar(
          `🚌 ${linha.letreiro} chegando!`,
          `O ônibus chega ao ponto ${parada.np} em ${textoMinutos(onibus.minutos)}.`
        );
        setAvisoEnviado(`Avisamos: o ${linha.letreiro} chega em ${textoMinutos(onibus.minutos)}.`);
        setMonitorando(false);
      }

      if (modoAtual === 'sair' && onibus.minutos - aPe <= limite) {
        await avisar(
          '🚶 Hora de sair!',
          `O ${linha.letreiro} chega em ${textoMinutos(onibus.minutos)} e você leva ~${aPe} min a pé até o ponto.`
        );
        setAvisoEnviado(`Avisamos: hora de sair para pegar o ${linha.letreiro}.`);
        setMonitorando(false);
      }
    } catch (e) {
      setErro(e.message);
    }
  }, [parada, linha]);

  // Ao abrir a tela, já mostra quando chega o próximo ônibus.
  useEffect(() => {
    verificar(false);
  }, [verificar]);

  useEffect(() => {
    if (!monitorando) return undefined;
    verificar();
    const intervalo = setInterval(verificar, INTERVALO_VERIFICACAO_MS);
    return () => clearInterval(intervalo);
  }, [monitorando, verificar]);

  async function comecar() {
    await garantirPermissaoDeNotificacao();
    setAvisoEnviado(null);
    setMonitorando(true);
  }

  if (gps.status !== 'ok') {
    return <EstadoLocalizacao {...gps} />;
  }

  return (
    <ScrollView style={styles.tela} contentContainerStyle={styles.conteudo}>
      <View style={styles.topo}>
        <View style={styles.letreiro}>
          <Text style={styles.letreiroTexto}>{linha.letreiro}</Text>
        </View>
        <View style={styles.topoTexto}>
          <Text style={styles.destino}>{linha.destino}</Text>
          <Text style={styles.ponto}>no ponto {parada.np}</Text>
        </View>
      </View>

      <View style={styles.painel}>
        <Text style={styles.painelLegenda}>Próximo ônibus</Text>
        <Text style={styles.painelValor}>
          {proximo ? textoMinutos(proximo.minutos) : monitorando ? '...' : '—'}
        </Text>
        {proximo?.acessivel ? <Text style={styles.acessivel}>♿ Veículo acessível</Text> : null}
        <Text style={styles.painelInfo}>
          Você está a {formatarDistancia(distancia)} do ponto (~{minutosAPe} min a pé)
        </Text>
        {horaConsulta ? (
          <Text style={styles.painelHora}>Última consulta às {horaConsulta}</Text>
        ) : null}
        {erro ? <Text style={styles.erro}>{erro}</Text> : null}
      </View>

      {avisoEnviado ? (
        <View style={styles.sucesso}>
          <Text style={styles.sucessoTexto}>✓ {avisoEnviado}</Text>
        </View>
      ) : null}

      <Text style={styles.secao}>Como você quer ser avisado?</Text>
      {Object.entries(MODOS).map(([chave, info]) => (
        <TouchableOpacity
          key={chave}
          style={[styles.opcao, modo === chave && styles.opcaoAtiva]}
          onPress={() => setModo(chave)}
          disabled={monitorando}
          accessibilityRole="radio"
          accessibilityState={{ selected: modo === chave }}
        >
          <Text style={styles.opcaoTitulo}>{info.titulo}</Text>
          <Text style={styles.opcaoDescricao}>{info.descricao}</Text>
        </TouchableOpacity>
      ))}

      <Text style={styles.secao}>{MODOS[modo].legendaMinutos}</Text>
      <View style={styles.chips}>
        {OPCOES_DE_MINUTOS.map((minutos) => (
          <TouchableOpacity
            key={minutos}
            style={[styles.chip, minutosAntes === minutos && styles.chipAtivo]}
            onPress={() => setMinutosAntes(minutos)}
            disabled={monitorando}
          >
            <Text style={[styles.chipTexto, minutosAntes === minutos && styles.chipTextoAtivo]}>
              {minutos} min
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {monitorando ? (
        <>
          <Text style={styles.monitorando}>
            Monitorando... mantenha o app aberto. Consultamos a SPTrans a cada 30 segundos.
          </Text>
          <Botao titulo="Parar aviso" variante="perigo" onPress={() => setMonitorando(false)} />
        </>
      ) : (
        <Botao titulo="Começar a monitorar" onPress={comecar} />
      )}

      <CreditoSPTrans />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: cores.fundo,
  },
  conteudo: {
    padding: 16,
  },
  topo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  letreiro: {
    backgroundColor: cores.destaque,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 12,
  },
  letreiroTexto: {
    color: cores.textoSobreDestaque,
    fontSize: fontes.media,
    fontWeight: 'bold',
  },
  topoTexto: {
    flex: 1,
  },
  destino: {
    color: cores.texto,
    fontSize: fontes.media,
    fontWeight: '700',
  },
  ponto: {
    color: cores.textoSecundario,
    fontSize: fontes.normal,
  },
  painel: {
    backgroundColor: cores.card,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
  },
  painelLegenda: {
    color: cores.textoSecundario,
    fontSize: fontes.normal,
  },
  painelValor: {
    color: cores.destaque,
    fontSize: fontes.enorme,
    fontWeight: 'bold',
    marginVertical: 4,
  },
  acessivel: {
    color: cores.sucesso,
    fontSize: fontes.normal,
    fontWeight: '600',
  },
  painelInfo: {
    color: cores.texto,
    fontSize: fontes.normal,
    marginTop: 8,
    textAlign: 'center',
  },
  painelHora: {
    color: cores.textoSecundario,
    fontSize: fontes.pequena,
    marginTop: 4,
  },
  erro: {
    color: cores.erro,
    fontSize: fontes.normal,
    marginTop: 8,
    textAlign: 'center',
  },
  sucesso: {
    backgroundColor: cores.sucesso,
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
  },
  sucessoTexto: {
    color: cores.textoSobreDestaque,
    fontSize: fontes.normal,
    fontWeight: '700',
  },
  secao: {
    color: cores.texto,
    fontSize: fontes.media,
    fontWeight: '700',
    marginTop: 22,
    marginBottom: 8,
  },
  opcao: {
    backgroundColor: cores.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  opcaoAtiva: {
    borderColor: cores.destaque,
  },
  opcaoTitulo: {
    color: cores.texto,
    fontSize: fontes.normal,
    fontWeight: '700',
  },
  opcaoDescricao: {
    color: cores.textoSecundario,
    fontSize: fontes.pequena,
    marginTop: 2,
  },
  chips: {
    flexDirection: 'row',
  },
  chip: {
    flex: 1,
    backgroundColor: cores.card,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginRight: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  chipAtivo: {
    borderColor: cores.destaque,
    backgroundColor: cores.cardDestaque,
  },
  chipTexto: {
    color: cores.textoSecundario,
    fontSize: fontes.normal,
    fontWeight: '600',
  },
  chipTextoAtivo: {
    color: cores.texto,
  },
  monitorando: {
    color: cores.alerta,
    fontSize: fontes.normal,
    textAlign: 'center',
    marginTop: 20,
  },
});
