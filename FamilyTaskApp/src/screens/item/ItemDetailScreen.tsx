import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
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
import { ItemResponse } from '../../types/item';
import { RootStackParamList } from '../../types/navigation.types';
import { logger } from '../../utils/logger';
import ConfirmDialog from '../../components/ConfirmDialog';

type ItemDetailScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;
type ItemDetailScreenRouteProp = RouteProp<RootStackParamList, 'ItemDetail'>;

export default function ItemDetailScreen() {
  const navigation = useNavigation<ItemDetailScreenNavigationProp>();
  const route = useRoute<ItemDetailScreenRouteProp>();
  const { items, deleteItem, completeItem, uncompleteItem, loading } = useItem();
  
  const { itemId } = route.params;
  const [item, setItem] = useState<ItemResponse | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    const foundItem = items.find(i => i.itemId === itemId);
    if (foundItem) {
      setItem(foundItem);
    } else {
      // アイテムが見つからない場合は戻る
      navigation.goBack();
    }
  }, [itemId, items]);

  const handleToggleComplete = async () => {
    if (!item) return;

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

  const handleEdit = () => {
    navigation.navigate('CreateEditItem', { itemId: item.itemId });
  };

  const handleDelete = async () => {
    if (!item) return;

    try {
      await deleteItem(item.itemId);
      logger.info('タスクを削除しました');
      navigation.goBack();
    } catch (error: any) {
      logger.error('タスク削除エラー:', error);
      const message = error.response?.data?.detail || error.message || 'タスクの削除に失敗しました';
      if (Platform.OS === 'web') {
        alert(message);
      } else {
        Alert.alert('エラー', message);
      }
    }
  };

  const confirmDelete = () => {
    if (Platform.OS === 'web') {
      setShowDeleteDialog(true);
    } else {
      Alert.alert(
        'タスクを削除',
        'このタスクを削除してもよろしいですか？',
        [
          { text: 'キャンセル', style: 'cancel' },
          { text: '削除', style: 'destructive', onPress: handleDelete },
        ]
      );
    }
  };

  if (!item) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  const priorityColor = {
    high: '#FF3B30',
    medium: '#FF9500',
    low: '#34C759',
  }[item.priority];

  const priorityLabel = {
    high: '高',
    medium: '中',
    low: '低',
  }[item.priority];

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
        <Text style={styles.headerTitle}>タスク詳細</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={handleEdit}
            activeOpacity={0.7}
          >
            <Text style={styles.editButtonText}>✏️</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={confirmDelete}
            activeOpacity={0.7}
          >
            <Text style={styles.deleteButtonText}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* タイトル */}
        <View style={styles.section}>
          <Text style={[styles.title, item.isCompleted && styles.titleCompleted]}>
            {item.title}
          </Text>
        </View>

        {/* ステータス */}
        <View style={styles.section}>
          <View style={styles.statusContainer}>
            <View
              style={[
                styles.statusBadge,
                item.isCompleted ? styles.statusBadgeCompleted : styles.statusBadgeActive,
              ]}
            >
              <Text style={styles.statusText}>
                {item.isCompleted ? '✓ 完了' : '⏳ 未完了'}
              </Text>
            </View>
            <View style={[styles.priorityBadge, { backgroundColor: priorityColor }]}>
              <Text style={styles.priorityText}>優先度: {priorityLabel}</Text>
            </View>
          </View>
        </View>

        {/* 詳細情報 */}
        <View style={styles.detailsCard}>
          {item.categoryName && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>🏷️ カテゴリ</Text>
              <Text style={styles.detailValue}>{item.categoryName}</Text>
            </View>
          )}

          {item.assignedToName && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>👤 担当者</Text>
              <Text style={styles.detailValue}>{item.assignedToName}</Text>
            </View>
          )}

          {item.endDateTime && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>📅 期限</Text>
              <Text style={styles.detailValue}>
                {new Date(item.endDateTime).toLocaleDateString('ja-JP', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>
            </View>
          )}

          {item.location && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>📍 場所</Text>
              <Text style={styles.detailValue}>{item.location}</Text>
            </View>
          )}

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>👁️ 公開範囲</Text>
            <Text style={styles.detailValue}>
              {item.visibility === 'family' ? '家族全体' : '自分のみ'}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>✍️ 作成者</Text>
            <Text style={styles.detailValue}>{item.createdByName || '不明'}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>📆 作成日</Text>
            <Text style={styles.detailValue}>
              {new Date(item.createdAt).toLocaleDateString('ja-JP')}
            </Text>
          </View>

          {item.isCompleted && item.completedByName && (
            <>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>✅ 完了者</Text>
                <Text style={styles.detailValue}>{item.completedByName}</Text>
              </View>
              {item.completedAt && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>🕐 完了日時</Text>
                  <Text style={styles.detailValue}>
                    {new Date(item.completedAt).toLocaleString('ja-JP')}
                  </Text>
                </View>
              )}
            </>
          )}
        </View>

        {/* アクションボタン */}
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              item.isCompleted ? styles.actionButtonUncomplete : styles.actionButtonComplete,
            ]}
            onPress={handleToggleComplete}
            disabled={loading}
            activeOpacity={0.7}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.actionButtonText}>
                {item.isCompleted ? '未完了に戻す' : '完了にする'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Web用の削除確認ダイアログ */}
      <ConfirmDialog
        visible={showDeleteDialog}
        title="タスクを削除"
        message="このタスクを削除してもよろしいですか？"
        confirmText="削除"
        cancelText="キャンセル"
        onConfirm={() => {
          setShowDeleteDialog(false);
          handleDelete();
        }}
        onCancel={() => setShowDeleteDialog(false)}
      />
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
  headerRight: {
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
    fontSize: 24,
  },
  deleteButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 24,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  titleCompleted: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  statusContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  statusBadge: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  statusBadgeActive: {
    backgroundColor: '#FF9500',
  },
  statusBadgeCompleted: {
    backgroundColor: '#34C759',
  },
  statusText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  priorityBadge: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  priorityText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  detailsCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    textAlign: 'right',
  },
  actionContainer: {
    padding: 20,
  },
  actionButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionButtonComplete: {
    backgroundColor: '#34C759',
  },
  actionButtonUncomplete: {
    backgroundColor: '#FF9500',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});