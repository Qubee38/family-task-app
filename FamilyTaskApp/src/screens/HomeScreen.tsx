import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Alert, ScrollView, Modal } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { useFamily } from '../contexts/FamilyContext';
import { useItem } from '../contexts/ItemContext';
import { RootStackParamList } from '../types/navigation.types';
import ConfirmDialog from '../components/ConfirmDialog';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { user, signOut } = useAuth();
  const { selectedFamily } = useFamily();
  const { items, loadItems } = useItem();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // 画面表示時にタスクを取得
  useEffect(() => {
    if (selectedFamily) {
      loadItems({ type: 'task', isCompleted: false });
    }
  }, [selectedFamily]);

  // 今日のタスク（期限が今日以前の未完了タスク）
  const todayTasks = items
    .filter(item => !item.isCompleted)
    .filter(item => {
      if (!item.endDateTime) return false;
      const endDate = new Date(item.endDateTime);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return endDate <= today;
    })
    .slice(0, 3);

  const handleLogout = async () => {
    console.log('🔹 handleLogout called');
    
    // メニューを閉じる
    setShowUserMenu(false);
    
    // Web環境ではカスタムダイアログを使用、ネイティブではAlertを使用
    if (Platform.OS === 'web') {
      setShowLogoutDialog(true);
    } else {
      Alert.alert(
        'ログアウト',
        'ログアウトしますか？',
        [
          {
            text: 'キャンセル',
            onPress: () => console.log('❌ ログアウトキャンセル'),
            style: 'cancel',
          },
          {
            text: 'ログアウト',
            style: 'destructive',
            onPress: performLogout,
          },
        ],
      );
    }
  };

  const performLogout = async () => {
    console.log('🔹 ログアウト実行開始');
    try {
      await signOut();
      console.log('✅ ログアウト成功');
    } catch (error: any) {
      console.error('❌ ログアウトエラー:', error);
      
      if (Platform.OS === 'web') {
        alert('ログアウトに失敗しました: ' + error.message);
      } else {
        Alert.alert('エラー', 'ログアウトに失敗しました: ' + error.message);
      }
    }
  };

  const handleMenuAction = (action: string) => {
    setShowUserMenu(false);
    
    switch (action) {
      case 'manage':
        navigation.navigate('FamilyManage');
        break;
      case 'switch':
        navigation.navigate('FamilyList');
        break;
      case 'logout':
        handleLogout();
        break;
    }
  };

  const handleViewAllTasks = () => {
    navigation.navigate('ItemList');
  };

  const handleCreateTask = () => {
    navigation.navigate('CreateEditItem');
  };

  return (
    <View style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>{selectedFamily?.name || 'ファミリータスク'}</Text>
          {selectedFamily && (
            <Text style={styles.headerSubtitle}>👥 {selectedFamily.members?.length || 0}人</Text>
          )}
        </View>
        
        {/* ユーザーアイコン */}
        <TouchableOpacity 
          style={styles.userIcon}
          onPress={() => setShowUserMenu(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.userIconText}>
            {user?.email?.charAt(0).toUpperCase() || 'U'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* 今日のタスク */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>📋 今日のタスク</Text>
            <TouchableOpacity onPress={handleViewAllTasks} activeOpacity={0.7}>
              <Text style={styles.viewAllText}>すべて見る →</Text>
            </TouchableOpacity>
          </View>
          
          {todayTasks.length > 0 ? (
            todayTasks.map(task => (
              <TouchableOpacity
                key={task.itemId}
                style={styles.taskItem}
                onPress={() => navigation.navigate('ItemDetail', { itemId: task.itemId })}
                activeOpacity={0.7}
              >
                <View style={styles.taskCheckbox} />
                <View style={styles.taskInfo}>
                  <Text style={styles.taskTitle}>{task.title}</Text>
                  <Text style={styles.taskMeta}>
                    {task.categoryName && `🏷️ ${task.categoryName}`}
                    {task.assignedToName && ` • 👤 ${task.assignedToName}`}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.emptyText}>期限が近いタスクはありません</Text>
          )}
          
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleCreateTask}
            activeOpacity={0.7}
          >
            <Text style={styles.addButtonText}>+ 新しいタスクを作成</Text>
          </TouchableOpacity>
        </View>

        {/* 今日の予定 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📅 今日の予定</Text>
          <Text style={styles.placeholderText}>
            予定管理機能は次のフェーズで実装予定です
          </Text>
        </View>

        {/* 買い物リスト */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🛒 買い物リスト</Text>
          <Text style={styles.placeholderText}>
            必要物管理機能は次のフェーズで実装予定です
          </Text>
        </View>
      </ScrollView>

      {/* ユーザーメニュー（モーダル） */}
      <Modal
        visible={showUserMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowUserMenu(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowUserMenu(false)}
        >
          <View style={styles.userMenuContainer}>
            {/* ユーザー情報 */}
            <View style={styles.userMenuHeader}>
              <View style={styles.userMenuIcon}>
                <Text style={styles.userMenuIconText}>
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </Text>
              </View>
              <View style={styles.userMenuInfo}>
                <Text style={styles.userMenuName}>{user?.email?.split('@')[0] || 'ユーザー'}</Text>
                <Text style={styles.userMenuEmail}>{user?.email || '不明'}</Text>
              </View>
            </View>

            <View style={styles.menuDivider} />

            {/* メニュー項目 */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleMenuAction('manage')}
              activeOpacity={0.7}
            >
              <Text style={styles.menuItemIcon}>⚙️</Text>
              <Text style={styles.menuItemText}>家族を管理</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleMenuAction('switch')}
              activeOpacity={0.7}
            >
              <Text style={styles.menuItemIcon}>🔄</Text>
              <Text style={styles.menuItemText}>家族を切り替え</Text>
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity
              style={[styles.menuItem, styles.logoutMenuItem]}
              onPress={() => handleMenuAction('logout')}
              activeOpacity={0.7}
            >
              <Text style={styles.menuItemIcon}>🚪</Text>
              <Text style={[styles.menuItemText, styles.logoutText]}>ログアウト</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
      
      {/* Web用のログアウト確認ダイアログ */}
      <ConfirmDialog
        visible={showLogoutDialog}
        title="ログアウト"
        message="ログアウトしますか？"
        confirmText="ログアウト"
        cancelText="キャンセル"
        onConfirm={() => {
          setShowLogoutDialog(false);
          performLogout();
        }}
        onCancel={() => {
          console.log('❌ ログアウトキャンセル');
          setShowLogoutDialog(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#2196F3',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  userIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  userIconText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  viewAllText: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '600',
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  taskCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ccc',
    marginRight: 12,
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  taskMeta: {
    fontSize: 12,
    color: '#666',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 20,
  },
  addButton: {
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#2196F3',
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2196F3',
  },
  placeholderText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  
  // ユーザーメニュー（モーダル）
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 100,
    paddingRight: 20,
  },
  userMenuContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: 280,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  userMenuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  userMenuIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userMenuIconText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  userMenuInfo: {
    flex: 1,
  },
  userMenuName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  userMenuEmail: {
    fontSize: 12,
    color: '#666',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingHorizontal: 20,
  },
  menuItemIcon: {
    fontSize: 20,
    marginRight: 12,
    width: 24,
  },
  menuItemText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  logoutMenuItem: {
    backgroundColor: '#fff5f5',
  },
  logoutText: {
    color: '#FF3B30',
  },
});