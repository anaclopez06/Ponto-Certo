// Tela inicial: usa o GPS para listar os pontos de ônibus perto do usuário.
// Também permite buscar um ponto pelo nome ou endereço.
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  Keyboard,
} from 'react-native';
import useLocalizacao from '../hooks/useLocalizacao';
import EstadoLocalizacao from '../components/EstadoLocalizacao';
import CreditoSPTrans from '../components/CreditoSPTrans';
import { Carregando, MensagemErro } from '../components/Estados';
import { buscarParadasProximas, ordenarPorDistancia } from '../services/paradasProximas';
import { buscarParadasPorTexto } from '../services/buscaDeParadas';
import { formatarDistancia, minutosCaminhando } from '../utils/geo';
import { cores, fontes } from '../theme';

export default function PontosProximos({ navigation }) {
  const gps = useLocalizacao();
  const { posicao } = gps;

  const [paradas, setParadas] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(null);
  const [termo, setTermo] = useState('');
  const [resultadoDeBusca, setResultadoDeBusca] = useState(false);

  // O cálculo dos pontos próximos é feito no próprio celular (é instantâneo).
  const carregarProximas = useCallback(() => {
    if (!posicao) return;
    setErro(null);
    setResultadoDeBusca(false);
    setParadas(buscarParadasProximas(posicao.latitude, posicao.longitude));
  }, [posicao]);

  useEffect(() => {
    carregarProximas();
  }, [carregarProximas]);

  async function pesquisar() {
    const texto = termo.trim();
    Keyboard.dismiss();
    if (!texto) {
      carregarProximas();
      return;
    }

    setCarregando(true);
    setErro(null);
    try {
      const lista = await buscarParadasPorTexto(texto);
      setParadas(ordenarPorDistancia(lista, posicao.latitude, posicao.longitude).slice(0, 30));
      setResultadoDeBusca(true);
    } catch (e) {
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  }

  function limparBusca() {
    setTermo('');
    carregarProximas();
  }

  if (gps.status !== 'ok') {
    return <EstadoLocalizacao {...gps} />;
  }

  function renderParada({ item }) {
    const minutos = minutosCaminhando(item.distancia);
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('PrevisaoParada', { parada: item })}
        accessibilityLabel={`Ponto ${item.np}, a ${formatarDistancia(item.distancia)}`}
      >
        <View style={styles.distancia}>
          <Text style={styles.distanciaValor}>{formatarDistancia(item.distancia)}</Text>
          <Text style={styles.distanciaLegenda}>{minutos} min a pé</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.nome} numberOfLines={2}>
            {item.np}
          </Text>
          {item.ed ? (
            <Text style={styles.endereco} numberOfLines={1}>
              {item.ed}
            </Text>
          ) : null}
        </View>
        <Text style={styles.seta}>›</Text>
      </TouchableOpacity>
    );
  }

  const cabecalho = (
    <View>
      <View style={styles.busca}>
        <TextInput
          style={styles.campo}
          placeholder="Buscar ponto por nome ou rua"
          placeholderTextColor={cores.textoSecundario}
          value={termo}
          onChangeText={setTermo}
          onSubmitEditing={pesquisar}
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.botaoBusca} onPress={pesquisar}>
          <Text style={styles.botaoBuscaTexto}>Buscar</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tituloLinha}>
        <Text style={styles.titulo}>
          {resultadoDeBusca ? `Resultados para "${termo}"` : 'Pontos perto de você'}
        </Text>
        {resultadoDeBusca ? (
          <TouchableOpacity onPress={limparBusca}>
            <Text style={styles.link}>Ver próximos</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );

  let vazio;
  if (carregando) {
    vazio = <Carregando mensagem="Procurando pontos de ônibus..." />;
  } else if (erro) {
    vazio = <MensagemErro mensagem={erro} onTentarDeNovo={carregarProximas} />;
  } else {
    vazio = (
      <Text style={styles.vazio}>
        {resultadoDeBusca
          ? 'Nenhum ponto encontrado. Tente outro nome de rua ou de um lugar conhecido.'
          : 'Nenhum ponto de ônibus a até 800 m de você. Busque por um endereço acima.'}
      </Text>
    );
  }

  return (
    <FlatList
      style={styles.tela}
      contentContainerStyle={styles.lista}
      data={carregando || erro ? [] : paradas}
      keyExtractor={(item) => String(item.cp)}
      renderItem={renderParada}
      ListHeaderComponent={cabecalho}
      ListEmptyComponent={vazio}
      ListFooterComponent={<CreditoSPTrans />}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={false}
          onRefresh={gps.tentarDeNovo}
          tintColor={cores.destaque}
          colors={[cores.destaque]}
        />
      }
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
    flexGrow: 1,
  },
  busca: {
    flexDirection: 'row',
    marginBottom: 18,
  },
  campo: {
    flex: 1,
    backgroundColor: cores.card,
    color: cores.texto,
    fontSize: fontes.normal,
    borderRadius: 12,
    paddingHorizontal: 14,
    minHeight: 50,
    borderWidth: 1,
    borderColor: cores.borda,
  },
  botaoBusca: {
    marginLeft: 8,
    backgroundColor: cores.destaque,
    borderRadius: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  botaoBuscaTexto: {
    color: cores.textoSobreDestaque,
    fontWeight: '700',
    fontSize: fontes.normal,
  },
  tituloLinha: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  titulo: {
    color: cores.texto,
    fontSize: fontes.grande,
    fontWeight: 'bold',
    flexShrink: 1,
  },
  link: {
    color: cores.destaque,
    fontSize: fontes.normal,
    fontWeight: '600',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: cores.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  distancia: {
    width: 78,
    alignItems: 'center',
    marginRight: 12,
  },
  distanciaValor: {
    color: cores.destaque,
    fontSize: fontes.media,
    fontWeight: 'bold',
  },
  distanciaLegenda: {
    color: cores.textoSecundario,
    fontSize: fontes.pequena,
  },
  cardInfo: {
    flex: 1,
  },
  nome: {
    color: cores.texto,
    fontSize: fontes.media,
    fontWeight: '700',
  },
  endereco: {
    color: cores.textoSecundario,
    fontSize: fontes.pequena,
    marginTop: 2,
  },
  seta: {
    color: cores.textoSecundario,
    fontSize: 30,
    marginLeft: 8,
  },
  vazio: {
    color: cores.textoSecundario,
    fontSize: fontes.normal,
    textAlign: 'center',
    marginTop: 30,
    lineHeight: 22,
  },
});
