import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useItem } from '../../contexts/ItemContext';
import { useAuth } from '../../contexts/AuthContext';
import { ItemResponse } from '../../types/item';
import { RootStackParamList } from '../../types/navigation.types';
import { logger } from '../../utils/logger';

type ItemListScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ItemListScreen() {
  const navigation = useNavigation<ItemListScreenNavigationProp>();
  const { user } = useAuth();
  const { items, loading, loadItems, completeItem, uncompleteItem } = useItem();
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('active');

  useEffect(() => {
    // 画面表示時にアイテムを取得
    loadItems({ type: 'task', isCompleted: filter === 'completed' ? true : filter === 'active' ? false : undefined });
  }, [filter]);

  const handleItemPress = (item: ItemResponse) => {
    navigation.navigate('ItemDetail', { itemId: item.itemId });
  };

  const handleToggleComplete = async (item: ItemResponse) => {
    try {
      if (item.isCompleted) {
        await uncompleteItem(item.itemId);
        logger.info('タスクを未完了に戻しました');
      } else {
        await completeItem(item.itemId);
        logger.info('タスクを完了しました');
      }
    } catch (error: any) {
      logger.error('タスク完了切り替えエラー:', error);
      const message = error.response?.data?.detail || error.message || '操作に失敗しました';
      if (Platform.OS === 'web') {
        alert(message);
      } else {
        Alert.alert('エラー', message);
      }
    }
  };

  const handleCreateTask = () => {
    navigation.navigate('CreateEditItem');
  };

  const renderItem = ({ item }: { item: ItemResponse }) => {
    const priorityColor = {
      high: '#FF3B30',
      medium: '#FF9500',
      low: '#34C759',
    }[item.priority];

    return (
      <TouchableOpacity
        style={[styles.itemCard, item.isCompleted && styles.itemCardCompleted]}
        onPress={() => handleItemPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.itemLeft}>
          {/* 完了チェックボックス */}
          <TouchableOpacity
            style={[styles.checkbox, item.isCompleted && styles.checkboxCompleted]}
            onPress={() => handleToggleComplete(item)}
            activeOpacity={0.7}
          >
            {item.isCompleted && <Text style={styles.checkboxCheck}>✓</Text>}
          </TouchableOpacity>

          <View style={styles.itemInfo}>
            <Text style={[styles.itemTitle, item.isCompleted && styles.itemTitleCompleted]}>
              {item.title}
            </Text>
            
            <View style={styles.itemMeta}>
              {item.categoryName && (
                <Text style={styles.itemCategory}>🏷️ {item.categoryName}</Text>
              )}
              {item.assignedToName && (
                <Text style={styles.itemAssignee}>👤 {item.assignedToName}</Text>
              )}
              {item.endDateTime && (
                <Text style={styles.itemDueDate}>
                  📅 {new Date(item.endDateTime).toLocaleDateString('ja-JP')}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* 優先度インジケーター */}
        <View style={[styles.priorityIndicator, { backgroundColor: priorityColor }]} />
      </TouchableOpacity>
    );
  };

  const filteredItems = items.filter(item => {
    if (filter === 'all') return true;
    if (filter === 'active') return !item.isCompleted;
    if (filter === 'completed') return item.isCompleted;
    return true;
  });

  return (
    <View style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>タスク一覧</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleCreateTask}
          activeOpacity={0.7}
        >
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* フィルターボタン */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
          onPress={() => setFilter('all')}
          activeOpacity={0.7}
        >
          <Text style={[styles.filterButtonText, filter === 'all' && styles.filterButtonTextActive]}>
            すべて
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'active' && styles.filterButtonActive]}
          onPress={() => setFilter('active')}
          activeOpacity={0.7}
        >
          <Text style={[styles.filterButtonText, filter === 'active' && styles.filterButtonTextActive]}>
            未完了
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'completed' && styles.filterButtonActive]}
          onPress={() => setFilter('completed')}
          activeOpacity={0.7}
        >
          <Text style={[styles.filterButtonText, filter === 'completed' && styles.filterButtonTextActive]}>
            完了
          </Text>
        </TouchableOpacity>
      </View>

      {/* タスク一覧 */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
        </View>
      ) : filteredItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>タスクがありません</Text>
          <Text style={styles.emptySubtext}>右上の「+」ボタンから作成できます</Text>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          renderItem={renderItem}
          keyExtractor={(item) => item.itemId}
          contentContainerStyle={styles.listContent}
        />
      )}
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
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 28,
    color: '#fff',
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  addButton: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 28,
    color: '#fff',
    fontWeight: 'bold',
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#2196F3',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  listContent: {
    padding: 16,
  },
  itemCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  itemCardCompleted: {
    opacity: 0.6,
  },
  itemLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ccc',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxCompleted: {
    backgroundColor: '#34C759',
    borderColor: '#34C759',
  },
  checkboxCheck: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  itemTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  itemMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  itemCategory: {
    fontSize: 12,
    color: '#666',
  },
  itemAssignee: {
    fontSize: 12,
    color: '#666',
  },
  itemDueDate: {
    fontSize: 12,
    color: '#666',
  },
  priorityIndicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginLeft: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#999',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
  },
});