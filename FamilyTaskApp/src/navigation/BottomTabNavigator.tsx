import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';
import { BottomTabParamList } from '../types/navigation.types';
import HomeScreen from '../screens/HomeScreen';
import ItemListScreen from '../screens/item/ItemListScreen';

const Tab = createBottomTabNavigator<BottomTabParamList>();

/**
 * 分析画面のプレースホルダー
 * Phase 10以降で実装予定
 */
function AnalyticsScreen() {
  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderText}>📊</Text>
      <Text style={styles.placeholderTitle}>分析機能</Text>
      <Text style={styles.placeholderSubtitle}>準備中です</Text>
    </View>
  );
}

/**
 * BottomTabNavigator
 * ホーム、一覧、分析の3タブを提供
 */
export default function BottomTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2196F3',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: '#e0e0e0',
          paddingVertical: 8,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 14,
          fontWeight: '600',
          marginLeft: 8,
        },
        tabBarIconStyle: {
          marginRight: 0,
        },
        tabBarItemStyle: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
        },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          tabBarLabel: 'ホーム',
          tabBarIcon: () => (
            <Text style={styles.tabIcon}>🏠</Text>
          ),
        }}
      />
      <Tab.Screen
        name="ItemListTab"
        component={ItemListScreen}
        options={{
          tabBarLabel: '一覧',
          tabBarIcon: () => (
            <Text style={styles.tabIcon}>📋</Text>
          ),
        }}
        initialParams={{ 
          defaultView: 'calendar',
          selectAll: true,
          type: undefined  // typeをクリア
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            // 下部タブ押下時にパラメータをリセット
            navigation.setParams({
              selectAll: true,
              type: undefined
            });
          },
        })}
      />
      <Tab.Screen
        name="AnalyticsTab"
        component={AnalyticsScreen}
        options={{
          tabBarLabel: '分析',
          tabBarIcon: () => (
            <Text style={styles.tabIcon}>📊</Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabIcon: {
    fontSize: 20,
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  placeholderText: {
    fontSize: 64,
    marginBottom: 16,
  },
  placeholderTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  placeholderSubtitle: {
    fontSize: 16,
    color: '#999',
  },
});