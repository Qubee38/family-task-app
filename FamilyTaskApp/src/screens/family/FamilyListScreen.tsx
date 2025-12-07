import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useFamily } from '../../contexts/FamilyContext';
import { logger } from '../../utils/logger';

export default function FamilyListScreen() {
  const navigation = useNavigation();
  const { families, loading, selectFamily } = useFamily();

  const handleSelectFamily = async (familyId: string) => {
    try {
      logger.debug('家族選択:', familyId);
      await selectFamily(familyId);
      
      // 明示的にHomeScreenへ遷移
      logger.info('家族選択成功、HomeScreenへ遷移');
      navigation.navigate('Home' as never);
    } catch (error: any) {
      logger.error('家族選択エラー:', error);
      alert('家族の選択に失敗しました: ' + error.message);
    }
  };

  const renderFamilyCard = ({ item }: { item: typeof families[0] }) => (
    <TouchableOpacity
      style={styles.familyCard}
      onPress={() => handleSelectFamily(item.familyId)}
      activeOpacity={0.7}
    >
      <View style={styles.familyCardHeader}>
        <Text style={styles.familyName}>{item.name}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>
            {item.role === 'admin' ? '管理者' : 'メンバー'}
          </Text>
        </View>
      </View>
      
      <View style={styles.familyCardBody}>
        <Text style={styles.memberCount}>👥 {item.memberCount}人</Text>
        <Text style={styles.joinedDate}>
          参加日: {new Date(item.joinedAt).toLocaleDateString('ja-JP')}
        </Text>
      </View>
      
      <View style={styles.inviteCodeContainer}>
        <Text style={styles.inviteCodeLabel}>招待コード:</Text>
        <Text style={styles.inviteCode}>{item.inviteCode}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateTitle}>家族グループがありません</Text>
      <Text style={styles.emptyStateText}>
        新しい家族を作成するか、{'\n'}
        招待コードで既存の家族に参加してください
      </Text>
    </View>
  );

  if (loading && families.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>家族情報を読み込み中...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <Text style={styles.title}>家族選択</Text>
        <Text style={styles.subtitle}>
          所属家族（{families.length}）
        </Text>
      </View>

      {/* 家族一覧 */}
      <FlatList
        data={families}
        renderItem={renderFamilyCard}
        keyExtractor={(item) => item.familyId}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyState}
        refreshing={loading}
        onRefresh={() => {
          // 将来的にプルダウンリフレッシュ実装
        }}
      />

      {/* アクションボタン */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.button, styles.createButton]}
          onPress={() => navigation.navigate('CreateFamily' as never)}
          activeOpacity={0.7}
        >
          <Text style={styles.buttonText}>➕ 新しい家族を作成</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.joinButton]}
          onPress={() => navigation.navigate('JoinFamily' as never)}
          activeOpacity={0.7}
        >
          <Text style={styles.buttonText}>🔑 招待コードで参加</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#2196F3',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
  },
  listContent: {
    padding: 20,
    paddingBottom: 160,
  },
  familyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  familyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  familyName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  roleBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  familyCardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  memberCount: {
    fontSize: 14,
    color: '#666',
  },
  joinedDate: {
    fontSize: 12,
    color: '#999',
  },
  inviteCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 8,
    borderRadius: 6,
  },
  inviteCodeLabel: {
    fontSize: 12,
    color: '#666',
    marginRight: 8,
  },
  inviteCode: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2196F3',
    fontFamily: 'monospace',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  actionButtons: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  button: {
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  createButton: {
    backgroundColor: '#2196F3',
  },
  joinButton: {
    backgroundColor: '#4CAF50',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});