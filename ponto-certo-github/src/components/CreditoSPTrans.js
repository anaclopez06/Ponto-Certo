// Crédito obrigatório: os dados de ônibus são da SPTrans.
import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { cores, fontes } from '../theme';

export default function CreditoSPTrans() {
  return (
    <Text style={styles.credito}>
      Dados em tempo real: SPTrans · API Olho Vivo{'\n'}Endereços © colaboradores do OpenStreetMap
    </Text>
  );
}

const styles = StyleSheet.create({
  credito: {
    color: cores.textoSecundario,
    fontSize: fontes.pequena,
    textAlign: 'center',
    paddingVertical: 14,
  },
});
