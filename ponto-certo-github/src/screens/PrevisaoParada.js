// Painel "próximos ônibus" de um ponto: todas as linhas que passam ali e
// em quantos minutos cada ônibus chega. Atualiza sozinho a cada 30 segundos.
import React, { useState, useCallback, useLayoutEffect } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { buscarPrevisaoDaParada } from '../services/olhoVivo';
import { Carregando, MensagemErro } from '../components/Estados';
import CreditoSPTrans from '../components/CreditoSPTrans';
import Botao from '../components/Botao';
import { formatarDistancia, minutosCaminhando } from '../utils/geo';
import { textoMinutos } from '../utils/tempo';
import { organizarPrevisao } from '../utils/previsao';
import { cores, fontes } from '../theme';

const INTERVALO_ATUALIZACAO_MS = 30000;

function DicaHoraDeSair({ minutosOnibus, minutosAPe }) {
  const folga = minutosOnibus - minutosAPe;
  let texto;
  let cor;
  if (folga < 0) {
    texto = 'A pé você não chega a tempo deste';
    cor = cores.erro;
  } else if (folga <= 2) {
    texto = 'Saia agora para pegar este ônibus';
    cor = cores.alerta;
  } else {
    texto = `Dá para sair daqui a ${folga} min`;
    cor = cores.sucesso;
  }
  return <Text style={[styles.dica, { color: cor }]}>{texto}</Text>;
}

export default function PrevisaoParada({ route, navigation }) {
  const { parada } = route.params;
  const minutosAPe = parada.distancia != null ? minutosCaminhando(parada.distancia) : null;

  const [linhas, setLinhas] = useState([]);
  const [horaConsulta, setHoraConsulta] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  useLayoutEffect(() => {
    navigation.setOptions({ title: parada.np });
  }, [navigation, parada.np]);

  const carregar = useCallback(async () => {
    try {
      const resposta = await buscarPrevisaoDaParada(parada.cp);
      setLinhas(organizarPrevisao(resposta));
      setHoraConsulta(resposta?.hr ?? null);
      setErro(null);
    } catch (e) {
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  }, [parada.cp]);

  // Atualiza enquanto a tela estiver aberta; para quando o usuário sai dela.
  useFocusEffect(
    useCallback(() => {
      carregar();
      const intervalo = setInterval(carregar, INTERVALO_ATUALIZACAO_MS);
      return () => clearInterval(intervalo);
    }, [carregar])
  );

  if (carregando) {
    return <Carregando mensagem="Consultando os próximos ônibus..." />;
  }

  if (erro && linhas.length === 0) {
    return <MensagemErro mensagem={erro} onTentarDeNovo={carregar} />;
  }

  function renderLinha({ item }) {
    const proximo = item.onibus[0];
    return (
      <View style={styles.card}>
        <View style={styles.cardTopo}>
          <View style={styles.letreiro}>
            <Text style={styles.letreiroTexto}>{item.letreiro}</Text>
          </View>
          <Text style={styles.destino} numberOfLines={2}>
            {item.destino}
          </Text>
        </View>

        <View style={styles.chegadas}>
          {item.onibus.slice(0, 3).map((onibus, indice) => (
            <View
              key={onibus.prefixo}
              style={[styles.chegada, indice === 0 && styles.chegadaPrincipal]}
            >
              <Text style={[styles.chegadaTempo, indice === 0 && styles.chegadaTempoPrincipal]}>
                {textoMinutos(onibus.minutos)}
              </Text>
              {onibus.acessivel ? (
                <Text style={styles.acessivel} accessibilityLabel="ônibus acessível">
                  ♿
                </Text>
              ) : null}
            </View>
          ))}
        </View>

        {minutosAPe != null ? (
          <DicaHoraDeSair minutosOnibus={proximo.minutos} minutosAPe={minutosAPe} />
        ) : null}

        <View style={styles.acoes}>
          <View style={styles.acao}>
            <Botao
              titulo="Me avise"
              onPress={() => navigation.navigate('AvisoOnibus', { parada, linha: item })}
            />
          </View>
          <View style={styles.acao}>
            <Botao
              titulo="Vou embarcar"
              variante="secundario"
              onPress={() => navigation.navigate('DescerNoPonto', { linha: item })}
            />
          </View>
        </View>
      </View>
    );
  }

  const cabecalho = (
    <View style={styles.cabecalho}>
      {parada.ed ? <Text style={styles.endereco}>{parada.ed}</Text> : null}
      {minutosAPe != null ? (
        <Text style={styles.caminhada}>
          Você está a {formatarDistancia(parada.distancia)} (~{minutosAPe} min a pé)
        </Text>
      ) : null}
      {horaConsulta ? (
        <Text style={styles.atualizado}>Atualizado às {horaConsulta} · a cada 30 s</Text>
      ) : null}
    </View>
  );

  return (
    <FlatList
      style={styles.tela}
      contentContainerStyle={styles.lista}
      data={linhas}
      keyExtractor={(item) => String(item.codigo)}
      renderItem={renderLinha}
      ListHeaderComponent={cabecalho}
      ListEmptyComponent={
        <Text style={styles.vazio}>
          Nenhum ônibus com previsão para este ponto agora. A lista atualiza sozinha.
        </Text>
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
    marginBottom: 14,
  },
  endereco: {
    color: cores.texto,
    fontSize: fontes.normal,
  },
  caminhada: {
    color: cores.destaque,
    fontSize: fontes.normal,
    fontWeight: '600',
    marginTop: 4,
  },
  atualizado: {
    color: cores.textoSecundario,
    fontSize: fontes.pequena,
    marginTop: 4,
  },
  card: {
    backgroundColor: cores.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  cardTopo: {
    flexDirection: 'row',
    alignItems: 'center',
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
  destino: {
    flex: 1,
    color: cores.texto,
    fontSize: fontes.normal,
    fontWeight: '600',
  },
  chegadas: {
    flexDirection: 'row',
    marginTop: 12,
  },
  chegada: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: cores.cardDestaque,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  chegadaPrincipal: {
    borderWidth: 2,
    borderColor: cores.destaque,
  },
  chegadaTempo: {
    color: cores.textoSecundario,
    fontSize: fontes.normal,
    fontWeight: '600',
  },
  chegadaTempoPrincipal: {
    color: cores.texto,
    fontSize: fontes.media,
    fontWeight: 'bold',
  },
  acessivel: {
    fontSize: fontes.normal,
    marginLeft: 6,
  },
  dica: {
    fontSize: fontes.normal,
    fontWeight: '600',
    marginTop: 10,
  },
  acoes: {
    flexDirection: 'row',
    marginHorizontal: -4,
  },
  acao: {
    flex: 1,
    marginHorizontal: 4,
  },
  vazio: {
    color: cores.textoSecundario,
    fontSize: fontes.normal,
    textAlign: 'center',
    marginTop: 30,
    lineHeight: 22,
  },
});
