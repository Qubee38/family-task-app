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

type EventDetailScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;
type EventDetailScreenRouteProp = RouteProp<RootStackParamList, 'EventDetail'>;

export default function EventDetailScreen() {
  const navigation = useNavigation<EventDetailScreenNavigationProp>();
  const route = useRoute<EventDetailScreenRouteProp>();
  const { items, deleteItem, completeItem, uncompleteItem, loading } = useItem();
  
  // route.paramsのundefinedチェック
  if (!route.params || !route.params.itemId) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>予定詳細</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>予定IDが指定されていません</Text>
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
          <Text style={styles.errorText}>予定が見つかりません</Text>
        </View>
      </View>
    );
  }

  const handleEdit = () => {
    navigation.navigate('CreateEditEvent', { itemId: item.itemId });
  };

  const handleDelete = async () => {
    try {
      await deleteItem(item.itemId);
      logger.info('予定削除成功');
      navigation.goBack();
    } catch (error: any) {
      logger.error('予定削除エラー:', error);
      const message = error.response?.data?.detail || error.message || '予定の削除に失敗しました';
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
        '予定を削除',
        'この予定を削除しますか？',
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

  // 日時フォーマット
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

  const formatDate = (dateTimeStr: string) => {
    const date = new Date(dateTimeStr);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    });
  };

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
    : 'なし';

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
        <Text style={styles.headerTitle}>予定詳細</Text>
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
        <View style={styles.titleSection}>
          <Text style={[styles.title, item.isCompleted && styles.titleCompleted]}>
            {item.title}
          </Text>
        </View>

        {/* ステータスバッジ */}
        <View style={styles.badgeContainer}>
          <View style={[styles.badge, item.isCompleted ? styles.badgeCompleted : styles.badgePending]}>
            <Text style={styles.badgeText}>
              {item.isCompleted ? '✓ 完了' : '⏳ 未完了'}
            </Text>
          </View>
        </View>

        {/* 詳細情報 */}
        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>カテゴリ</Text>
            <Text style={styles.detailValue}>{item.categoryName || '未設定'}</Text>
          </View>

          {item.assignedToName && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>担当者</Text>
              <Text style={styles.detailValue}>👤 {item.assignedToName}</Text>
            </View>
          )}

          {item.startDateTime && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>開始日時</Text>
              <Text style={styles.detailValue}>📅 {formatDateTime(item.startDateTime)}</Text>
            </View>
          )}

          {item.endDateTime && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>終了日時</Text>
              <Text style={styles.detailValue}>📅 {formatDateTime(item.endDateTime)}</Text>
            </View>
          )}

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>繰り返し</Text>
            <Text style={styles.detailValue}>🔄 {recurrenceText}</Text>
          </View>

          {item.location && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>場所</Text>
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
                <Text style={styles.detailLabel}>完了者</Text>
                <Text style={styles.detailValue}>{item.completedByName}</Text>
              </View>

              {item.completedAt && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>完了日時</Text>
                  <Text style={styles.detailValue}>{formatDateTime(item.completedAt)}</Text>
                </View>
              )}
            </>
          )}
        </View>

        {/* 完了ボタン */}
        <TouchableOpacity
          style={[styles.actionButton, item.isCompleted && styles.actionButtonUncomplete]}
          onPress={handleToggleComplete}
          activeOpacity={0.7}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.actionButtonText}>
              {item.isCompleted ? '未完了に戻す' : '完了にする'}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* 削除確認ダイアログ */}
      {Platform.OS === 'web' && showDeleteDialog && (
        <ConfirmDialog
          visible={showDeleteDialog}
          title="予定を削除"
          message="この予定を削除しますか？"
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
  badgeContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  badgeCompleted: {
    backgroundColor: '#4CAF50',
  },
  badgePending: {
    backgroundColor: '#FF9800',
  },
  badgeText: {
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
    backgroundColor: '#4CAF50',
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
  actionButtonUncomplete: {
    backgroundColor: '#FF9800',
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