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

  // 画面表示時にタスク、予定、必要物を取得
  useEffect(() => {
    if (selectedFamily) {
      loadItems({ type: 'task', isCompleted: false });
      loadItems({ type: 'event' });
      loadItems({ type: 'need', isCompleted: false });
    }
  }, [selectedFamily]);

  // 今日の日付
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 今日のタスク（期限が今日以前の未完了タスク、最大3件）
  const todayTasks = items
    .filter(item => {
      if (item.type !== 'task' || item.isCompleted) return false;
      if (!item.endDateTime) return false;
      const endDate = new Date(item.endDateTime);
      endDate.setHours(0, 0, 0, 0);
      return endDate <= today;
    })
    .sort((a, b) => {
      if (!a.endDateTime || !b.endDateTime) return 0;
      return new Date(a.endDateTime).getTime() - new Date(b.endDateTime).getTime();
    })
    .slice(0, 3);

  // 今日の予定（開始日時が今日、最大3件）
  const todayEvents = items
    .filter(item => {
      if (item.type !== 'event') return false;
      if (!item.startDateTime) return false;
      const startDate = new Date(item.startDateTime);
      startDate.setHours(0, 0, 0, 0);
      return startDate.getTime() === today.getTime();
    })
    .sort((a, b) => {
      if (!a.startDateTime || !b.startDateTime) return 0;
      return new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime();
    })
    .slice(0, 3);

  // 買い物リスト（未購入の必要物、優先度順、最大5件）
  const shoppingList = items
    .filter(item => item.type === 'need' && !item.isCompleted)
    .sort((a, b) => {
      // 優先度でソート（high > medium > low）
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const aPriority = priorityOrder[a.priority || 'medium'];
      const bPriority = priorityOrder[b.priority || 'medium'];
      if (aPriority !== bPriority) return bPriority - aPriority;
      
      // 優先度が同じ場合は作成日時でソート（新しい順）
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    })
    .slice(0, 5);

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
      case 'categories':
        navigation.navigate('CategoryList');
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
    navigation.navigate('ItemList', { type: 'task' });
  };

  const handleViewAllEvents = () => {
    navigation.navigate('ItemList', { type: 'event' });
  };

  const handleViewAllNeeds = () => {
    navigation.navigate('ItemList', { type: 'need' });
  };

  const handleCreateTask = () => {
    navigation.navigate('ItemForm', { type: 'task' });
  };

  const handleCreateEvent = () => {
    navigation.navigate('ItemForm', { type: 'event' });
  };

  const handleCreateNeed = () => {
    navigation.navigate('ItemForm', { type: 'need' });
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
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>📅 今日の予定</Text>
            <TouchableOpacity onPress={handleViewAllEvents} activeOpacity={0.7}>
              <Text style={styles.viewAllText}>すべて見る →</Text>
            </TouchableOpacity>
          </View>
          
          {todayEvents.length > 0 ? (
            todayEvents.map(event => (
              <TouchableOpacity
                key={event.itemId}
                style={styles.taskItem}
                onPress={() => navigation.navigate('ItemDetail', { itemId: event.itemId })}
                activeOpacity={0.7}
              >
                <View style={styles.taskCheckbox} />
                <View style={styles.taskInfo}>
                  <Text style={styles.taskTitle}>{event.title}</Text>
                  <Text style={styles.taskMeta}>
                    {event.startDateTime && `⏰ ${new Date(event.startDateTime).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}`}
                    {event.categoryName && ` • 🏷️ ${event.categoryName}`}
                    {event.location && ` • 📍 ${event.location}`}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.emptyText}>今日の予定はありません</Text>
          )}

          <TouchableOpacity
            style={styles.addButton}
            onPress={handleCreateEvent}
            activeOpacity={0.7}
          >
            <Text style={styles.addButtonText}>+ 新しい予定を作成</Text>
          </TouchableOpacity>
        </View>

        {/* 買い物リスト */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>🛒 買い物リスト</Text>
            <TouchableOpacity onPress={handleViewAllNeeds} activeOpacity={0.7}>
              <Text style={styles.viewAllText}>すべて見る →</Text>
            </TouchableOpacity>
          </View>
          
          {shoppingList.length > 0 ? (
            shoppingList.map(need => {
              const priorityEmoji = {
                high: '🔴',
                medium: '🟡',
                low: '🟢',
              }[need.priority || 'medium'];
              
              return (
                <TouchableOpacity
                  key={need.itemId}
                  style={styles.taskItem}
                  onPress={() => navigation.navigate('ItemDetail', { itemId: need.itemId })}
                  activeOpacity={0.7}
                >
                  <View style={styles.taskCheckbox} />
                  <View style={styles.taskInfo}>
                    <Text style={styles.taskTitle}>
                      {priorityEmoji} {need.title}
                    </Text>
                    <Text style={styles.taskMeta}>
                      {need.categoryName && `🏷️ ${need.categoryName}`}
                      {need.location && ` • 📍 ${need.location}`}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          ) : (
            <Text style={styles.emptyText}>買い物リストは空です</Text>
          )}

          <TouchableOpacity
            style={styles.addButton}
            onPress={handleCreateNeed}
            activeOpacity={0.7}
          >
            <Text style={styles.addButtonText}>+ 新しい必要物を追加</Text>
          </TouchableOpacity>
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
              onPress={() => handleMenuAction('categories')}
              activeOpacity={0.7}
            >
              <Text style={styles.menuItemIcon}>🏷️</Text>
              <Text style={styles.menuItemText}>カテゴリ管理</Text>
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