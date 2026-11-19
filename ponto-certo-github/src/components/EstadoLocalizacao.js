// Mostra o que fazer quando o GPS ainda não está pronto: carregando,
// permissão negada, localização desligada ou erro.
// Quando o GPS está ok, não mostra nada (retorna null).
import React from 'react';
import { Linking } from 'react-native';
import { Carregando, MensagemErro } from './Estados';
import Botao from './Botao';

export default function EstadoLocalizacao({ status, podePedirDeNovo, tentarDeNovo }) {
  if (status === 'carregando') {
    return <Carregando mensagem="Buscando sua localização..." />;
  }

  if (status === 'negada') {
    return (
      <MensagemErro
        titulo="Precisamos da sua localização"
        mensagem="O app usa o GPS para achar os pontos de ônibus perto de você e para avisar quando você estiver chegando ao seu ponto. Sua localização não sai do seu celular."
        onTentarDeNovo={podePedirDeNovo ? tentarDeNovo : null}
        acoes={
          podePedirDeNovo ? null : (
            <Botao titulo="Abrir configurações" onPress={() => Linking.openSettings()} />
          )
        }
      />
    );
  }

  if (status === 'desligada') {
    return (
      <MensagemErro
        titulo="Localização desligada"
        mensagem="Ligue a localização (GPS) do celular e toque em tentar de novo."
        onTentarDeNovo={tentarDeNovo}
      />
    );
  }

  if (status === 'erro') {
    return (
      <MensagemErro
        mensagem="Não conseguimos obter sua posição. Vá para um lugar mais aberto e tente de novo."
        onTentarDeNovo={tentarDeNovo}
      />
    );
  }

  return null;
}
