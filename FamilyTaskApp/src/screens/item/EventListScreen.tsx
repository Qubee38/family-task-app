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
  Modal,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useItem } from '../../contexts/ItemContext';
import { useAuth } from '../../contexts/AuthContext';
import { useFamily } from '../../contexts/FamilyContext';
import { ItemResponse } from '../../types/item';
import { RootStackParamList } from '../../types/navigation.types';
import { logger } from '../../utils/logger';

type EventListScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function EventListScreen() {
  const navigation = useNavigation<EventListScreenNavigationProp>();
  const { user } = useAuth();
  const { selectedFamily } = useFamily();
  const { items, categories, loading, loadItems, completeItem, uncompleteItem } = useItem();
  
  // フィルター状態
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>('active');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedAssignee, setSelectedAssignee] = useState<string>('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  useEffect(() => {
    // 画面表示時に予定を取得
    const filter: any = { type: 'event' };
    
    if (statusFilter === 'completed') filter.isCompleted = true;
    if (statusFilter === 'active') filter.isCompleted = false;
    if (selectedCategoryId) filter.categoryId = selectedCategoryId;
    if (selectedAssignee) filter.assignedTo = selectedAssignee;
    
    logger.info('📅 EventListScreen: 予定を取得', filter);
    loadItems(filter);
  }, [statusFilter, selectedCategoryId, selectedAssignee]);

  useEffect(() => {
    logger.info('📅 EventListScreen: items更新', { count: items.length, items: items.map(i => ({ id: i.itemId, type: i.type, title: i.title })) });
  }, [items]);

  const handleEventPress = (item: ItemResponse) => {
    navigation.navigate('EventDetail', { itemId: item.itemId });
  };

  const handleCreateEvent = () => {
    navigation.navigate('CreateEditEvent');
  };

  const handleToggleComplete = async (item: ItemResponse) => {
    try {
      if (item.isCompleted) {
        await uncompleteItem(item.itemId);
        logger.info('予定を未完了に戻しました');
      } else {
        await completeItem(item.itemId);
        logger.info('予定を完了にしました');
      }
    } catch (error: any) {
      logger.error('予定の完了切替エラー:', error);
      const message = error.response?.data?.detail || error.message || '予定の更新に失敗しました';
      if (Platform.OS === 'web') {
        alert(message);
      } else {
        Alert.alert('エラー', message);
      }
    }
  };

  const clearFilters = () => {
    setSelectedCategoryId('');
    setSelectedAssignee('');
  };

  const activeFilterCount = 
    (selectedCategoryId ? 1 : 0) + 
    (selectedAssignee ? 1 : 0);

  // フィルター適用（予定のみ）
  const filteredItems = items
    .filter(item => item.type === 'event')  // 予定のみ
    .filter(item => {
      // 優先度フィルター（予定には優先度はないが、念のため）
      return true;
    });

  // メンバー一覧（担当者フィルター用）
  const familyMembers = selectedFamily?.members || [];

  const renderItem = ({ item }: { item: ItemResponse }) => {
    // 開始日時のフォーマット
    const startDate = item.startDateTime 
      ? new Date(item.startDateTime).toLocaleString('ja-JP', {
          month: 'numeric',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '';

    // 繰り返し設定の表示
    const recurrenceText = item.recurrence 
      ? ` 🔄 ${
          item.recurrence.frequency === 'daily' ? '毎日' :
          item.recurrence.frequency === 'weekly' ? '毎週' :
          item.recurrence.frequency === 'monthly' ? '毎月' :
          '毎年'
        }`
      : '';

    return (
      <TouchableOpacity
        style={[styles.eventCard, item.isCompleted && styles.eventCardCompleted]}
        onPress={() => handleEventPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.eventLeft}>
          <TouchableOpacity
            style={[styles.checkbox, item.isCompleted && styles.checkboxCompleted]}
            onPress={() => handleToggleComplete(item)}
            activeOpacity={0.7}
          >
            {item.isCompleted && <Text style={styles.checkboxCheck}>✓</Text>}
          </TouchableOpacity>
          
          <View style={styles.eventInfo}>
            <Text style={[styles.eventTitle, item.isCompleted && styles.eventTitleCompleted]}>
              {item.title}
            </Text>
            <View style={styles.eventMeta}>
              {item.categoryName && (
                <Text style={styles.eventCategory}>🏷️ {item.categoryName}</Text>
              )}
              {item.assignedToName && (
                <Text style={styles.eventAssignee}>👤 {item.assignedToName}</Text>
              )}
              {startDate && (
                <Text style={styles.eventDateTime}>📅 {startDate}{recurrenceText}</Text>
              )}
              {item.location && (
                <Text style={styles.eventLocation}>📍 {item.location}</Text>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

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
        <Text style={styles.headerTitle}>予定一覧</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleCreateEvent}
          activeOpacity={0.7}
        >
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* 表示切替ボタン */}
      <View style={styles.viewModeContainer}>
        <TouchableOpacity
          style={[styles.viewModeButton, viewMode === 'list' && styles.viewModeButtonActive]}
          onPress={() => setViewMode('list')}
          activeOpacity={0.7}
        >
          <Text style={[styles.viewModeText, viewMode === 'list' && styles.viewModeTextActive]}>
            📋 リスト
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.viewModeButton, viewMode === 'calendar' && styles.viewModeButtonActive]}
          onPress={() => setViewMode('calendar')}
          activeOpacity={0.7}
        >
          <Text style={[styles.viewModeText, viewMode === 'calendar' && styles.viewModeTextActive]}>
            📅 カレンダー
          </Text>
        </TouchableOpacity>
      </View>

      {/* フィルターボタン */}
      <View style={styles.filterContainer}>
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterButton, statusFilter === 'all' && styles.filterButtonActive]}
            onPress={() => setStatusFilter('all')}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterButtonText, statusFilter === 'all' && styles.filterButtonTextActive]}>
              すべて
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, statusFilter === 'active' && styles.filterButtonActive]}
            onPress={() => setStatusFilter('active')}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterButtonText, statusFilter === 'active' && styles.filterButtonTextActive]}>
              未完了
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, statusFilter === 'completed' && styles.filterButtonActive]}
            onPress={() => setStatusFilter('completed')}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterButtonText, statusFilter === 'completed' && styles.filterButtonTextActive]}>
              完了
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* 詳細フィルターボタン */}
        <TouchableOpacity
          style={styles.moreFilterButton}
          onPress={() => setShowFilterModal(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.moreFilterText}>
            🔍 詳細フィルター {activeFilterCount > 0 && `(${activeFilterCount})`}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 予定一覧 */}
      {viewMode === 'calendar' ? (
        <View style={styles.calendarPlaceholder}>
          <Text style={styles.placeholderText}>📅</Text>
          <Text style={styles.placeholderTitle}>カレンダービュー</Text>
          <Text style={styles.placeholderSubtext}>
            カレンダー表示機能は今後実装予定です
          </Text>
        </View>
      ) : loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
        </View>
      ) : filteredItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>予定がありません</Text>
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

      {/* フィルターモーダル */}
      <Modal
        visible={showFilterModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>詳細フィルター</Text>
              <TouchableOpacity
                onPress={() => setShowFilterModal(false)}
                style={styles.modalCloseButton}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              {/* カテゴリフィルター */}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>カテゴリ</Text>
                <View style={styles.filterOptions}>
                  <TouchableOpacity
                    style={[
                      styles.filterOption,
                      !selectedCategoryId && styles.filterOptionActive,
                    ]}
                    onPress={() => setSelectedCategoryId('')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.filterOptionText}>すべて</Text>
                  </TouchableOpacity>
                  {categories
                    .filter(cat => cat.suggestedFor.includes('event'))
                    .map(category => (
                      <TouchableOpacity
                        key={category.categoryId}
                        style={[
                          styles.filterOption,
                          selectedCategoryId === category.categoryId && styles.filterOptionActive,
                        ]}
                        onPress={() => setSelectedCategoryId(category.categoryId)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.filterOptionText}>{category.name}</Text>
                      </TouchableOpacity>
                    ))}
                </View>
              </View>

              {/* 担当者フィルター */}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>担当者</Text>
                <View style={styles.filterOptions}>
                  <TouchableOpacity
                    style={[
                      styles.filterOption,
                      !selectedAssignee && styles.filterOptionActive,
                    ]}
                    onPress={() => setSelectedAssignee('')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.filterOptionText}>すべて</Text>
                  </TouchableOpacity>
                  {familyMembers.map(member => (
                    <TouchableOpacity
                      key={member.userId}
                      style={[
                        styles.filterOption,
                        selectedAssignee === member.userId && styles.filterOptionActive,
                      ]}
                      onPress={() => setSelectedAssignee(member.userId)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.filterOptionText}>{member.displayName}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.clearButton}
                onPress={clearFilters}
                activeOpacity={0.7}
              >
                <Text style={styles.clearButtonText}>クリア</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyButton}
                onPress={() => setShowFilterModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.applyButtonText}>適用</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#4CAF50',
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
  viewModeContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    gap: 8,
  },
  viewModeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  viewModeButtonActive: {
    backgroundColor: '#4CAF50',
  },
  viewModeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  viewModeTextActive: {
    color: '#fff',
  },
  filterContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterRow: {
    flexDirection: 'row',
    flex: 1,
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
    backgroundColor: '#4CAF50',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  moreFilterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  moreFilterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  calendarPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  placeholderText: {
    fontSize: 64,
    marginBottom: 16,
  },
  placeholderTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  placeholderSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
  },
  eventCard: {
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
  eventCardCompleted: {
    opacity: 0.6,
  },
  eventLeft: {
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
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  checkboxCheck: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  eventTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  eventMeta: {
    flexDirection: 'column',
    gap: 4,
  },
  eventCategory: {
    fontSize: 12,
    color: '#666',
  },
  eventAssignee: {
    fontSize: 12,
    color: '#666',
  },
  eventDateTime: {
    fontSize: 12,
    color: '#666',
  },
  eventLocation: {
    fontSize: 12,
    color: '#666',
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

  // モーダル
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 24,
    color: '#999',
  },
  modalContent: {
    padding: 20,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterOption: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  filterOptionActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  filterOptionText: {
    fontSize: 14,
    color: '#666',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  clearButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  applyButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});