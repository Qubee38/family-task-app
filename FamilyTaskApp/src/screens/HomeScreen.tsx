import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { useFamily } from '../contexts/FamilyContext';
import { useItem } from '../contexts/ItemContext';
import { RootStackParamList } from '../types/navigation.types';
import { logger } from '../utils/logger';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { user, logout } = useAuth();
  const { selectedFamily, selectFamily } = useFamily();
  const { items, loadItems } = useItem();
  const [showUserMenu, setShowUserMenu] = useState(false);

  // 画面表示時にタスク、予定、必要物を取得
  useEffect(() => {
    if (selectedFamily) {
      loadItems({ type: 'task', isCompleted: false });
      loadItems({ type: 'event' });
      loadItems({ type: 'need', isCompleted: false });
    }
  }, [selectedFamily]);

  const handleLogout = async () => {
    try {
      await logout();
      navigation.reset({
        index: 0,
        routes: [{ name: 'FamilyList' }],
      });
    } catch (error: any) {
      logger.error('ログアウトエラー:', error);
      const message = error.message || 'ログアウトに失敗しました';
      if (Platform.OS === 'web') {
        alert(message);
      } else {
        Alert.alert('エラー', message);
      }
    }
  };

  const handleFamilyManage = () => {
    setShowUserMenu(false);
    navigation.navigate('FamilyManage');
  };

  const handleCategoryManage = () => {
    setShowUserMenu(false);
    navigation.navigate('CategoryList');
  };

  const handleSwitchFamily = () => {
    setShowUserMenu(false);
    selectFamily(null);
    navigation.reset({
      index: 0,
      routes: [{ name: 'FamilyList' }],
    });
  };

  const handleViewAllItems = () => {
    navigation.navigate('ItemList');
  };

  const handleCreateItem = () => {
    navigation.navigate('ItemForm', { type: 'task' });
  };

  // 今日の日付
  const today = new Date();
  today.setHours(0, 0, 0, 0);

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

  // 期限が近いタスク（期限順、優先度順、最大3件）
  const upcomingTasks = items
    .filter(item => item.type === 'task' && !item.isCompleted && item.endDateTime)
    .sort((a, b) => {
      // 期限でソート
      if (a.endDateTime && b.endDateTime) {
        const diff = new Date(a.endDateTime).getTime() - new Date(b.endDateTime).getTime();
        if (diff !== 0) return diff;
      }
      
      // 期限が同じ場合は優先度でソート
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const aPriority = priorityOrder[a.priority || 'medium'];
      const bPriority = priorityOrder[b.priority || 'medium'];
      return bPriority - aPriority;
    })
    .slice(0, 3);

  // 欲しい物リスト（優先度順、期限順、最大5件）
  const wishList = items
    .filter(item => item.type === 'need' && !item.isCompleted)
    .sort((a, b) => {
      // 優先度でソート
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const aPriority = priorityOrder[a.priority || 'medium'];
      const bPriority = priorityOrder[b.priority || 'medium'];
      if (aPriority !== bPriority) return bPriority - aPriority;
      
      // 期限があるものを優先
      if (a.endDateTime && !b.endDateTime) return -1;
      if (!a.endDateTime && b.endDateTime) return 1;
      if (a.endDateTime && b.endDateTime) {
        return new Date(a.endDateTime).getTime() - new Date(b.endDateTime).getTime();
      }
      
      // 作成日時でソート（新しい順）
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    })
    .slice(0, 5);

  return (
    <View style={styles.container}>
      {/* ヘッダー（ホーム画面用 - 高さ大きめ） */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>ファミリータスク</Text>
        <TouchableOpacity
          style={styles.userButton}
          onPress={() => setShowUserMenu(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.userButtonText}>👥</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 家族情報カード */}
        {selectedFamily && (
          <View style={styles.familyCard}>
            <View style={styles.familyCardHeader}>
              <Text style={styles.familyName}>{selectedFamily.familyName}</Text>
              <Text style={styles.memberCount}>
                メンバー: {selectedFamily.members?.length || 0}人
              </Text>
            </View>
            <View style={styles.memberList}>
              {selectedFamily.members?.map((member) => (
                <View key={member.userId} style={styles.memberBadge}>
                  <Text style={styles.memberBadgeText}>👤 {member.displayName}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 今日の予定 */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <View style={styles.cardTitleLeft}>
              <View style={[styles.cardIcon, { backgroundColor: '#2196F3' }]}>
                <Text style={styles.cardIconText}>📅</Text>
              </View>
              <Text style={styles.cardTitle}>今日の予定</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('ItemList', { type: 'event' })}>
              <Text style={styles.viewAllText}>すべて見る →</Text>
            </TouchableOpacity>
          </View>
          
          {todayEvents.length > 0 ? (
            todayEvents.map(event => (
              <TouchableOpacity
                key={event.itemId}
                style={[styles.itemRow, { borderLeftColor: '#2196F3' }]}
                onPress={() => navigation.navigate('ItemDetail', { itemId: event.itemId })}
                activeOpacity={0.7}
              >
                <View style={styles.itemContent}>
                  <Text style={styles.itemTitle}>{event.title}</Text>
                  <Text style={styles.itemMeta}>
                    {event.startDateTime && 
                      new Date(event.startDateTime).toLocaleTimeString('ja-JP', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })
                    }
                  </Text>
                </View>
                {event.assignedToName && (
                  <View style={styles.assigneeBadge}>
                    <Text style={styles.assigneeBadgeText}>{event.assignedToName}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.emptyText}>今日の予定はありません</Text>
          )}
        </View>

        {/* 期限が近いタスク */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <View style={styles.cardTitleLeft}>
              <View style={[styles.cardIcon, { backgroundColor: '#FF9800' }]}>
                <Text style={styles.cardIconText}>⏰</Text>
              </View>
              <Text style={styles.cardTitle}>期限が近いタスク</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('ItemList', { type: 'task' })}>
              <Text style={styles.viewAllText}>すべて見る →</Text>
            </TouchableOpacity>
          </View>
          
          {upcomingTasks.length > 0 ? (
            upcomingTasks.map(task => (
              <TouchableOpacity
                key={task.itemId}
                style={[styles.itemRow, { borderLeftColor: '#FF9800' }]}
                onPress={() => navigation.navigate('ItemDetail', { itemId: task.itemId })}
                activeOpacity={0.7}
              >
                <View style={styles.itemContent}>
                  <Text style={styles.itemTitle}>{task.title}</Text>
                  <Text style={styles.itemMeta}>
                    期限: {task.endDateTime ? 
                      new Date(task.endDateTime).toLocaleDateString('ja-JP', { 
                        month: 'numeric', 
                        day: 'numeric' 
                      }) : '未設定'
                    }
                  </Text>
                </View>
                {task.priority && (
                  <View style={[
                    styles.priorityBadge,
                    task.priority === 'high' ? styles.priorityHigh :
                    task.priority === 'medium' ? styles.priorityMedium :
                    styles.priorityLow
                  ]}>
                    <Text style={styles.priorityBadgeText}>
                      {task.priority === 'high' ? '高' : task.priority === 'medium' ? '中' : '低'}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.emptyText}>期限が近いタスクはありません</Text>
          )}
        </View>

        {/* 欲しい物リスト */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <View style={styles.cardTitleLeft}>
              <View style={[styles.cardIcon, { backgroundColor: '#4CAF50' }]}>
                <Text style={styles.cardIconText}>📋</Text>
              </View>
              <Text style={styles.cardTitle}>欲しい物リスト</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('ItemList', { type: 'need' })}>
              <Text style={styles.viewAllText}>すべて見る →</Text>
            </TouchableOpacity>
          </View>
          
          {wishList.length > 0 ? (
            wishList.map(need => (
              <TouchableOpacity
                key={need.itemId}
                style={styles.needRow}
                onPress={() => navigation.navigate('ItemDetail', { itemId: need.itemId })}
                activeOpacity={0.7}
              >
                <View style={styles.checkbox} />
                <Text style={styles.needTitle}>{need.title}</Text>
                {need.location && (
                  <Text style={styles.needLocation}>{need.location}</Text>
                )}
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.emptyText}>欲しい物リストは空です</Text>
          )}
        </View>
      </ScrollView>

      {/* FAB（右下の新規作成ボタン） */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleCreateItem}
        activeOpacity={0.8}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

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
            <TouchableOpacity style={styles.menuItem} onPress={handleViewAllItems}>
              <Text style={styles.menuItemText}>📋 一覧画面</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={handleFamilyManage}>
              <Text style={styles.menuItemText}>👥 家族管理</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={handleCategoryManage}>
              <Text style={styles.menuItemText}>🏷️ カテゴリ管理</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={handleSwitchFamily}>
              <Text style={styles.menuItemText}>🔄 家族を切り替え</Text>
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
              <Text style={[styles.menuItemText, styles.logoutText]}>🚪 ログアウト</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  // ホーム画面のヘッダー（高さ大きめ）
  header: {
    backgroundColor: '#2196F3',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  userButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userButtonText: {
    fontSize: 24,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  familyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  familyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  familyName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  memberCount: {
    fontSize: 14,
    color: '#999',
  },
  memberList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  memberBadge: {
    backgroundColor: '#f5f5f5',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  memberBadgeText: {
    fontSize: 13,
    color: '#666',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardIcon: {
    width: 32,
    height: 32,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardIconText: {
    fontSize: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  viewAllText: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '600',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: 12,
    paddingVertical: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  itemMeta: {
    fontSize: 14,
    color: '#999',
  },
  assigneeBadge: {
    backgroundColor: '#E3F2FD',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  assigneeBadgeText: {
    fontSize: 12,
    color: '#2196F3',
    fontWeight: '600',
  },
  priorityBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  priorityHigh: {
    backgroundColor: '#FFEBEE',
  },
  priorityMedium: {
    backgroundColor: '#FFF3E0',
  },
  priorityLow: {
    backgroundColor: '#F5F5F5',
  },
  priorityBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  needRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#ccc',
    marginRight: 12,
  },
  needTitle: {
    flex: 1,
    fontSize: 15,
    color: '#333',
  },
  needLocation: {
    fontSize: 12,
    color: '#999',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 20,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabIcon: {
    fontSize: 32,
    color: '#fff',
    fontWeight: '300',
  },

  // モーダル
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  userMenuContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
  },
  userMenuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  userMenuIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  userMenuIconText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  userMenuInfo: {
    flex: 1,
  },
  userMenuName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  userMenuEmail: {
    fontSize: 14,
    color: '#999',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 20,
  },
  menuItem: {
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  menuItemText: {
    fontSize: 16,
    color: '#333',
  },
  logoutText: {
    color: '#f44336',
  },
});