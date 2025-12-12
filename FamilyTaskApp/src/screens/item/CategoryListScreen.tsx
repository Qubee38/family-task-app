import React, { useState } from 'react';
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
import { CategoryResponse } from '../../types/item';
import { RootStackParamList } from '../../types/navigation.types';
import { logger } from '../../utils/logger';
import ConfirmDialog from '../../components/ConfirmDialog';

type CategoryListScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function CategoryListScreen() {
  const navigation = useNavigation<CategoryListScreenNavigationProp>();
  const { categories, deleteCategory, loading } = useItem();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null);

  const handleEdit = (categoryId: string) => {
    navigation.navigate('CreateEditCategory', { categoryId });
  };

  const confirmDelete = (categoryId: string, usageCount: number) => {
    if (usageCount > 0) {
      const message = 'このカテゴリは使用中です。削除するとタスクからも削除されます。本当に削除しますか？';
      if (Platform.OS === 'web') {
        if (confirm(message)) {
          handleDelete(categoryId);
        }
      } else {
        Alert.alert(
          '確認',
          message,
          [
            { text: 'キャンセル', style: 'cancel' },
            { text: '削除', style: 'destructive', onPress: () => handleDelete(categoryId) },
          ]
        );
      }
    } else {
      setDeletingCategoryId(categoryId);
      setShowDeleteDialog(true);
    }
  };

  const handleDelete = async (categoryId: string) => {
    try {
      await deleteCategory(categoryId);
      logger.info('カテゴリ削除成功');
      setShowDeleteDialog(false);
      setDeletingCategoryId(null);
    } catch (error: any) {
      logger.error('カテゴリ削除エラー:', error);
      const message = error.response?.data?.detail || error.message || 'カテゴリの削除に失敗しました';
      if (Platform.OS === 'web') {
        alert(message);
      } else {
        Alert.alert('エラー', message);
      }
    }
  };

  const renderItem = ({ item }: { item: CategoryResponse }) => {
    return (
      <View style={styles.categoryCard}>
        <View style={styles.categoryInfo}>
          <Text style={styles.categoryName}>{item.name}</Text>
          <View style={styles.categoryMeta}>
            <Text style={styles.categoryUsage}>使用回数: {item.usageCount}</Text>
            <Text style={styles.categoryPoints}>
              {item.points && `${item.points}ポイント`}
            </Text>
          </View>
          {item.suggestedFor.length > 0 && (
            <View style={styles.suggestedForContainer}>
              {item.suggestedFor.map((type) => (
                <View key={type} style={styles.suggestedForBadge}>
                  <Text style={styles.suggestedForText}>
                    {type === 'task' ? 'タスク' : type === 'event' ? '予定' : '必要物'}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
        <View style={styles.categoryActions}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => handleEdit(item.categoryId)}
            activeOpacity={0.7}
          >
            <Text style={styles.editButtonText}>✏️</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => confirmDelete(item.categoryId, item.usageCount)}
            activeOpacity={0.7}
          >
            <Text style={styles.deleteButtonText}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>
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
        <Text style={styles.headerTitle}>カテゴリ管理</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('CreateEditCategory')}
          activeOpacity={0.7}
        >
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* カテゴリ一覧 */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
        </View>
      ) : categories.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>カテゴリがありません</Text>
          <Text style={styles.emptySubtext}>右上の「+」ボタンから作成できます</Text>
        </View>
      ) : (
        <FlatList
          data={categories}
          renderItem={renderItem}
          keyExtractor={(item) => item.categoryId}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* 削除確認ダイアログ */}
      {Platform.OS === 'web' && showDeleteDialog && (
        <ConfirmDialog
          visible={showDeleteDialog}
          title="カテゴリを削除"
          message="このカテゴリを削除しますか？"
          onConfirm={() => deletingCategoryId && handleDelete(deletingCategoryId)}
          onCancel={() => {
            setShowDeleteDialog(false);
            setDeletingCategoryId(null);
          }}
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
  listContent: {
    padding: 16,
  },
  categoryCard: {
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
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  categoryMeta: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  categoryUsage: {
    fontSize: 12,
    color: '#666',
  },
  categoryPoints: {
    fontSize: 12,
    color: '#666',
  },
  suggestedForContainer: {
    flexDirection: 'row',
    gap: 6,
  },
  suggestedForBadge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: '#e3f2fd',
  },
  suggestedForText: {
    fontSize: 11,
    color: '#2196F3',
  },
  categoryActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButtonText: {
    fontSize: 20,
  },
  deleteButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 20,
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