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
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useItem } from '../../contexts/ItemContext';
import { useFamily } from '../../contexts/FamilyContext';
import { ItemCreateRequest, Priority, Visibility } from '../../types/item';
import { RootStackParamList } from '../../types/navigation.types';
import { logger } from '../../utils/logger';

type CreateEditItemScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function CreateEditItemScreen() {
  const navigation = useNavigation<CreateEditItemScreenNavigationProp>();
  const route = useRoute();
  const { selectedFamily } = useFamily();
  const { categories, createItem, loading } = useItem();

  // フォーム状態
  const [title, setTitle] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [priority, setPriority] = useState<Priority>('low');
  const [visibility, setVisibility] = useState<Visibility>('family');
  const [location, setLocation] = useState('');
  const [endDate, setEndDate] = useState('');

  // カテゴリ選択モーダル
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  // タスク用カテゴリを優先してソート
  const sortedCategories = [...categories].sort((a, b) => {
    // suggestedForに'task'が含まれるものを優先
    const aHasTask = a.suggestedFor.includes('task');
    const bHasTask = b.suggestedFor.includes('task');
    
    if (aHasTask && !bHasTask) return -1;
    if (!aHasTask && bHasTask) return 1;
    
    // 次にusageCountで降順ソート
    if (b.usageCount !== a.usageCount) {
      return b.usageCount - a.usageCount;
    }
    
    // 最後に名前でソート
    return a.name.localeCompare(b.name, 'ja');
  });

  // 初期カテゴリ選択
  useEffect(() => {
    if (sortedCategories.length > 0 && !selectedCategoryId) {
      // デフォルトで最初のカテゴリを選択
      setSelectedCategoryId(sortedCategories[0].categoryId);
    }
  }, [sortedCategories]);

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

    try {
      const data: ItemCreateRequest = {
        type: 'task',
        title: title.trim(),
        categoryId: selectedCategoryId,
        priority,
        visibility,
        location: location.trim() || undefined,
        endDateTime: endDate ? new Date(endDate).toISOString() : undefined,
      };

      await createItem(data);
      logger.info('タスク作成成功');
      navigation.goBack();
    } catch (error: any) {
      logger.error('タスク作成エラー:', error);
      const message = error.response?.data?.detail || error.message || 'タスクの作成に失敗しました';
      if (Platform.OS === 'web') {
        alert(message);
      } else {
        Alert.alert('エラー', message);
      }
    }
  };

  const selectedCategory = categories.find(c => c.categoryId === selectedCategoryId);

  return (
    <View style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Text style={styles.cancelButtonText}>キャンセル</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>新しいタスク</Text>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          activeOpacity={0.7}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#2196F3" />
          ) : (
            <Text style={styles.saveButtonText}>保存</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* タイトル */}
        <View style={styles.section}>
          <Text style={styles.label}>タイトル *</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="例: 庭の草刈り"
            placeholderTextColor="#999"
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
                高
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
                中
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
                低
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 期限 */}
        <View style={styles.section}>
          <Text style={styles.label}>期限</Text>
          <TextInput
            style={styles.input}
            value={endDate}
            onChangeText={setEndDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#999"
          />
          <Text style={styles.hint}>例: 2024-12-31</Text>
        </View>

        {/* 場所 */}
        <View style={styles.section}>
          <Text style={styles.label}>場所</Text>
          <TextInput
            style={styles.input}
            value={location}
            onChangeText={setLocation}
            placeholder="例: 自宅の庭"
            placeholderTextColor="#999"
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
              <Text
                style={[
                  styles.visibilityButtonText,
                  visibility === 'family' && styles.visibilityButtonTextActive,
                ]}
              >
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
              <Text
                style={[
                  styles.visibilityButtonText,
                  visibility === 'private' && styles.visibilityButtonTextActive,
                ]}
              >
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
    backgroundColor: '#fff',
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  cancelButton: {
    padding: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  saveButton: {
    padding: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2196F3',
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
    backgroundColor: '#FF3B30',
    borderColor: '#FF3B30',
  },
  priorityButtonMedium: {
    backgroundColor: '#FF9500',
    borderColor: '#FF9500',
  },
  priorityButtonLow: {
    backgroundColor: '#34C759',
    borderColor: '#34C759',
  },
  priorityButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  priorityButtonTextActive: {
    color: '#fff',
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