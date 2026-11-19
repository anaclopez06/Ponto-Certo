import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import PontosProximos from './src/screens/PontosProximos';
import PrevisaoParada from './src/screens/PrevisaoParada';
import AvisoOnibus from './src/screens/AvisoOnibus';
import DescerNoPonto from './src/screens/DescerNoPonto';
import { configurarNotificacoes } from './src/services/alertas';
import { cores } from './src/theme';

const Stack = createNativeStackNavigator();

const tema = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: cores.destaque,
    background: cores.fundo,
    card: cores.fundo,
    text: cores.texto,
    border: cores.borda,
  },
};

export default function App() {
  useEffect(() => {
    configurarNotificacoes();
  }, []);

  return (
    <NavigationContainer theme={tema}>
      <StatusBar style="light" />
      <Stack.Navigator
        initialRouteName="PontosProximos"
        screenOptions={{
          headerStyle: { backgroundColor: cores.fundo },
          headerTintColor: cores.destaque,
          headerTitleStyle: { color: cores.texto, fontWeight: 'bold' },
        }}
      >
        <Stack.Screen
          name="PontosProximos"
          component={PontosProximos}
          options={{ title: 'Ponto Certo' }}
        />
        <Stack.Screen
          name="PrevisaoParada"
          component={PrevisaoParada}
          options={{ title: 'Próximos ônibus' }}
        />
        <Stack.Screen
          name="AvisoOnibus"
          component={AvisoOnibus}
          options={{ title: 'Me avise' }}
        />
        <Stack.Screen
          name="DescerNoPonto"
          component={DescerNoPonto}
          options={{ title: 'Desça no ponto certo' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
