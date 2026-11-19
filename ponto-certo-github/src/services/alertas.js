// Notificações locais (expo-notifications) + vibração (Vibration do React Native).
// São notificações geradas pelo próprio app, por isso funcionam no Expo Go.

import { Vibration, Alert, Linking } from 'react-native';
import * as Notifications from 'expo-notifications';

export const VIBRACAO_CURTA = [0, 400, 200, 400];
export const VIBRACAO_FORTE = [0, 800, 300, 800, 300, 800];

// Chamado uma vez, quando o app abre (App.js).
// No Android usamos o canal de notificações padrão do Expo Go: criar um canal
// próprio (setNotificationChannelAsync) falha em alguns aparelhos no Expo Go.
export function configurarNotificacoes() {
  // Mostra a notificação mesmo com o app aberto na tela.
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

// Pede permissão de notificação. Retorna true se o usuário permitiu.
// Se ele negou de vez, explica e oferece abrir as configurações do celular.
export async function garantirPermissaoDeNotificacao() {
  const atual = await Notifications.getPermissionsAsync();
  if (atual.granted) return true;

  if (atual.canAskAgain) {
    const resposta = await Notifications.requestPermissionsAsync();
    if (resposta.granted) return true;
  }

  Alert.alert(
    'Notificações desativadas',
    'Sem notificações você só recebe os avisos por vibração enquanto o app estiver aberto. Quer ativar nas configurações?',
    [
      { text: 'Agora não', style: 'cancel' },
      { text: 'Abrir configurações', onPress: () => Linking.openSettings() },
    ]
  );
  return false;
}

// Vibra e mostra uma notificação imediatamente.
export async function avisar(titulo, mensagem, padraoVibracao = VIBRACAO_CURTA) {
  Vibration.vibrate(padraoVibracao);

  try {
    await Notifications.scheduleNotificationAsync({
      content: { title: titulo, body: mensagem, sound: true },
      trigger: null,
    });
  } catch {
    // Sem permissão de notificação: a vibração já avisou o usuário.
  }
}
