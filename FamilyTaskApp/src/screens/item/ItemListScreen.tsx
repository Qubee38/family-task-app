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
// @ts-ignore - react-native-calendarsの型定義
import { Calendar } from 'react-native-calendars';
import { useNavigation, useRoute, RouteProp, useFocusEffect, CompositeNavigationProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useItem } from '../../contexts/ItemContext';
import { useAuth } from '../../contexts/AuthContext';
import { useFamily } from '../../contexts/FamilyContext';
import { ItemResponse, Priority, ItemType } from '../../types/item';
import { BottomTabParamList, RootStackParamList } from '../../types/navigation.types';
import FilterIcon from '../../components/FilterIcon';
import { logger } from '../../utils/logger';

type ItemListScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<BottomTabParamList, 'ItemListTab'>,
  NativeStackNavigationProp<RootStackParamList>
>;
type ItemListScreenRouteProp = RouteProp<BottomTabParamList, 'ItemListTab'>;

// react-native-calendarsの型定義
interface MarkedDates {
  [date: string]: {
    dots?: Array<{ color: string; selectedDotColor?: string }>;
    selected?: boolean;
    selectedColor?: string;
  };
}

export default function ItemListScreen() {
  const navigation = useNavigation<ItemListScreenNavigationProp>();
  const route = useRoute<ItemListScreenRouteProp>();
  const { user } = useAuth();
  const { selectedFamily } = useFamily();
  const { items, categories, loading, loadItems, completeItem, uncompleteItem } = useItem();
  
  // ルートパラメータから初期値を取得
  const initialType = route.params?.type;
  const initialSelectAll = route.params?.selectAll;
  const defaultView = route.params?.defaultView || 'list';
  
  // フィルター状態
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>(defaultView);
  const [selectedTypes, setSelectedTypes] = useState<ItemType[]>(() => {
    // selectAllが明示的にtrueの場合は全タイプ
    if (initialSelectAll === true) {
      return ['task', 'event', 'need'];
    }
    // typeパラメータがある場合はそのタイプ
    if (initialType) {
      return [initialType];
    }
    // デフォルトは全タイプ
    return ['task', 'event', 'need'];
  });
  const [hideCompleted, setHideCompleted] = useState(true);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedAssignee, setSelectedAssignee] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<Priority | ''>('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);

  // カレンダー用の状態 - デフォルトで今日の日付を選択
  const getTodayString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  const [selectedDate, setSelectedDate] = useState<string>(getTodayString());

  // 今回のセッションで完了にしたアイテムIDを管理
  const [justCompletedIds, setJustCompletedIds] = useState<Set<string>>(new Set());

  // 画面フォーカス時にパラメータに基づいてフィルタをリセット
  useFocusEffect(
    React.useCallback(() => {
      const paramType = route.params?.type;
      const paramView = route.params?.defaultView;
      const paramSelectAll = route.params?.selectAll;
      
      logger.info('📋 ItemListScreen focused', { paramType, paramView, paramSelectAll });
      
      // 優先順位: selectAll > type
      if (paramSelectAll === true) {
        // selectAllが明示的にtrueの場合は全タイプを選択
        setSelectedTypes(['task', 'event', 'need']);
        logger.info('📋 Filter reset: selectAll=true', { selectedTypes: ['task', 'event', 'need'] });
      } else if (paramSelectAll === false && paramType) {
        // selectAllがfalseで、かつtypeパラメータがある場合はそのタイプを選択
        setSelectedTypes([paramType]);
        logger.info('📋 Filter reset: type specified', { selectedTypes: [paramType] });
      }
      // どちらの条件も満たさない場合は現在の選択を維持（何もしない）
      
      // defaultViewパラメータがある場合はビューモードを設定
      if (paramView) {
        setViewMode(paramView);
      }
      
      // その他のフィルタはリセット
      setHideCompleted(true);
      setSelectedCategoryId('');
      setSelectedAssignee('');
      setPriorityFilter('');
      
      // 完了アイテムのセッション管理もリセット
      setJustCompletedIds(new Set());
      
      logger.info('📋 ItemListScreen focused - filters reset', { 
        paramType, 
        paramView, 
        paramSelectAll,
        selectedTypes: paramSelectAll ? ['task', 'event', 'need'] : paramType ? [paramType] : ['task', 'event', 'need']
      });
    }, [route.params?.type, route.params?.defaultView, route.params?.selectAll])
  );

  useEffect(() => {
    // 画面表示時にアイテムを取得
    const filter: any = {};
    
    if (hideCompleted) filter.isCompleted = false;
    if (selectedCategoryId) filter.categoryId = selectedCategoryId;
    if (selectedAssignee) filter.assignedTo = selectedAssignee;
    
    // 各タイプごとに取得
    if (selectedTypes.includes('task')) {
      loadItems({ ...filter, type: 'task' });
    }
    if (selectedTypes.includes('event')) {
      loadItems({ ...filter, type: 'event' });
    }
    if (selectedTypes.includes('need')) {
      loadItems({ ...filter, type: 'need' });
    }
    
    logger.info('📋 ItemListScreen: アイテムを取得', { selectedTypes, filter });
  }, [hideCompleted, selectedTypes, selectedCategoryId, selectedAssignee]);

  const handleItemPress = (item: ItemResponse) => {
    navigation.navigate('ItemDetail', { itemId: item.itemId });
  };

  const handleCreateItem = () => {
    // タイプが1つだけ選択されている場合はそのタイプで作成
    const type = selectedTypes.length === 1 ? selectedTypes[0] : 'task';
    navigation.navigate('ItemForm', { type });
  };

  const handleToggleComplete = async (item: ItemResponse) => {
    try {
      if (item.isCompleted) {
        await uncompleteItem(item.itemId);
        logger.info('アイテムを未完了に戻しました');
        // 未完了に戻したので、justCompletedIdsから削除
        setJustCompletedIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(item.itemId);
          return newSet;
        });
      } else {
        await completeItem(item.itemId);
        logger.info('アイテムを完了にしました');
        // 完了にしたので、justCompletedIdsに追加
        setJustCompletedIds(prev => new Set(prev).add(item.itemId));
      }
    } catch (error: any) {
      logger.error('アイテムの完了切替エラー:', error);
      const message = error.response?.data?.detail || error.message || 'アイテムの更新に失敗しました';
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

  // タイプ選択の切り替え
  const toggleTypeSelection = (type: ItemType) => {
    setSelectedTypes(prev => {
      if (prev.includes(type)) {
        // 既に選択されている場合は削除（ただし最低1つは残す）
        if (prev.length > 1) {
          return prev.filter(t => t !== type);
        }
        return prev;
      } else {
        // 選択されていない場合は追加
        return [...prev, type];
      }
    });
  };

  // タイプ別の色設定
  const getTypeColor = (type: ItemType) => {
    return {
      task: '#FF9800',
      event: '#2196F3',
      need: '#4CAF50',
    }[type];
  };

  const getTypeLabel = (type: ItemType) => {
    return {
      task: '📋 タスク',
      event: '📅 予定',
      need: '🛒 欲しい物',
    }[type];
  };

  // フィルター適用
  const filteredItems = items
    .filter(item => selectedTypes.includes(item.type))  // タイプフィルター
    .filter(item => {
      // 完了フィルター
      if (hideCompleted && item.isCompleted) {
        // 今回のセッションで完了にしたアイテムは表示する
        if (justCompletedIds.has(item.itemId)) {
          return true;
        }
        return false;
      }
      return true;
    })
    .filter(item => {
      // 優先度フィルター（クライアント側で適用）
      if (priorityFilter && item.priority !== priorityFilter) return false;
      return true;
    })
    .sort((a, b) => {
      // 日付でソート（予定と期限が近い順）
      const aDate = a.startDateTime || a.endDateTime;
      const bDate = b.startDateTime || b.endDateTime;
      
      if (!aDate && !bDate) return 0;
      if (!aDate) return 1;
      if (!bDate) return -1;
      
      return new Date(aDate).getTime() - new Date(bDate).getTime();
    });

  // カレンダー用のマーキング生成
  const getMarkedDates = (): MarkedDates => {
    const marked: MarkedDates = {};

    filteredItems.forEach(item => {
      // アイテムの日付を取得
      const dateStr = item.startDateTime || item.endDateTime;
      if (!dateStr) return;

      // YYYY-MM-DD形式に変換
      const dateKey = dateStr.split('T')[0];

      // マーキングを追加
      if (!marked[dateKey]) {
        marked[dateKey] = { dots: [] };
      }

      const color = getTypeColor(item.type);
      marked[dateKey].dots!.push({ color });
    });

    // 選択日のハイライト
    if (selectedDate && marked[selectedDate]) {
      marked[selectedDate].selected = true;
      marked[selectedDate].selectedColor = '#E3F2FD'; // 淡い青
    } else if (selectedDate) {
      marked[selectedDate] = {
        selected: true,
        selectedColor: '#E3F2FD',
      };
    }

    return marked;
  };

  // 選択日のアイテム一覧
  const getItemsForSelectedDate = (): ItemResponse[] => {
    if (!selectedDate) return [];

    return filteredItems.filter(item => {
      const dateStr = item.startDateTime || item.endDateTime;
      if (!dateStr) return false;

      const dateKey = dateStr.split('T')[0];
      return dateKey === selectedDate;
    });
  };

  // カレンダーの日付タップ処理
  const handleDayPress = (day: { dateString: string }) => {
    logger.info('📅 カレンダー: 日付選択', { date: day.dateString });
    setSelectedDate(day.dateString);
  };

  // メンバー一覧（担当者フィルター用）
  const familyMembers = selectedFamily?.members || [];

  const renderItem = ({ item }: { item: ItemResponse }) => {
    const typeColor = getTypeColor(item.type);
    
    // 優先度マーク
    const priorityEmoji = item.priority ? {
      high: '🔴',
      medium: '🟡',
      low: '🟢',
    }[item.priority] : '';

    // 日時表示
    let dateText = '';
    if (item.type === 'task' && item.endDateTime) {
      const date = new Date(item.endDateTime);
      dateText = `期限: ${date.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}`;
    } else if (item.type === 'event' && item.startDateTime) {
      const date = new Date(item.startDateTime);
      dateText = date.toLocaleString('ja-JP', {
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } else if (item.type === 'need' && item.endDateTime) {
      const date = new Date(item.endDateTime);
      dateText = `期限: ${date.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}`;
    }

    return (
      <TouchableOpacity
        style={[styles.itemCard, item.isCompleted && styles.itemCardCompleted]}
        onPress={() => handleItemPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.itemLeft}>
          <TouchableOpacity
            style={[styles.checkbox, item.isCompleted && { backgroundColor: typeColor, borderColor: typeColor }]}
            onPress={() => handleToggleComplete(item)}
            activeOpacity={0.7}
          >
            {item.isCompleted && <Text style={styles.checkboxCheck}>✓</Text>}
          </TouchableOpacity>
          
          <View style={styles.itemInfo}>
            <View style={styles.itemTitleRow}>
              <View style={[styles.typeIndicator, { backgroundColor: typeColor }]} />
              {priorityEmoji && <Text style={styles.priorityEmoji}>{priorityEmoji}</Text>}
              <Text style={[styles.itemTitle, item.isCompleted && styles.itemTitleCompleted]}>
                {item.title}
              </Text>
            </View>
            <View style={styles.itemMeta}>
              {dateText && dateText.trim() !== '' ? (
                <Text style={styles.itemMetaText}>{dateText}</Text>
              ) : null}
              {item.categoryName && item.categoryName.trim() !== '' ? (
                <Text style={styles.itemMetaText}>• {item.categoryName}</Text>
              ) : null}
              {item.assignedToName && item.assignedToName.trim() !== '' ? (
                <Text style={styles.itemMetaText}>• {item.assignedToName}</Text>
              ) : null}
              {item.location && item.location.trim() !== '' ? (
                <Text style={styles.itemMetaText}>• {item.location}</Text>
              ) : null}
              {item.recurrence ? (
                <Text style={styles.itemMetaText}>
                  • 🔄 {
                    item.recurrence.frequency === 'daily' ? '毎日' :
                    item.recurrence.frequency === 'weekly' ? '毎週' :
                    item.recurrence.frequency === 'monthly' ? '毎月' :
                    '毎年'
                  }
                </Text>
              ) : null}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // カレンダービューのレンダリング
  const renderCalendarView = () => {
    const selectedDateItems = getItemsForSelectedDate();

    return (
      <View style={styles.calendarContainer}>
        <Calendar
          markedDates={getMarkedDates()}
          onDayPress={handleDayPress}
          markingType="multi-dot"
          theme={{
            todayTextColor: '#2196F3',
            selectedDayBackgroundColor: '#2196F3',
            selectedDayTextColor: '#fff',
            arrowColor: '#2196F3',
            monthTextColor: '#333',
            textMonthFontWeight: 'bold',
            textDayFontSize: 16,
            textMonthFontSize: 18,
          }}
          style={styles.calendar}
        />

        {/* 選択日のアイテム一覧 */}
        <View style={styles.selectedDateSection}>
          <View style={styles.selectedDateHeader}>
            <Text style={styles.selectedDateTitle}>
              {new Date(selectedDate).toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'short'
              })}
            </Text>
            {selectedDateItems.length > 0 && (
              <Text style={styles.selectedDateCount}>
                {selectedDateItems.length}件
              </Text>
            )}
          </View>

          {selectedDateItems.length === 0 ? (
            <View style={styles.emptyDateContainer}>
              <Text style={styles.emptyDateText}>この日の予定はありません</Text>
            </View>
          ) : (
            <FlatList
              data={selectedDateItems}
              renderItem={renderItem}
              keyExtractor={(item) => item.itemId}
              contentContainerStyle={styles.selectedDateList}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* ヘッダー（統一 - 高さ小さめ） */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>一覧</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleCreateItem}
          activeOpacity={0.7}
        >
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* 表示モード切替（リスト/カレンダー） - 最上部 */}
      <View style={styles.viewModeContainer}>
        <TouchableOpacity
          style={[styles.viewModeButton, viewMode === 'list' && styles.viewModeButtonActive]}
          onPress={() => setViewMode('list')}
          activeOpacity={0.7}
        >
          <Text style={[styles.viewModeText, viewMode === 'list' && styles.viewModeTextActive]}>
            リスト
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.viewModeButton, viewMode === 'calendar' && styles.viewModeButtonActive]}
          onPress={() => setViewMode('calendar')}
          activeOpacity={0.7}
        >
          <Text style={[styles.viewModeText, viewMode === 'calendar' && styles.viewModeTextActive]}>
            カレンダー
          </Text>
        </TouchableOpacity>
      </View>

      {/* フィルター（1行） */}
      <View style={styles.filterRow}>
        {/* 種類選択（プルダウン風） */}
        <TouchableOpacity
          style={styles.filterItem}
          onPress={() => setShowTypeModal(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.filterItemText}>
            種類: {
              selectedTypes.length === 3 ? 'すべて' :
              selectedTypes.map(t => 
                t === 'task' ? 'タスク' : t === 'event' ? '予定' : '欲しい物'
              ).join(', ')
            }
          </Text>
          <Text style={styles.filterItemArrow}>▼</Text>
        </TouchableOpacity>

        {/* 完了を非表示チェックボックス */}
        <TouchableOpacity
          style={styles.checkboxFilter}
          onPress={() => setHideCompleted(!hideCompleted)}
          activeOpacity={0.7}
        >
          <View style={[styles.checkboxSmall, hideCompleted && styles.checkboxSmallChecked]}>
            {hideCompleted && <Text style={styles.checkboxSmallCheck}>✓</Text>}
          </View>
          <Text style={styles.checkboxFilterText}>完了を非表示</Text>
        </TouchableOpacity>

        {/* 詳細フィルター */}
        <TouchableOpacity
          style={styles.filterIconButton}
          onPress={() => setShowFilterModal(true)}
          activeOpacity={0.7}
        >
          <FilterIcon size={24} color="#666" />
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* メインコンテンツ */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
        </View>
      ) : viewMode === 'list' ? (
        // リスト表示
        filteredItems.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>アイテムがありません</Text>
            <Text style={styles.emptySubtext}>右上の + ボタンから作成できます</Text>
          </View>
        ) : (
          <FlatList
            data={filteredItems}
            renderItem={renderItem}
            keyExtractor={(item) => item.itemId}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )
      ) : (
        // カレンダー表示
        renderCalendarView()
      )}

      {/* 種類選択モーダル */}
      <Modal
        visible={showTypeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTypeModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowTypeModal(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>種類を選択</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowTypeModal(false)}
              >
                <Text style={styles.modalCloseText}>×</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalContent}>
              <Text style={styles.modalSubtitle}>複数選択可能（最低1つ選択必須）</Text>
              
              {/* すべて選択 */}
              <TouchableOpacity
                style={styles.checkboxOption}
                onPress={() => {
                  const allTypes: ItemType[] = ['task', 'event', 'need'];
                  if (selectedTypes.length === allTypes.length) {
                    // すべて選択されている場合は解除（ただし最低1つ必要なのでタスクだけ残す）
                    setSelectedTypes(['task']);
                  } else {
                    // すべてを選択
                    setSelectedTypes(allTypes);
                  }
                }}
              >
                <View style={[
                  styles.checkboxSmall,
                  selectedTypes.length === 3 && styles.checkboxSmallChecked
                ]}>
                  {selectedTypes.length === 3 && <Text style={styles.checkboxSmallCheck}>✓</Text>}
                </View>
                <Text style={[styles.checkboxOptionText, styles.checkboxOptionTextBold]}>
                  ✨ すべて
                </Text>
              </TouchableOpacity>

              <View style={styles.divider} />
              
              <TouchableOpacity
                style={styles.checkboxOption}
                onPress={() => toggleTypeSelection('task')}
              >
                <View style={[
                  styles.checkboxSmall,
                  selectedTypes.includes('task') && styles.checkboxSmallChecked
                ]}>
                  {selectedTypes.includes('task') && <Text style={styles.checkboxSmallCheck}>✓</Text>}
                </View>
                <Text style={styles.checkboxOptionText}>📋 タスク</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.checkboxOption}
                onPress={() => toggleTypeSelection('event')}
              >
                <View style={[
                  styles.checkboxSmall,
                  selectedTypes.includes('event') && styles.checkboxSmallChecked
                ]}>
                  {selectedTypes.includes('event') && <Text style={styles.checkboxSmallCheck}>✓</Text>}
                </View>
                <Text style={styles.checkboxOptionText}>📅 予定</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.checkboxOption}
                onPress={() => toggleTypeSelection('need')}
              >
                <View style={[
                  styles.checkboxSmall,
                  selectedTypes.includes('need') && styles.checkboxSmallChecked
                ]}>
                  {selectedTypes.includes('need') && <Text style={styles.checkboxSmallCheck}>✓</Text>}
                </View>
                <Text style={styles.checkboxOptionText}>🛒 欲しい物</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalApplyButton}
                onPress={() => setShowTypeModal(false)}
              >
                <Text style={styles.modalApplyText}>適用</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 詳細フィルターモーダル */}
      <Modal
        visible={showFilterModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowFilterModal(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={styles.modalContainerLarge}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>詳細フィルター</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowFilterModal(false)}
              >
                <Text style={styles.modalCloseText}>×</Text>
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
                      !selectedCategoryId && styles.filterOptionActive
                    ]}
                    onPress={() => setSelectedCategoryId('')}
                  >
                    <Text style={styles.filterOptionText}>すべて</Text>
                  </TouchableOpacity>
                  {categories.map(category => (
                    <TouchableOpacity
                      key={category.categoryId}
                      style={[
                        styles.filterOption,
                        selectedCategoryId === category.categoryId && styles.filterOptionActive
                      ]}
                      onPress={() => setSelectedCategoryId(category.categoryId)}
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
                      !selectedAssignee && styles.filterOptionActive
                    ]}
                    onPress={() => setSelectedAssignee('')}
                  >
                    <Text style={styles.filterOptionText}>すべて</Text>
                  </TouchableOpacity>
                  {familyMembers.map(member => (
                    <TouchableOpacity
                      key={member.userId}
                      style={[
                        styles.filterOption,
                        selectedAssignee === member.userId && styles.filterOptionActive
                      ]}
                      onPress={() => setSelectedAssignee(member.userId)}
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
                      !priorityFilter && styles.filterOptionActive
                    ]}
                    onPress={() => setPriorityFilter('')}
                  >
                    <Text style={styles.filterOptionText}>すべて</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.filterOption,
                      priorityFilter === 'high' && styles.filterOptionActive
                    ]}
                    onPress={() => setPriorityFilter('high')}
                  >
                    <Text style={styles.filterOptionText}>🔴 高</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.filterOption,
                      priorityFilter === 'medium' && styles.filterOptionActive
                    ]}
                    onPress={() => setPriorityFilter('medium')}
                  >
                    <Text style={styles.filterOptionText}>🟡 中</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.filterOption,
                      priorityFilter === 'low' && styles.filterOptionActive
                    ]}
                    onPress={() => setPriorityFilter('low')}
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
              >
                <Text style={styles.clearButtonText}>クリア</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyButton}
                onPress={() => setShowFilterModal(false)}
              >
                <Text style={styles.applyButtonText}>適用</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: '#2196F3',
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 32,
    color: '#fff',
    fontWeight: 'bold',
  },
  viewModeContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  viewModeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  viewModeButtonActive: {
    borderBottomColor: '#2196F3',
  },
  viewModeText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#999',
  },
  viewModeTextActive: {
    color: '#2196F3',
    fontWeight: '600',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    marginRight: 12,
  },
  filterItemText: {
    fontSize: 14,
    color: '#333',
    marginRight: 6,
  },
  filterItemArrow: {
    fontSize: 10,
    color: '#999',
  },
  checkboxFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  checkboxFilterText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 6,
  },
  checkboxSmall: {
    width: 18,
    height: 18,
    borderRadius: 3,
    borderWidth: 2,
    borderColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  checkboxSmallChecked: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  checkboxSmallCheck: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  filterIconButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 18,
    position: 'relative',
  },
  filterIcon: {
    fontSize: 18,
  },
  filterBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#f44336',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  
  // カレンダービュー
  calendarContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  calendar: {
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  selectedDateSection: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  selectedDateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  selectedDateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  selectedDateCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2196F3',
  },
  selectedDateList: {
    padding: 16,
  },
  emptyDateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyDateText: {
    fontSize: 16,
    color: '#999',
  },
  noDateSelectedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  noDateSelectedEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  noDateSelectedText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
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
    alignItems: 'flex-start',
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
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ccc',
    marginRight: 12,
    marginTop: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxCheck: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  itemInfo: {
    flex: 1,
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  typeIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  priorityEmoji: {
    fontSize: 12,
    marginRight: 6,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  itemTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  itemMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  itemMetaText: {
    fontSize: 12,
    color: '#666',
    marginRight: 6,
    marginBottom: 2,
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalContainerLarge: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
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
  modalSubtitle: {
    fontSize: 13,
    color: '#999',
    marginBottom: 16,
  },
  checkboxOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  checkboxOptionText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  checkboxOptionTextBold: {
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 12,
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
  },
  filterOption: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginRight: 8,
    marginBottom: 8,
  },
  filterOptionActive: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  filterOptionText: {
    fontSize: 14,
    color: '#666',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  clearButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    marginRight: 12,
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  applyButton: {
    flex: 2,  // クリアボタンの2倍の幅
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#2196F3',
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  modalApplyButton: {
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#2196F3',
    alignItems: 'center',
  },
  modalApplyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});