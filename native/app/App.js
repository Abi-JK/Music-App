import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import BottomTabs from './src/navigation/BottomTabs';
import PlayerScreen from './src/screens/PlayerScreen';

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: '#121212' },
        }}
      >
        <Stack.Screen name="MainTabs" component={BottomTabs} />
        <Stack.Screen name="Player" component={PlayerScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

