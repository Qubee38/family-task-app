import React, { useState } from 'react';
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
  
  // route.paramsのundefinedチェック
  if (!route.params || !route.params.itemId) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { backgroundColor: '#2196F3' }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>詳細</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>アイテムIDが指定されていません</Text>
        </View>
      </View>
    );
  }
  
  const { itemId } = route.params;
  const item = items.find(i => i.itemId === itemId);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  if (!item) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>アイテムが見つかりません</Text>
        </View>
      </View>
    );
  }

  const typeConfig = {
    task: { 
      bg: '#2196F3', 
      title: '詳細',
      completedText: '✓ 完了',
      pendingText: '⏳ 未完了',
      actionText: item.isCompleted ? '未完了に戻す' : '完了にする',
    },
    event: { 
      bg: '#2196F3', 
      title: '詳細',
      completedText: '✓ 完了',
      pendingText: '⏳ 未完了',
      actionText: item.isCompleted ? '未完了に戻す' : '完了にする',
    },
    need: { 
      bg: '#2196F3', 
      title: '詳細',
      completedText: '✓ 入手済み',
      pendingText: '⏳ 未入手',
      actionText: item.isCompleted ? '未入手に戻す' : '入手済みにする',
    },
  }[item.type];

  const handleEdit = () => {
    navigation.navigate('ItemForm', { itemId: item.itemId });
  };

  const handleDelete = async () => {
    try {
      await deleteItem(item.itemId);
      logger.info('アイテム削除成功');
      navigation.goBack();
    } catch (error: any) {
      logger.error('アイテム削除エラー:', error);
      const message = error.response?.data?.detail || error.message || 'アイテムの削除に失敗しました';
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
        'アイテムを削除',
        'このアイテムを削除しますか？',
        [
          { text: 'キャンセル', style: 'cancel' },
          { text: '削除', style: 'destructive', onPress: handleDelete },
        ]
      );
    }
  };

  const handleToggleComplete = async () => {
    try {
      if (item.isCompleted) {
        await uncompleteItem(item.itemId);
        logger.info('アイテムを未完了に戻しました');
      } else {
        await completeItem(item.itemId);
        logger.info('アイテムを完了にしました');
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

  // 日時フォーマット
  const formatDate = (dateTimeStr: string) => {
    const date = new Date(dateTimeStr);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateTimeStr: string) => {
    const date = new Date(dateTimeStr);
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 優先度表示
  const priorityText = item.priority ? {
    high: '🔴 高',
    medium: '🟡 中',
    low: '🟢 低',
  }[item.priority] : null;

  // 繰り返し設定の表示
  const recurrenceText = item.recurrence 
    ? `${
        item.recurrence.frequency === 'daily' ? '毎日' :
        item.recurrence.frequency === 'weekly' ? '毎週' :
        item.recurrence.frequency === 'monthly' ? '毎月' :
        '毎年'
      }（${item.recurrence.interval}${
        item.recurrence.frequency === 'daily' ? '日' :
        item.recurrence.frequency === 'weekly' ? '週' :
        item.recurrence.frequency === 'monthly' ? 'ヶ月' :
        '年'
      }ごと）`
    : null;

  return (
    <View style={styles.container}>
      {/* ヘッダー */}
      <View style={[styles.header, { backgroundColor: typeConfig.bg }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{typeConfig.title}</Text>
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
        {/* タイトル + ステータスバッジ */}
        <View style={styles.titleSection}>
          <Text style={[styles.title, item.isCompleted && styles.titleCompleted]}>
            {item.title}
          </Text>
          <View style={[
            styles.statusBadge, 
            item.isCompleted ? styles.statusBadgeCompleted : styles.statusBadgePending,
          ]}>
            <Text style={styles.statusBadgeText}>
              {item.isCompleted ? typeConfig.completedText : typeConfig.pendingText}
            </Text>
          </View>
        </View>

        {/* 詳細情報 */}
        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>カテゴリ</Text>
            <Text style={styles.detailValue}>{item.categoryName || '未設定'}</Text>
          </View>

          {priorityText && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>優先度</Text>
              <Text style={styles.detailValue}>{priorityText}</Text>
            </View>
          )}

          {item.assignedToName && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>担当者</Text>
              <Text style={styles.detailValue}>👤 {item.assignedToName}</Text>
            </View>
          )}

          {item.type === 'event' && item.startDateTime && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>開始日時</Text>
              <Text style={styles.detailValue}>📅 {formatDateTime(item.startDateTime)}</Text>
            </View>
          )}

          {item.type === 'task' && item.endDateTime && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>期限</Text>
              <Text style={styles.detailValue}>📅 {formatDateTime(item.endDateTime)}</Text>
            </View>
          )}

          {item.type === 'event' && item.endDateTime && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>終了日時</Text>
              <Text style={styles.detailValue}>📅 {formatDateTime(item.endDateTime)}</Text>
            </View>
          )}

          {recurrenceText && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>繰り返し</Text>
              <Text style={styles.detailValue}>🔄 {recurrenceText}</Text>
            </View>
          )}

          {item.location && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>
                {item.type === 'need' ? '購入場所' : '場所'}
              </Text>
              <Text style={styles.detailValue}>📍 {item.location}</Text>
            </View>
          )}

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>公開範囲</Text>
            <Text style={styles.detailValue}>
              {item.visibility === 'family' ? '👥 家族全体' : '🔒 自分のみ'}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>作成者</Text>
            <Text style={styles.detailValue}>{item.createdByName || '不明'}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>作成日</Text>
            <Text style={styles.detailValue}>{formatDate(item.createdAt)}</Text>
          </View>

          {item.isCompleted && item.completedByName && (
            <>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>
                  {item.type === 'need' ? '購入者' : '完了者'}
                </Text>
                <Text style={styles.detailValue}>{item.completedByName}</Text>
              </View>

              {item.completedAt && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>
                    {item.type === 'need' ? '購入日時' : '完了日時'}
                  </Text>
                  <Text style={styles.detailValue}>{formatDateTime(item.completedAt)}</Text>
                </View>
              )}
            </>
          )}
        </View>

        {/* 完了ボタン */}
        <TouchableOpacity
          style={[
            styles.actionButton,
            { backgroundColor: item.isCompleted ? '#FFC107' : typeConfig.bg }
          ]}
          onPress={handleToggleComplete}
          activeOpacity={0.7}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.actionButtonText}>
              {typeConfig.actionText}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* 削除確認ダイアログ */}
      {Platform.OS === 'web' && showDeleteDialog && (
        <ConfirmDialog
          visible={showDeleteDialog}
          title="アイテムを削除"
          message="このアイテムを削除しますか？"
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteDialog(false)}
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
  // ヘッダー（統一 - 高さ小さめ）
  header: {
    paddingTop: 50,
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
  titleSection: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 12,
  },
  titleCompleted: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  statusBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  statusBadgeCompleted: {
    backgroundColor: '#2196F3',
  },
  statusBadgePending: {
    backgroundColor: '#FFC107',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  detailsCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: '#999',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 8,
  },
  actionButton: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#999',
  },
});