import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { cores, fontes } from '../theme';

// Botão grande e fácil de tocar. variante: 'principal' | 'secundario' | 'perigo'
export default function Botao({ titulo, onPress, variante = 'principal', desativado = false }) {
  return (
    <TouchableOpacity
      style={[styles.botao, styles[variante], desativado && styles.desativado]}
      onPress={onPress}
      disabled={desativado}
      accessibilityRole="button"
      accessibilityLabel={titulo}
    >
      <Text style={[styles.texto, variante === 'principal' && styles.textoPrincipal]}>
        {titulo}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  botao: {
    minHeight: 52,
    borderRadius: 12,
    paddingHorizontal: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  principal: {
    backgroundColor: cores.destaque,
  },
  secundario: {
    backgroundColor: cores.cardDestaque,
    borderWidth: 1,
    borderColor: cores.borda,
  },
  perigo: {
    backgroundColor: cores.erro,
  },
  desativado: {
    opacity: 0.5,
  },
  texto: {
    color: cores.texto,
    fontSize: fontes.media,
    fontWeight: '700',
  },
  textoPrincipal: {
    color: cores.textoSobreDestaque,
  },
});
