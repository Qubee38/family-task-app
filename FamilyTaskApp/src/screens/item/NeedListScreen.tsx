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
import { ItemResponse, Priority } from '../../types/item';
import { RootStackParamList } from '../../types/navigation.types';
import { logger } from '../../utils/logger';

type NeedListScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function NeedListScreen() {
  const navigation = useNavigation<NeedListScreenNavigationProp>();
  const { user } = useAuth();
  const { selectedFamily } = useFamily();
  const { items, categories, loading, loadItems, completeItem, uncompleteItem } = useItem();
  
  // フィルター状態
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>('active');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedAssignee, setSelectedAssignee] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<Priority | ''>('');
  const [showFilterModal, setShowFilterModal] = useState(false);

  useEffect(() => {
    // 画面表示時に必要物を取得
    const filter: any = { type: 'need' };
    
    if (statusFilter === 'completed') filter.isCompleted = true;
    if (statusFilter === 'active') filter.isCompleted = false;
    if (selectedCategoryId) filter.categoryId = selectedCategoryId;
    if (selectedAssignee) filter.assignedTo = selectedAssignee;
    
    logger.info('🛒 NeedListScreen: 必要物を取得', filter);
    loadItems(filter);
  }, [statusFilter, selectedCategoryId, selectedAssignee]);

  const handleNeedPress = (item: ItemResponse) => {
    navigation.navigate('NeedDetail', { itemId: item.itemId });
  };

  const handleCreateNeed = () => {
    navigation.navigate('CreateEditNeed');
  };

  const handleToggleComplete = async (item: ItemResponse) => {
    try {
      if (item.isCompleted) {
        await uncompleteItem(item.itemId);
        logger.info('必要物を未購入に戻しました');
      } else {
        await completeItem(item.itemId);
        logger.info('必要物を購入済みにしました');
      }
    } catch (error: any) {
      logger.error('必要物の完了切替エラー:', error);
      const message = error.response?.data?.detail || error.message || '必要物の更新に失敗しました';
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
    setPriorityFilter('');
  };

  const activeFilterCount = 
    (selectedCategoryId ? 1 : 0) + 
    (selectedAssignee ? 1 : 0) + 
    (priorityFilter ? 1 : 0);

  // フィルター適用（必要物のみ）
  const filteredItems = items
    .filter(item => item.type === 'need')  // 必要物のみ
    .filter(item => {
      // 優先度フィルター（クライアント側で適用）
      if (priorityFilter && item.priority !== priorityFilter) return false;
      return true;
    });

  // メンバー一覧（担当者フィルター用）
  const familyMembers = selectedFamily?.members || [];

  const renderItem = ({ item }: { item: ItemResponse }) => {
    const priorityEmoji = {
      high: '🔴',
      medium: '🟡',
      low: '🟢',
    }[item.priority || 'medium'];

    return (
      <TouchableOpacity
        style={[styles.needCard, item.isCompleted && styles.needCardCompleted]}
        onPress={() => handleNeedPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.needLeft}>
          <TouchableOpacity
            style={[styles.checkbox, item.isCompleted && styles.checkboxCompleted]}
            onPress={() => handleToggleComplete(item)}
            activeOpacity={0.7}
          >
            {item.isCompleted && <Text style={styles.checkboxCheck}>✓</Text>}
          </TouchableOpacity>
          
          <View style={styles.needInfo}>
            <View style={styles.needTitleRow}>
              <Text style={styles.priorityEmoji}>{priorityEmoji}</Text>
              <Text style={[styles.needTitle, item.isCompleted && styles.needTitleCompleted]}>
                {item.title}
              </Text>
            </View>
            <View style={styles.needMeta}>
              {item.categoryName && (
                <Text style={styles.needCategory}>🏷️ {item.categoryName}</Text>
              )}
              {item.assignedToName && (
                <Text style={styles.needAssignee}>👤 {item.assignedToName}</Text>
              )}
              {item.location && (
                <Text style={styles.needLocation}>📍 {item.location}</Text>
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
        <Text style={styles.headerTitle}>買い物リスト</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleCreateNeed}
          activeOpacity={0.7}
        >
          <Text style={styles.addButtonText}>+</Text>
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
              未購入
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, statusFilter === 'completed' && styles.filterButtonActive]}
            onPress={() => setStatusFilter('completed')}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterButtonText, statusFilter === 'completed' && styles.filterButtonTextActive]}>
              購入済み
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

      {/* 必要物一覧 */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF9800" />
        </View>
      ) : filteredItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>必要物がありません</Text>
          <Text style={styles.emptySubtext}>右上の「+」ボタンから追加できます</Text>
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
                    .filter(cat => cat.suggestedFor.includes('need'))
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

              {/* 優先度フィルター */}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>優先度</Text>
                <View style={styles.filterOptions}>
                  <TouchableOpacity
                    style={[
                      styles.filterOption,
                      !priorityFilter && styles.filterOptionActive,
                    ]}
                    onPress={() => setPriorityFilter('')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.filterOptionText}>すべて</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.filterOption,
                      priorityFilter === 'high' && styles.filterOptionActive,
                    ]}
                    onPress={() => setPriorityFilter('high')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.filterOptionText}>🔴 高</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.filterOption,
                      priorityFilter === 'medium' && styles.filterOptionActive,
                    ]}
                    onPress={() => setPriorityFilter('medium')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.filterOptionText}>🟡 中</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.filterOption,
                      priorityFilter === 'low' && styles.filterOptionActive,
                    ]}
                    onPress={() => setPriorityFilter('low')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.filterOptionText}>🟢 低</Text>
                  </TouchableOpacity>
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
    backgroundColor: '#FF9800',
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
    backgroundColor: '#FF9800',
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
  listContent: {
    padding: 16,
  },
  needCard: {
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
  needCardCompleted: {
    opacity: 0.6,
  },
  needLeft: {
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
    backgroundColor: '#FF9800',
    borderColor: '#FF9800',
  },
  checkboxCheck: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  needInfo: {
    flex: 1,
  },
  needTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  priorityEmoji: {
    fontSize: 12,
    marginRight: 6,
  },
  needTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  needTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  needMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  needCategory: {
    fontSize: 12,
    color: '#666',
  },
  needAssignee: {
    fontSize: 12,
    color: '#666',
  },
  needLocation: {
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
    backgroundColor: '#FF9800',
    borderColor: '#FF9800',
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
    backgroundColor: '#FF9800',
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});