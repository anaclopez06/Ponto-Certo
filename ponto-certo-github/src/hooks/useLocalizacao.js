// Hook que cuida de tudo sobre o GPS: pedir permissão, checar se o GPS
// está ligado e obter a posição (uma vez ou acompanhando o movimento).
//
// status possíveis:
//   'carregando'  -> pedindo permissão ou esperando o GPS
//   'negada'      -> o usuário não deu permissão de localização
//   'desligada'   -> a localização do celular está desligada
//   'ok'          -> temos a posição em "posicao"
//   'erro'        -> não foi possível obter a posição

import { useState, useEffect, useCallback, useRef } from 'react';
import * as Location from 'expo-location';

export default function useLocalizacao({ acompanhar = false } = {}) {
  const [status, setStatus] = useState('carregando');
  const [posicao, setPosicao] = useState(null);
  const [podePedirDeNovo, setPodePedirDeNovo] = useState(true);
  const assinatura = useRef(null);
  const montado = useRef(true);

  const iniciar = useCallback(async () => {
    setStatus('carregando');

    const permissao = await Location.requestForegroundPermissionsAsync();
    if (!permissao.granted) {
      setPodePedirDeNovo(permissao.canAskAgain);
      setStatus('negada');
      return;
    }

    const gpsLigado = await Location.hasServicesEnabledAsync();
    if (!gpsLigado) {
      setStatus('desligada');
      return;
    }

    try {
      // Mostra logo a última posição conhecida (de até 2 min atrás), se houver.
      // Assim a tela abre na hora, sem esperar o GPS "acordar"; a posição exata
      // chega em seguida e substitui esta.
      const recente = await Location.getLastKnownPositionAsync({ maxAge: 120000 }).catch(() => null);
      if (recente && montado.current) {
        setPosicao(recente.coords);
        setStatus('ok');
      }

      if (acompanhar) {
        assinatura.current?.remove();
        const novaAssinatura = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, distanceInterval: 15, timeInterval: 5000 },
          (local) => {
            setPosicao(local.coords);
            setStatus('ok');
          }
        );
        // Se o usuário saiu da tela enquanto o GPS ligava, desligamos na hora.
        if (!montado.current) {
          novaAssinatura.remove();
          return;
        }
        assinatura.current = novaAssinatura;
      } else {
        const local = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setPosicao(local.coords);
        setStatus('ok');
      }
    } catch {
      setStatus('erro');
    }
  }, [acompanhar]);

  useEffect(() => {
    montado.current = true;
    iniciar();
    // Ao sair da tela, para de acompanhar o GPS (economiza bateria).
    return () => {
      montado.current = false;
      assinatura.current?.remove();
      assinatura.current = null;
    };
  }, [iniciar]);

  return { status, posicao, podePedirDeNovo, tentarDeNovo: iniciar };
}
