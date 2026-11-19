// Telas de estado reaproveitadas pelo app: carregando e erro.
import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import Botao from './Botao';
import { cores, fontes } from '../theme';

export function Carregando({ mensagem }) {
  return (
    <View style={styles.centro}>
      <ActivityIndicator size="large" color={cores.destaque} />
      <Text style={styles.texto}>{mensagem}</Text>
    </View>
  );
}

export function MensagemErro({ titulo = 'Algo deu errado', mensagem, onTentarDeNovo, acoes }) {
  return (
    <View style={styles.centro}>
      <Text style={styles.titulo}>{titulo}</Text>
      <Text style={styles.texto}>{mensagem}</Text>
      {onTentarDeNovo ? <Botao titulo="Tentar de novo" onPress={onTentarDeNovo} /> : null}
      {acoes}
    </View>
  );
}

const styles = StyleSheet.create({
  centro: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'stretch',
    padding: 24,
    backgroundColor: cores.fundo,
  },
  titulo: {
    color: cores.texto,
    fontSize: fontes.grande,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  texto: {
    color: cores.textoSecundario,
    fontSize: fontes.normal,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 10,
    lineHeight: 22,
  },
});
