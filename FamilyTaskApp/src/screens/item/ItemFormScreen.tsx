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
import { useAuth } from '../../contexts/AuthContext';
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
  const { user } = useAuth();
  const { selectedFamily } = useFamily();
  const { items, categories, createItem, updateItem, loading } = useItem();

  // ルートパラメータ
  const itemId = route.params?.itemId;
  const initialType = route.params?.type;
  const isEditMode = !!itemId;
  const editingItem = isEditMode ? items.find(item => item.itemId === itemId) : null;

  // タイプ選択（編集時は変更不可、デフォルトはタスク）
  const [itemType, setItemType] = useState<ItemType>(
    editingItem?.type || initialType || 'task'
  );

  // 共通フィールド
  const [title, setTitle] = useState(editingItem?.title || '');
  const [selectedCategoryId, setSelectedCategoryId] = useState(editingItem?.categoryId || '');
  const [isPrivate, setIsPrivate] = useState(editingItem?.visibility === 'private');
  const [location, setLocation] = useState(editingItem?.location || '');
  
  // 担当者選択（新規作成時はデフォルトで現在のユーザー）
  const [assignedTo, setAssignedTo] = useState<string>(
    editingItem?.assignedTo || user?.uid || ''
  );

  // タスク・欲しい物・予定用フィールド
  const [priority, setPriority] = useState<Priority>(editingItem?.priority || 'medium');

  // タスク・欲しい物用フィールド（期限）
  const [endDate, setEndDate] = useState(
    editingItem?.endDateTime 
      ? new Date(editingItem.endDateTime).toISOString().split('T')[0] 
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
  const [endDateEvent, setEndDateEvent] = useState(
    editingItem?.endDateTime 
      ? new Date(editingItem.endDateTime).toISOString().split('T')[0] 
      : ''
  );
  const [endTime, setEndTime] = useState(
    editingItem?.endDateTime 
      ? new Date(editingItem.endDateTime).toTimeString().slice(0, 5) 
      : ''
  );
  const [hasRecurrence, setHasRecurrence] = useState(!!editingItem?.recurrence);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>(
    editingItem?.recurrence?.frequency || 'weekly'
  );
  const [recurrenceInterval, setRecurrenceInterval] = useState(
    editingItem?.recurrence?.interval?.toString() || '1'
  );

  // モーダル状態
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showAssigneePicker, setShowAssigneePicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerType, setDatePickerType] = useState<'start' | 'end' | 'endEvent'>('start');
  const [tempDate, setTempDate] = useState('');

  // デフォルト担当者を現在のユーザーに設定（新規作成時のみ）
  useEffect(() => {
    if (!isEditMode && user?.uid && !assignedTo) {
      setAssignedTo(user.uid);
    }
  }, [user, isEditMode, assignedTo]);

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

  // 家族メンバー一覧
  const familyMembers = selectedFamily?.members || [];
  const selectedMember = familyMembers.find(m => m.userId === assignedTo);

  // タイプ変更時の処理
  const handleTypeChange = (type: ItemType) => {
    if (isEditMode) return; // 編集時は変更不可
    setItemType(type);
    // カテゴリをリセット
    setSelectedCategoryId('');
  };

  // 日付選択を開く
  const openDatePicker = (type: 'start' | 'end' | 'endEvent') => {
    setDatePickerType(type);
    if (type === 'start') {
      setTempDate(startDate);
    } else if (type === 'end') {
      setTempDate(endDate);
    } else {
      setTempDate(endDateEvent);
    }
    setShowDatePicker(true);
  };

  // 日付選択を適用
  const applyDateSelection = () => {
    if (datePickerType === 'start') {
      setStartDate(tempDate);
      // 開始日が選択されたら終了日も自動的に開始日に合わせる
      if (!endDateEvent) {
        setEndDateEvent(tempDate);
      }
    } else if (datePickerType === 'end') {
      setEndDate(tempDate);
    } else {
      setEndDateEvent(tempDate);
    }
    setShowDatePicker(false);
  };

  // 簡易カレンダー（月表示）
  const generateCalendar = () => {
    const baseDate = tempDate ? new Date(tempDate) : new Date();
    const year = baseDate.getFullYear();
    const month = baseDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();
    
    const days = [];
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    
    return { year, month, days };
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

    if (!assignedTo) {
      const message = '担当者を選択してください';
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
        assignedTo: assignedTo, // 担当者を追加
        visibility: (isPrivate ? 'private' : 'family') as Visibility,
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
          if (endDate) {
            data.endDateTime = new Date(`${endDate}T23:59:59`).toISOString();
          }
        } else if (itemType === 'event') {
          data.priority = priority;
          data.startDateTime = new Date(`${startDate}T${startTime}`).toISOString();
          if (endDateEvent && endTime) {
            data.endDateTime = new Date(`${endDateEvent}T${endTime}`).toISOString();
          }
          if (hasRecurrence) {
            data.recurrence = {
              frequency: recurrenceFrequency,
              interval: parseInt(recurrenceInterval) || 1,
            };
          }
        } else if (itemType === 'need') {
          data.priority = priority;
          if (endDate) {
            data.endDateTime = new Date(`${endDate}T23:59:59`).toISOString();
          }
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
          if (endDate) {
            data.endDateTime = new Date(`${endDate}T23:59:59`).toISOString();
          }
        } else if (itemType === 'event') {
          data.priority = priority;
          data.startDateTime = new Date(`${startDate}T${startTime}`).toISOString();
          if (endDateEvent && endTime) {
            data.endDateTime = new Date(`${endDateEvent}T${endTime}`).toISOString();
          }
          if (hasRecurrence) {
            data.recurrence = {
              frequency: recurrenceFrequency,
              interval: parseInt(recurrenceInterval) || 1,
            };
          }
        } else if (itemType === 'need') {
          data.priority = priority;
          if (endDate) {
            data.endDateTime = new Date(`${endDate}T23:59:59`).toISOString();
          }
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

  // タイプ別のラベル
  const typeLabels = {
    task: '📋 タスク',
    event: '📅 予定',
    need: '🛒 欲しい物',
  };

  const calendar = generateCalendar();

  return (
    <View style={styles.container}>
      {/* ヘッダー（統一 - 高さ小さめ） */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Text style={styles.cancelButtonText}>キャンセル</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEditMode ? '編集' : '新規作成'}
        </Text>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={loading}
          activeOpacity={0.7}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>保存</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* タイプ選択（新規作成時のみ） */}
        {!isEditMode && (
          <View style={styles.section}>
            <Text style={styles.label}>種類</Text>
            <View style={styles.typeContainer}>
              {(['task', 'event', 'need'] as ItemType[]).map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.typeButton,
                    itemType === type && styles.typeButtonActive,
                  ]}
                  onPress={() => handleTypeChange(type)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.typeButtonText,
                      itemType === type && styles.typeButtonTextActive,
                    ]}
                  >
                    {typeLabels[type]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* タイトル */}
        <View style={styles.section}>
          <Text style={styles.label}>タイトル *</Text>
          <TextInput
            style={styles.input}
            placeholder={
              itemType === 'task' ? 'タスクのタイトル' :
              itemType === 'event' ? '予定のタイトル' :
              '欲しい物の名前'
            }
            value={title}
            onChangeText={setTitle}
            placeholderTextColor="#999"
          />
        </View>

        {/* カテゴリ */}
        <View style={styles.section}>
          <Text style={styles.label}>カテゴリ *</Text>
          <TouchableOpacity
            style={styles.selectButton}
            onPress={() => setShowCategoryPicker(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.selectButtonText}>
              {selectedCategory?.name || 'カテゴリを選択'}
            </Text>
            <Text style={styles.selectButtonArrow}>▼</Text>
          </TouchableOpacity>
        </View>

        {/* 担当者 */}
        <View style={styles.section}>
          <Text style={styles.label}>担当者 *</Text>
          <TouchableOpacity
            style={styles.selectButton}
            onPress={() => setShowAssigneePicker(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.selectButtonText}>
              {selectedMember?.displayName || '担当者を選択'}
            </Text>
            <Text style={styles.selectButtonArrow}>▼</Text>
          </TouchableOpacity>
          <Text style={styles.hint}>
            自分または他の家族メンバーを担当者に設定できます
          </Text>
        </View>

        {/* 優先度 */}
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
              <Text
                style={[
                  styles.priorityButtonText,
                  priority === 'high' && styles.priorityButtonTextActive,
                ]}
              >
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
              <Text
                style={[
                  styles.priorityButtonText,
                  priority === 'medium' && styles.priorityButtonTextActive,
                ]}
              >
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
              <Text
                style={[
                  styles.priorityButtonText,
                  priority === 'low' && styles.priorityButtonTextActive,
                ]}
              >
                🟢 低
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* タスク用: 期限 */}
        {itemType === 'task' && (
          <View style={styles.section}>
            <Text style={styles.label}>期限</Text>
            <TouchableOpacity
              style={styles.input}
              onPress={() => openDatePicker('end')}
              activeOpacity={0.7}
            >
              <Text style={endDate ? styles.dateText : styles.dateTextPlaceholder}>
                {endDate ? new Date(endDate).toLocaleDateString('ja-JP', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  weekday: 'short'
                }) : '日付を選択'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 予定用: 開始日時・終了日時 */}
        {itemType === 'event' && (
          <>
            <View style={styles.section}>
              <Text style={styles.label}>開始日時 *</Text>
              <View style={styles.dateTimeRow}>
                <TouchableOpacity
                  style={[styles.input, styles.dateInput]}
                  onPress={() => openDatePicker('start')}
                  activeOpacity={0.7}
                >
                  <Text style={startDate ? styles.dateText : styles.dateTextPlaceholder}>
                    {startDate ? new Date(startDate).toLocaleDateString('ja-JP', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      weekday: 'short'
                    }) : '日付を選択'}
                  </Text>
                </TouchableOpacity>
                <TextInput
                  style={[styles.input, styles.timeInput]}
                  placeholder="00:00"
                  value={startTime}
                  onChangeText={setStartTime}
                  placeholderTextColor="#999"
                  keyboardType="numbers-and-punctuation"
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>終了日時</Text>
              <View style={styles.dateTimeRow}>
                <TouchableOpacity
                  style={[styles.input, styles.dateInput]}
                  onPress={() => openDatePicker('endEvent')}
                  activeOpacity={0.7}
                >
                  <Text style={endDateEvent ? styles.dateText : styles.dateTextPlaceholder}>
                    {endDateEvent ? new Date(endDateEvent).toLocaleDateString('ja-JP', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      weekday: 'short'
                    }) : '日付を選択'}
                  </Text>
                </TouchableOpacity>
                <TextInput
                  style={[styles.input, styles.timeInput]}
                  placeholder="00:00"
                  value={endTime}
                  onChangeText={setEndTime}
                  placeholderTextColor="#999"
                  keyboardType="numbers-and-punctuation"
                />
              </View>
            </View>

            {/* 繰り返し設定 */}
            <View style={styles.section}>
              <View style={styles.switchRow}>
                <Text style={styles.label}>繰り返し</Text>
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
                    {(['daily', 'weekly', 'monthly', 'yearly'] as const).map((freq) => (
                      <TouchableOpacity
                        key={freq}
                        style={[
                          styles.recurrenceButton,
                          recurrenceFrequency === freq && styles.recurrenceButtonActive,
                        ]}
                        onPress={() => setRecurrenceFrequency(freq)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.recurrenceButtonText,
                            recurrenceFrequency === freq && styles.recurrenceButtonTextActive,
                          ]}
                        >
                          {freq === 'daily' ? '毎日' : freq === 'weekly' ? '毎週' : freq === 'monthly' ? '毎月' : '毎年'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <View style={styles.intervalRow}>
                    <Text style={styles.intervalLabel}>間隔:</Text>
                    <TextInput
                      style={styles.intervalInput}
                      value={recurrenceInterval}
                      onChangeText={setRecurrenceInterval}
                      keyboardType="number-pad"
                    />
                    <Text style={styles.intervalUnit}>
                      {recurrenceFrequency === 'daily' ? '日ごと' : 
                       recurrenceFrequency === 'weekly' ? '週ごと' : 
                       recurrenceFrequency === 'monthly' ? '月ごと' : '年ごと'}
                    </Text>
                  </View>
                </>
              )}
            </View>
          </>
        )}

        {/* 欲しい物用: 期限 */}
        {itemType === 'need' && (
          <View style={styles.section}>
            <Text style={styles.label}>期限</Text>
            <TouchableOpacity
              style={styles.input}
              onPress={() => openDatePicker('end')}
              activeOpacity={0.7}
            >
              <Text style={endDate ? styles.dateText : styles.dateTextPlaceholder}>
                {endDate ? new Date(endDate).toLocaleDateString('ja-JP', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  weekday: 'short'
                }) : '日付を選択'}
              </Text>
            </TouchableOpacity>
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
              itemType === 'need' ? '例: スーパー、Amazon' :
              itemType === 'event' ? '例: 〇〇公園、自宅' :
              '例: リビング、会社'
            }
            value={location}
            onChangeText={setLocation}
            placeholderTextColor="#999"
          />
        </View>

        {/* プライベート */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setIsPrivate(!isPrivate)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, isPrivate && styles.checkboxChecked]}>
              {isPrivate && <Text style={styles.checkboxCheck}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>プライベート（自分のみ表示）</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* カテゴリ選択モーダル */}
      <Modal
        visible={showCategoryPicker}
        transparent
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
              <Text style={styles.modalTitle}>カテゴリ選択</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowCategoryPicker(false)}
              >
                <Text style={styles.modalCloseText}>×</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              {sortedCategories.map((category) => (
                <TouchableOpacity
                  key={category.categoryId}
                  style={[
                    styles.modalOption,
                    selectedCategoryId === category.categoryId && styles.modalOptionSelected,
                  ]}
                  onPress={() => {
                    setSelectedCategoryId(category.categoryId);
                    setShowCategoryPicker(false);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.modalOptionContent}>
                    <Text style={styles.modalOptionText}>{category.name}</Text>
                    {category.suggestedFor.includes(itemType) && (
                      <Text style={styles.modalOptionBadge}>推奨</Text>
                    )}
                  </View>
                  {selectedCategoryId === category.categoryId && (
                    <Text style={styles.modalOptionCheck}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 担当者選択モーダル */}
      <Modal
        visible={showAssigneePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAssigneePicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowAssigneePicker(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>担当者選択</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowAssigneePicker(false)}
              >
                <Text style={styles.modalCloseText}>×</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              {familyMembers.map((member) => (
                <TouchableOpacity
                  key={member.userId}
                  style={[
                    styles.modalOption,
                    assignedTo === member.userId && styles.modalOptionSelected,
                  ]}
                  onPress={() => {
                    setAssignedTo(member.userId);
                    setShowAssigneePicker(false);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.modalOptionContent}>
                    <Text style={styles.modalOptionText}>{member.displayName}</Text>
                    {member.userId === user?.uid && (
                      <Text style={styles.modalOptionBadge}>自分</Text>
                    )}
                    {member.role === 'admin' && (
                      <Text style={styles.modalOptionBadge}>管理者</Text>
                    )}
                  </View>
                  {assignedTo === member.userId && (
                    <Text style={styles.modalOptionCheck}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 日付選択モーダル */}
      <Modal
        visible={showDatePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowDatePicker(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.calendarContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {calendar.year}年 {calendar.month + 1}月
              </Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={styles.modalCloseText}>×</Text>
              </TouchableOpacity>
            </View>

            {/* 曜日ヘッダー */}
            <View style={styles.calendarWeekRow}>
              {['日', '月', '火', '水', '木', '金', '土'].map((day) => (
                <Text key={day} style={styles.calendarWeekText}>{day}</Text>
              ))}
            </View>

            {/* カレンダーグリッド */}
            <View style={styles.calendarGrid}>
              {calendar.days.map((day, index) => {
                if (day === null) {
                  return <View key={`empty-${index}`} style={[styles.calendarDay, styles.calendarDayEmpty]} />;
                }

                const dateStr = `${calendar.year}-${String(calendar.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const isSelected = tempDate === dateStr;

                return (
                  <TouchableOpacity
                    key={day}
                    style={[
                      styles.calendarDay,
                      isSelected && styles.calendarDaySelected,
                    ]}
                    onPress={() => setTempDate(dateStr)}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.calendarDayText,
                      isSelected && styles.calendarDayTextSelected,
                    ]}>
                      {day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={styles.modalCancelText}>キャンセル</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalApplyButton}
                onPress={applyDateSelection}
              >
                <Text style={styles.modalApplyText}>選択</Text>
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
  cancelButton: {
    paddingHorizontal: 8,
    paddingVertical: 8,
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
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  hint: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
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
  selectButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectButtonText: {
    fontSize: 16,
    color: '#333',
  },
  selectButtonArrow: {
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
    backgroundColor: '#fff',
  },
  typeButtonActive: {
    borderColor: '#2196F3',
    backgroundColor: '#f0f8ff',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  typeButtonTextActive: {
    color: '#2196F3',
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
    backgroundColor: '#fff',
  },
  priorityButtonHigh: {
    borderColor: '#2196F3',
    backgroundColor: '#f0f8ff',
  },
  priorityButtonMedium: {
    borderColor: '#2196F3',
    backgroundColor: '#f0f8ff',
  },
  priorityButtonLow: {
    borderColor: '#2196F3',
    backgroundColor: '#f0f8ff',
  },
  priorityButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  priorityButtonTextActive: {
    color: '#2196F3',
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  dateInput: {
    flex: 2,
  },
  timeInput: {
    flex: 1,
  },
  dateText: {
    fontSize: 16,
    color: '#333',
  },
  dateTextPlaceholder: {
    fontSize: 16,
    color: '#999',
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
    fontSize: 12,
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
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  checkboxCheck: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#333',
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
  
  // カレンダーモーダル
  calendarContainer: {
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
  calendarWeekRow: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  calendarWeekText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
  },
  calendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  calendarDayEmpty: {
    opacity: 0,
  },
  calendarDaySelected: {
    backgroundColor: '#2196F3',
    borderRadius: 20,
  },
  calendarDayText: {
    fontSize: 16,
    color: '#333',
  },
  calendarDayTextSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  modalApplyButton: {
    flex: 1,
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