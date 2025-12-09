import React from 'react';
import { StatusBar } from 'react-native';
import { AuthProvider } from './src/contexts/AuthContext';
import { FamilyProvider } from './src/contexts/FamilyContext';
import { ItemProvider } from './src/contexts/ItemContext';
import AppNavigator from './src/navigation/AppNavigator';

// firebase.ts で自動的に initFirebase() が実行される

export default function App() {
  return (
    <AuthProvider>
      <FamilyProvider>
        <ItemProvider>
          <StatusBar barStyle="dark-content" />
          <AppNavigator />
        </ItemProvider>
      </FamilyProvider>
    </AuthProvider>
  );
}