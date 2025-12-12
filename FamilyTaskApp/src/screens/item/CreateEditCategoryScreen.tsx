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
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useItem } from '../../contexts/ItemContext';
import { CategoryCreateRequest, CategoryUpdateRequest, ItemType } from '../../types/item';
import { RootStackParamList } from '../../types/navigation.types';
import { logger } from '../../utils/logger';

type CreateEditCategoryScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;
type CreateEditCategoryScreenRouteProp = RouteProp<RootStackParamList, 'CreateEditCategory'>;

export default function CreateEditCategoryScreen() {
  const navigation = useNavigation<CreateEditCategoryScreenNavigationProp>();
  const route = useRoute<CreateEditCategoryScreenRouteProp>();
  const { categories, createCategory, updateCategory, loading } = useItem();

  // 編集モードの判定
  const categoryId = route.params?.categoryId;
  const isEditMode = !!categoryId;
  const editingCategory = isEditMode ? categories.find(cat => cat.categoryId === categoryId) : null;

  // フォーム状態
  const [name, setName] = useState(editingCategory?.name || '');
  const [points, setPoints] = useState(editingCategory?.points?.toString() || '');
  const [suggestedFor, setSuggestedFor] = useState<ItemType[]>(editingCategory?.suggestedFor || []);

  const toggleSuggestedFor = (type: ItemType) => {
    if (suggestedFor.includes(type)) {
      setSuggestedFor(suggestedFor.filter(t => t !== type));
    } else {
      setSuggestedFor([...suggestedFor, type]);
    }
  };

  const handleSave = async () => {
    const trimmedName = name.trim();
    
    if (!trimmedName) {
      const message = 'カテゴリ名を入力してください';
      if (Platform.OS === 'web') {
        alert(message);
      } else {
        Alert.alert('エラー', message);
      }
      return;
    }

    try {
      if (isEditMode && categoryId) {
        // 編集モード
        const data: CategoryUpdateRequest = {
          name: trimmedName,
          points: points ? parseInt(points) : undefined,
          suggestedFor: suggestedFor.length > 0 ? suggestedFor : undefined,
        };

        await updateCategory(categoryId, data);
        logger.info('カテゴリ更新成功');
      } else {
        // 作成モード
        const data: CategoryCreateRequest = {
          name: trimmedName,
          points: points ? parseInt(points) : undefined,
          suggestedFor: suggestedFor.length > 0 ? suggestedFor : [],
        };

        await createCategory(data);
        logger.info('カテゴリ作成成功');
      }
      
      navigation.goBack();
    } catch (error: any) {
      logger.error('カテゴリ保存エラー:', error);
      const message = error.response?.data?.detail || error.message || 'カテゴリの保存に失敗しました';
      if (Platform.OS === 'web') {
        alert(message);
      } else {
        Alert.alert('エラー', message);
      }
    }
  };

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
        <Text style={styles.headerTitle}>{isEditMode ? 'カテゴリを編集' : '新しいカテゴリ'}</Text>
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
        {/* カテゴリ名 */}
        <View style={styles.section}>
          <Text style={styles.label}>カテゴリ名 *</Text>
          <TextInput
            style={styles.input}
            placeholder="例: 掃除"
            placeholderTextColor="#999"
            value={name}
            onChangeText={setName}
            autoFocus={!isEditMode}
          />
        </View>

        {/* ポイント */}
        <View style={styles.section}>
          <Text style={styles.label}>ポイント</Text>
          <TextInput
            style={styles.input}
            placeholder="例: 10"
            placeholderTextColor="#999"
            value={points}
            onChangeText={setPoints}
            keyboardType="number-pad"
          />
          <Text style={styles.hint}>このカテゴリのタスク完了時に獲得できるポイント</Text>
        </View>

        {/* 推奨タイプ */}
        <View style={styles.section}>
          <Text style={styles.label}>推奨タイプ</Text>
          <Text style={styles.hint}>このカテゴリを使用する場面を選択してください</Text>
          <View style={styles.typeContainer}>
            <TouchableOpacity
              style={[
                styles.typeButton,
                suggestedFor.includes('task') && styles.typeButtonActive,
              ]}
              onPress={() => toggleSuggestedFor('task')}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.typeButtonText,
                suggestedFor.includes('task') && styles.typeButtonTextActive,
              ]}>
                📋 タスク
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.typeButton,
                suggestedFor.includes('event') && styles.typeButtonActive,
              ]}
              onPress={() => toggleSuggestedFor('event')}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.typeButtonText,
                suggestedFor.includes('event') && styles.typeButtonTextActive,
              ]}>
                📅 予定
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.typeButton,
                suggestedFor.includes('need') && styles.typeButtonActive,
              ]}
              onPress={() => toggleSuggestedFor('need')}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.typeButtonText,
                suggestedFor.includes('need') && styles.typeButtonTextActive,
              ]}>
                🛒 必要物
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
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
  typeContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  typeButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  typeButtonTextActive: {
    color: '#fff',
  },
});