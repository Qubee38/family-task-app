import React, { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useFamily } from '../contexts/FamilyContext';
import { RootStackParamList } from '../types/navigation.types';
import AuthNavigator from './AuthNavigator';
import BottomTabNavigator from './BottomTabNavigator';
import FamilyListScreen from '../screens/family/FamilyListScreen';
import CreateFamilyScreen from '../screens/family/CreateFamilyScreen';
import JoinFamilyScreen from '../screens/family/JoinFamilyScreen';
import FamilyManageScreen from '../screens/family/FamilyManageScreen';
import ItemFormScreen from '../screens/item/ItemFormScreen';
import ItemDetailScreen from '../screens/item/ItemDetailScreen';
import CategoryListScreen from '../screens/item/CategoryListScreen';
import CreateEditCategoryScreen from '../screens/item/CreateEditCategoryScreen';
import { logger } from '../utils/logger';

const Stack = createStackNavigator<RootStackParamList>();

/**
 * AppNavigator
 * アプリ全体のナビゲーション構造を管理
 */
export default function AppNavigator() {
  const { user, loading: authLoading } = useAuth();
  const { selectedFamily, families, loading: familyLoading } = useFamily();
  const navigationRef = useRef<any>(null);

  // selectedFamilyの変化を監視して画面遷移
  useEffect(() => {
    if (!user) return;
    if (familyLoading) return;
    if (!navigationRef.current) return;

    const currentRoute = navigationRef.current.getCurrentRoute()?.name;
    
    if (selectedFamily) {
      // 家族が選択されている場合
      logger.info(`🔹 selectedFamily検出、Mainへ遷移: ${selectedFamily.name}`);
      
      if (currentRoute === 'CreateFamily' || currentRoute === 'JoinFamily') {
        navigationRef.current.navigate('Main');
      } else if (currentRoute === 'FamilyList') {
        navigationRef.current.navigate('Main');
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
        // ログイン後: 全画面を登録
        <Stack.Navigator 
          screenOptions={{ headerShown: false }}
          initialRouteName={selectedFamily ? 'Main' : 'FamilyList'}
        >
          {/* 家族選択前の画面 */}
          <Stack.Screen name="FamilyList" component={FamilyListScreen} />
          <Stack.Screen name="CreateFamily" component={CreateFamilyScreen} />
          <Stack.Screen name="JoinFamily" component={JoinFamilyScreen} />
          
          {/* 家族選択後の画面 - BottomTabNavigator */}
          <Stack.Screen name="Main" component={BottomTabNavigator} />
          <Stack.Screen name="FamilyManage" component={FamilyManageScreen} />
          
          {/* アイテム管理画面 */}
          <Stack.Screen name="ItemForm" component={ItemFormScreen} />
          <Stack.Screen name="ItemDetail" component={ItemDetailScreen} />
          
          {/* カテゴリ管理画面 */}
          <Stack.Screen name="CategoryList" component={CategoryListScreen} />
          <Stack.Screen name="CreateEditCategory" component={CreateEditCategoryScreen} />
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