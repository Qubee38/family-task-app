import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useItem } from '../../contexts/ItemContext';
import { useFamily } from '../../contexts/FamilyContext';
import { 
  ItemCreateRequest, 
  ItemUpdateRequest, 
  ItemType, 
  Priority, 
  Visibility,
  RecurrenceModel 
} from '../../types/item';
import { RootStackParamList } from '../../types/navigation.types';
import { logger } from '../../utils/logger';

type ItemFormScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;
type ItemFormScreenRouteProp = RouteProp<RootStackParamList, 'ItemForm'>;

export default function ItemFormScreen() {
  const navigation = useNavigation<ItemFormScreenNavigationProp>();
  const route = useRoute<ItemFormScreenRouteProp>();
  const { selectedFamily } = useFamily();
  const { items, categories, createItem, updateItem, loading } = useItem();

  // ルートパラメータ
  const itemId = route.params?.itemId;
  const initialType = route.params?.type;
  const isEditMode = !!itemId;
  const editingItem = isEditMode ? items.find(item => item.itemId === itemId) : null;

  // タイプ選択（編集時は変更不可）
  const [itemType, setItemType] = useState<ItemType>(
    editingItem?.type || initialType || 'task'
  );

  // 共通フィールド
  const [title, setTitle] = useState(editingItem?.title || '');
  const [selectedCategoryId, setSelectedCategoryId] = useState(editingItem?.categoryId || '');
  const [visibility, setVisibility] = useState<Visibility>(editingItem?.visibility || 'family');
  const [location, setLocation] = useState(editingItem?.location || '');

  // タスク・必要物用フィールド
  const [priority, setPriority] = useState<Priority>(editingItem?.priority || 'medium');

  // タスク・予定用フィールド（期限・日時）
  const [endDate, setEndDate] = useState(
    editingItem?.endDateTime 
      ? new Date(editingItem.endDateTime).toISOString().split('T')[0] 
      : ''
  );
  const [endTime, setEndTime] = useState(
    editingItem?.endDateTime 
      ? new Date(editingItem.endDateTime).toTimeString().slice(0, 5) 
      : ''
  );

  // 予定用フィールド
  const [startDate, setStartDate] = useState(
    editingItem?.startDateTime 
      ? new Date(editingItem.startDateTime).toISOString().split('T')[0] 
      : ''
  );
  const [startTime, setStartTime] = useState(
    editingItem?.startDateTime 
      ? new Date(editingItem.startDateTime).toTimeString().slice(0, 5) 
      : ''
  );
  const [hasRecurrence, setHasRecurrence] = useState(!!editingItem?.recurrence);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>(
    editingItem?.recurrence?.frequency || 'weekly'
  );
  const [recurrenceInterval, setRecurrenceInterval] = useState(
    editingItem?.recurrence?.interval?.toString() || '1'
  );

  // カテゴリ選択モーダル
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  // タイプごとのカテゴリソート
  const sortedCategories = [...categories].sort((a, b) => {
    const aHasType = a.suggestedFor.includes(itemType);
    const bHasType = b.suggestedFor.includes(itemType);
    
    if (aHasType && !bHasType) return -1;
    if (!aHasType && bHasType) return 1;
    
    if (b.usageCount !== a.usageCount) {
      return b.usageCount - a.usageCount;
    }
    
    return a.name.localeCompare(b.name, 'ja');
  });

  // 初期カテゴリ選択
  useEffect(() => {
    if (sortedCategories.length > 0 && !selectedCategoryId) {
      setSelectedCategoryId(sortedCategories[0].categoryId);
    }
  }, [sortedCategories, itemType]);

  const selectedCategory = categories.find(cat => cat.categoryId === selectedCategoryId);

  // タイプ変更時の処理
  const handleTypeChange = (type: ItemType) => {
    if (isEditMode) return; // 編集時は変更不可
    setItemType(type);
    // カテゴリをリセット
    setSelectedCategoryId('');
  };

  const handleSave = async () => {
    if (!title.trim()) {
      const message = 'タイトルを入力してください';
      if (Platform.OS === 'web') {
        alert(message);
      } else {
        Alert.alert('エラー', message);
      }
      return;
    }

    if (!selectedCategoryId) {
      const message = 'カテゴリを選択してください';
      if (Platform.OS === 'web') {
        alert(message);
      } else {
        Alert.alert('エラー', message);
      }
      return;
    }

    // タイプ別バリデーション
    if (itemType === 'event') {
      if (!startDate || !startTime) {
        const message = '開始日時を入力してください';
        if (Platform.OS === 'web') {
          alert(message);
        } else {
          Alert.alert('エラー', message);
        }
        return;
      }
    }

    try {
      const commonData = {
        title: title.trim(),
        categoryId: selectedCategoryId,
        visibility,
        location: location.trim() || undefined,
      };

      if (isEditMode && itemId) {
        // 編集モード
        const data: ItemUpdateRequest = {
          ...commonData,
        };

        // タイプ別フィールド
        if (itemType === 'task') {
          data.priority = priority;
          if (endDate && endTime) {
            data.endDateTime = new Date(`${endDate}T${endTime}`).toISOString();
          }
        } else if (itemType === 'event') {
          data.startDateTime = new Date(`${startDate}T${startTime}`).toISOString();
          if (endDate && endTime) {
            data.endDateTime = new Date(`${endDate}T${endTime}`).toISOString();
          }
          if (hasRecurrence) {
            data.recurrence = {
              frequency: recurrenceFrequency,
              interval: parseInt(recurrenceInterval) || 1,
            };
          }
        } else if (itemType === 'need') {
          data.priority = priority;
        }

        await updateItem(itemId, data);
        logger.info(`${itemType}更新成功`);
      } else {
        // 作成モード
        const data: ItemCreateRequest = {
          type: itemType,
          ...commonData,
        };

        // タイプ別フィールド
        if (itemType === 'task') {
          data.priority = priority;
          if (endDate && endTime) {
            data.endDateTime = new Date(`${endDate}T${endTime}`).toISOString();
          }
        } else if (itemType === 'event') {
          data.startDateTime = new Date(`${startDate}T${startTime}`).toISOString();
          if (endDate && endTime) {
            data.endDateTime = new Date(`${endDate}T${endTime}`).toISOString();
          }
          if (hasRecurrence) {
            data.recurrence = {
              frequency: recurrenceFrequency,
              interval: parseInt(recurrenceInterval) || 1,
            };
          }
        } else if (itemType === 'need') {
          data.priority = priority;
        }

        await createItem(data);
        logger.info(`${itemType}作成成功`);
      }
      
      navigation.goBack();
    } catch (error: any) {
      logger.error('アイテム保存エラー:', error);
      const message = error.response?.data?.detail || error.message || 'アイテムの保存に失敗しました';
      if (Platform.OS === 'web') {
        alert(message);
      } else {
        Alert.alert('エラー', message);
      }
    }
  };

  // ヘッダーの色とタイトル
  const headerStyle = {
    task: { bg: '#2196F3', title: isEditMode ? 'タスクを編集' : '新しいタスク' },
    event: { bg: '#4CAF50', title: isEditMode ? '予定を編集' : '新しい予定' },
    need: { bg: '#FF9800', title: isEditMode ? '必要物を編集' : '新しい必要物' },
  }[itemType];

  return (
    <View style={styles.container}>
      {/* ヘッダー */}
      <View style={[styles.header, { backgroundColor: headerStyle.bg }]}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Text style={styles.cancelButtonText}>キャンセル</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{headerStyle.title}</Text>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          activeOpacity={0.7}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>保存</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* タイプ選択（新規作成時のみ） */}
        {!isEditMode && (
          <View style={styles.section}>
            <Text style={styles.label}>種類 *</Text>
            <View style={styles.typeContainer}>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  itemType === 'task' && styles.typeButtonTask,
                ]}
                onPress={() => handleTypeChange('task')}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.typeButtonText,
                  itemType === 'task' && styles.typeButtonTextActive,
                ]}>
                  📋 タスク
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  itemType === 'event' && styles.typeButtonEvent,
                ]}
                onPress={() => handleTypeChange('event')}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.typeButtonText,
                  itemType === 'event' && styles.typeButtonTextActive,
                ]}>
                  📅 予定
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  itemType === 'need' && styles.typeButtonNeed,
                ]}
                onPress={() => handleTypeChange('need')}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.typeButtonText,
                  itemType === 'need' && styles.typeButtonTextActive,
                ]}>
                  🛒 必要物
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* タイトル */}
        <View style={styles.section}>
          <Text style={styles.label}>
            {itemType === 'need' ? '必要物' : 'タイトル'} *
          </Text>
          <TextInput
            style={styles.input}
            placeholder={
              itemType === 'task' ? '例: 庭の手入れ' :
              itemType === 'event' ? '例: 歯医者の予約' :
              '例: 牛乳'
            }
            placeholderTextColor="#999"
            value={title}
            onChangeText={setTitle}
            autoFocus={!isEditMode}
          />
        </View>

        {/* カテゴリ */}
        <View style={styles.section}>
          <Text style={styles.label}>カテゴリ *</Text>
          <TouchableOpacity
            style={styles.picker}
            onPress={() => setShowCategoryPicker(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.pickerText}>
              {selectedCategory ? selectedCategory.name : 'カテゴリを選択'}
            </Text>
            <Text style={styles.pickerArrow}>▼</Text>
          </TouchableOpacity>
        </View>

        {/* 優先度（タスク・必要物のみ） */}
        {(itemType === 'task' || itemType === 'need') && (
          <View style={styles.section}>
            <Text style={styles.label}>優先度</Text>
            <View style={styles.priorityContainer}>
              <TouchableOpacity
                style={[
                  styles.priorityButton,
                  priority === 'high' && styles.priorityButtonHigh,
                ]}
                onPress={() => setPriority('high')}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.priorityButtonText,
                  priority === 'high' && styles.priorityButtonTextActive,
                ]}>
                  🔴 高
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.priorityButton,
                  priority === 'medium' && styles.priorityButtonMedium,
                ]}
                onPress={() => setPriority('medium')}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.priorityButtonText,
                  priority === 'medium' && styles.priorityButtonTextActive,
                ]}>
                  🟡 中
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.priorityButton,
                  priority === 'low' && styles.priorityButtonLow,
                ]}
                onPress={() => setPriority('low')}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.priorityButtonText,
                  priority === 'low' && styles.priorityButtonTextActive,
                ]}>
                  🟢 低
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* 開始日時（予定のみ） */}
        {itemType === 'event' && (
          <View style={styles.section}>
            <Text style={styles.label}>開始日時 *</Text>
            <View style={styles.dateTimeRow}>
              <TextInput
                style={[styles.input, styles.dateInput]}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#999"
                value={startDate}
                onChangeText={setStartDate}
              />
              <TextInput
                style={[styles.input, styles.timeInput]}
                placeholder="HH:MM"
                placeholderTextColor="#999"
                value={startTime}
                onChangeText={setStartTime}
              />
            </View>
            <Text style={styles.hint}>形式: 2024-12-15  10:00</Text>
          </View>
        )}

        {/* 期限・終了日時 */}
        {(itemType === 'task' || itemType === 'event') && (
          <View style={styles.section}>
            <Text style={styles.label}>
              {itemType === 'task' ? '期限' : '終了日時'}
            </Text>
            <View style={styles.dateTimeRow}>
              <TextInput
                style={[styles.input, styles.dateInput]}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#999"
                value={endDate}
                onChangeText={setEndDate}
              />
              <TextInput
                style={[styles.input, styles.timeInput]}
                placeholder="HH:MM"
                placeholderTextColor="#999"
                value={endTime}
                onChangeText={setEndTime}
              />
            </View>
            <Text style={styles.hint}>形式: 2024-12-15  {itemType === 'task' ? '23:59' : '11:00'}</Text>
          </View>
        )}

        {/* 繰り返し設定（予定のみ） */}
        {itemType === 'event' && (
          <View style={styles.section}>
            <View style={styles.switchRow}>
              <Text style={styles.label}>繰り返し設定</Text>
              <TouchableOpacity
                style={[styles.switch, hasRecurrence && styles.switchActive]}
                onPress={() => setHasRecurrence(!hasRecurrence)}
                activeOpacity={0.7}
              >
                <View style={[styles.switchThumb, hasRecurrence && styles.switchThumbActive]} />
              </TouchableOpacity>
            </View>
            
            {hasRecurrence && (
              <>
                <View style={styles.recurrenceRow}>
                  <TouchableOpacity
                    style={[styles.recurrenceButton, recurrenceFrequency === 'daily' && styles.recurrenceButtonActive]}
                    onPress={() => setRecurrenceFrequency('daily')}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.recurrenceButtonText, recurrenceFrequency === 'daily' && styles.recurrenceButtonTextActive]}>
                      毎日
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.recurrenceButton, recurrenceFrequency === 'weekly' && styles.recurrenceButtonActive]}
                    onPress={() => setRecurrenceFrequency('weekly')}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.recurrenceButtonText, recurrenceFrequency === 'weekly' && styles.recurrenceButtonTextActive]}>
                      毎週
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.recurrenceButton, recurrenceFrequency === 'monthly' && styles.recurrenceButtonActive]}
                    onPress={() => setRecurrenceFrequency('monthly')}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.recurrenceButtonText, recurrenceFrequency === 'monthly' && styles.recurrenceButtonTextActive]}>
                      毎月
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.recurrenceButton, recurrenceFrequency === 'yearly' && styles.recurrenceButtonActive]}
                    onPress={() => setRecurrenceFrequency('yearly')}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.recurrenceButtonText, recurrenceFrequency === 'yearly' && styles.recurrenceButtonTextActive]}>
                      毎年
                    </Text>
                  </TouchableOpacity>
                </View>
                
                <View style={styles.intervalRow}>
                  <Text style={styles.intervalLabel}>間隔:</Text>
                  <TextInput
                    style={styles.intervalInput}
                    placeholder="1"
                    placeholderTextColor="#999"
                    value={recurrenceInterval}
                    onChangeText={setRecurrenceInterval}
                    keyboardType="number-pad"
                  />
                  <Text style={styles.intervalUnit}>
                    {recurrenceFrequency === 'daily' ? '日ごと' :
                     recurrenceFrequency === 'weekly' ? '週ごと' :
                     recurrenceFrequency === 'monthly' ? 'ヶ月ごと' :
                     '年ごと'}
                  </Text>
                </View>
              </>
            )}
          </View>
        )}

        {/* 場所 */}
        <View style={styles.section}>
          <Text style={styles.label}>
            {itemType === 'need' ? '購入場所' : '場所'}
          </Text>
          <TextInput
            style={styles.input}
            placeholder={
              itemType === 'need' ? '例: スーパー' : '例: 自宅の庭'
            }
            placeholderTextColor="#999"
            value={location}
            onChangeText={setLocation}
          />
        </View>

        {/* 公開範囲 */}
        <View style={styles.section}>
          <Text style={styles.label}>公開範囲</Text>
          <View style={styles.visibilityContainer}>
            <TouchableOpacity
              style={[
                styles.visibilityButton,
                visibility === 'family' && styles.visibilityButtonActive,
              ]}
              onPress={() => setVisibility('family')}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.visibilityButtonText,
                visibility === 'family' && styles.visibilityButtonTextActive,
              ]}>
                👥 家族全体
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.visibilityButton,
                visibility === 'private' && styles.visibilityButtonActive,
              ]}
              onPress={() => setVisibility('private')}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.visibilityButtonText,
                visibility === 'private' && styles.visibilityButtonTextActive,
              ]}>
                🔒 自分のみ
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* カテゴリ選択モーダル */}
      <Modal
        visible={showCategoryPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCategoryPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCategoryPicker(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>カテゴリを選択</Text>
              <TouchableOpacity
                onPress={() => setShowCategoryPicker(false)}
                style={styles.modalCloseButton}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent}>
              {sortedCategories.map((category) => (
                <TouchableOpacity
                  key={category.categoryId}
                  style={[
                    styles.modalOption,
                    category.categoryId === selectedCategoryId && styles.modalOptionSelected,
                  ]}
                  onPress={() => {
                    setSelectedCategoryId(category.categoryId);
                    setShowCategoryPicker(false);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.modalOptionContent}>
                    <Text style={styles.modalOptionText}>{category.name}</Text>
                    {category.usageCount > 0 && (
                      <Text style={styles.modalOptionBadge}>{category.usageCount}</Text>
                    )}
                  </View>
                  {category.categoryId === selectedCategoryId && (
                    <Text style={styles.modalOptionCheck}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
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
  header: {
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cancelButton: {
    padding: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#fff',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  saveButton: {
    padding: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  hint: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  picker: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerText: {
    fontSize: 16,
    color: '#333',
  },
  pickerArrow: {
    fontSize: 12,
    color: '#999',
  },
  typeContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  typeButtonTask: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  typeButtonEvent: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  typeButtonNeed: {
    backgroundColor: '#FF9800',
    borderColor: '#FF9800',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  typeButtonTextActive: {
    color: '#fff',
  },
  priorityContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  priorityButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  priorityButtonHigh: {
    backgroundColor: '#f44336',
    borderColor: '#f44336',
  },
  priorityButtonMedium: {
    backgroundColor: '#FF9800',
    borderColor: '#FF9800',
  },
  priorityButtonLow: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  priorityButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  priorityButtonTextActive: {
    color: '#fff',
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateInput: {
    flex: 2,
  },
  timeInput: {
    flex: 1,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  switch: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#ccc',
    padding: 2,
    justifyContent: 'center',
  },
  switchActive: {
    backgroundColor: '#4CAF50',
  },
  switchThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#fff',
  },
  switchThumbActive: {
    alignSelf: 'flex-end',
  },
  recurrenceRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  recurrenceButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  recurrenceButtonActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  recurrenceButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  recurrenceButtonTextActive: {
    color: '#fff',
  },
  intervalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  intervalLabel: {
    fontSize: 14,
    color: '#666',
  },
  intervalInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 8,
    fontSize: 16,
    color: '#333',
    width: 60,
    textAlign: 'center',
  },
  intervalUnit: {
    fontSize: 14,
    color: '#666',
  },
  visibilityContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  visibilityButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  visibilityButtonActive: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  visibilityButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  visibilityButtonTextActive: {
    color: '#fff',
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
    maxHeight: 400,
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalOptionSelected: {
    backgroundColor: '#f0f8ff',
  },
  modalOptionContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalOptionText: {
    fontSize: 16,
    color: '#333',
  },
  modalOptionBadge: {
    backgroundColor: '#e0e0e0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    fontSize: 12,
    color: '#666',
  },
  modalOptionCheck: {
    fontSize: 20,
    color: '#2196F3',
    fontWeight: 'bold',
  },
});