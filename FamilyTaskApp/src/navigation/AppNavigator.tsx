import React, { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useFamily } from '../contexts/FamilyContext';
import AuthNavigator from './AuthNavigator';
import HomeScreen from '../screens/HomeScreen';
import FamilyListScreen from '../screens/family/FamilyListScreen';
import CreateFamilyScreen from '../screens/family/CreateFamilyScreen';
import JoinFamilyScreen from '../screens/family/JoinFamilyScreen';
import FamilyManageScreen from '../screens/family/FamilyManageScreen';
import { logger } from '../utils/logger';

const Stack = createStackNavigator();

export default function AppNavigator() {
  const { user, loading: authLoading } = useAuth();
  const { selectedFamily, families, loading: familyLoading } = useFamily();
  const navigationRef = useRef<any>(null);

  // selectedFamilyの変化を監視して画面遷移
  useEffect(() => {
    if (!user) return; // ログインしていない場合は何もしない
    if (familyLoading) return; // 家族情報ローディング中は何もしない
    if (!navigationRef.current) return; // ナビゲーションが準備できていない

    const currentRoute = navigationRef.current.getCurrentRoute()?.name;
    
    if (selectedFamily) {
      // 家族が選択されている場合
      logger.info(`🔹 selectedFamily検出、HomeScreenへ遷移: ${selectedFamily.name}`);
      
      // CreateFamilyScreen または JoinFamilyScreen からの遷移の場合のみ
      if (currentRoute === 'CreateFamily' || currentRoute === 'JoinFamily') {
        navigationRef.current.navigate('Home');
      } else if (currentRoute === 'FamilyList') {
        // FamilyListScreen で家族を選択した場合も遷移
        navigationRef.current.navigate('Home');
      }
    } else {
      // 家族が選択されていない場合
      if (currentRoute !== 'FamilyList' && currentRoute !== 'CreateFamily' && currentRoute !== 'JoinFamily') {
        logger.info('🔹 selectedFamilyなし、FamilyListScreenへ遷移');
        navigationRef.current.navigate('FamilyList');
      }
    }
  }, [selectedFamily, user, familyLoading]);

  // 認証状態のローディング中
  if (authLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      {!user ? (
        // ログイン前: AuthNavigator
        <AuthNavigator />
      ) : (
        // ログイン後: 全画面を登録（初期画面は selectedFamily の有無で決定）
        <Stack.Navigator 
          screenOptions={{ headerShown: false }}
          initialRouteName={selectedFamily ? 'Home' : 'FamilyList'}
        >
          {/* 家族選択前の画面 */}
          <Stack.Screen name="FamilyList" component={FamilyListScreen} />
          <Stack.Screen name="CreateFamily" component={CreateFamilyScreen} />
          <Stack.Screen name="JoinFamily" component={JoinFamilyScreen} />
          
          {/* 家族選択後の画面 */}
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="FamilyManage" component={FamilyManageScreen} />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
});