import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { useFamily } from '../../contexts/FamilyContext';
import ConfirmDialog from '../../components/ConfirmDialog';
import { logger } from '../../utils/logger';

export default function FamilyManageScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { selectedFamily, updateFamily, deleteFamily, updateMemberRole, removeMember, createInvitation, loading } = useFamily();
  
  const [isEditingName, setIsEditingName] = useState(false);
  const [newFamilyName, setNewFamilyName] = useState(selectedFamily?.name || '');
  const [inviteEmail, setInviteEmail] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showRemoveMemberDialog, setShowRemoveMemberDialog] = useState<string | null>(null);

  // 現在のユーザーの権限を取得
  const currentUserMember = selectedFamily?.members.find(m => m.userId === user?.uid);
  const isAdmin = currentUserMember?.role === 'admin';

  if (!selectedFamily) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>家族が選択されていません</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>戻る</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleUpdateFamilyName = async () => {
    if (!isAdmin) {
      Alert.alert('エラー', '管理者のみ家族名を変更できます');
      return;
    }

    if (!newFamilyName.trim()) {
      Alert.alert('エラー', '家族名を入力してください');
      return;
    }

    try {
      await updateFamily(selectedFamily.familyId, { name: newFamilyName.trim() });
      setIsEditingName(false);
      logger.info('家族名更新成功');
      
      if (Platform.OS === 'web') {
        alert('家族名を更新しました');
      } else {
        Alert.alert('成功', '家族名を更新しました');
      }
    } catch (error: any) {
      logger.error('家族名更新エラー:', error);
      Alert.alert('エラー', '家族名の更新に失敗しました');
    }
  };

  const handleDeleteFamily = async () => {
    if (!isAdmin) {
      Alert.alert('エラー', '管理者のみ家族を削除できます');
      return;
    }

    try {
      await deleteFamily(selectedFamily.familyId);
      logger.info('家族削除成功、FamilyListScreenへ遷移');
      // 削除後、AppNavigatorがFamilyListScreenへ遷移
    } catch (error: any) {
      logger.error('家族削除エラー:', error);
      Alert.alert('エラー', '家族の削除に失敗しました');
    }
  };

  const handleUpdateMemberRole = async (userId: string, currentRole: string) => {
    if (!isAdmin) {
      Alert.alert('エラー', '管理者のみ権限を変更できます');
      return;
    }

    const newRole = currentRole === 'admin' ? 'member' : 'admin';
    const roleLabel = newRole === 'admin' ? '管理者' : '一般メンバー';

    const confirmMessage = `このメンバーを${roleLabel}に変更しますか？`;
    
    if (Platform.OS === 'web') {
      if (!confirm(confirmMessage)) return;
    } else {
      Alert.alert(
        '権限変更',
        confirmMessage,
        [
          { text: 'キャンセル', style: 'cancel' },
          {
            text: '変更',
            onPress: async () => {
              try {
                await updateMemberRole(selectedFamily.familyId, userId, { role: newRole as 'admin' | 'member' });
                logger.info('権限変更成功');
                Alert.alert('成功', `権限を${roleLabel}に変更しました`);
              } catch (error: any) {
                logger.error('権限変更エラー:', error);
                
                let errorMessage = '権限の変更に失敗しました';
                if (error.response?.status === 400) {
                  errorMessage = '最後の管理者は一般メンバーに変更できません';
                }
                
                Alert.alert('エラー', errorMessage);
              }
            }
          }
        ]
      );
      return;
    }

    // Web用の処理
    try {
      await updateMemberRole(selectedFamily.familyId, userId, { role: newRole as 'admin' | 'member' });
      logger.info('権限変更成功');
      alert(`権限を${roleLabel}に変更しました`);
    } catch (error: any) {
      logger.error('権限変更エラー:', error);
      
      let errorMessage = '権限の変更に失敗しました';
      if (error.response?.status === 400) {
        errorMessage = '最後の管理者は一般メンバーに変更できません';
      }
      
      alert(errorMessage);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      await removeMember(selectedFamily.familyId, userId);
      logger.info('メンバー削除成功');
      
      if (Platform.OS === 'web') {
        alert('メンバーを削除しました');
      } else {
        Alert.alert('成功', 'メンバーを削除しました');
      }
      
      setShowRemoveMemberDialog(null);
    } catch (error: any) {
      logger.error('メンバー削除エラー:', error);
      
      let errorMessage = 'メンバーの削除に失敗しました';
      if (error.response?.status === 400) {
        errorMessage = '最後の管理者は削除できません';
      }
      
      Alert.alert('エラー', errorMessage);
    }
  };

  const handleCreateInvitation = async () => {
    if (!isAdmin) {
      Alert.alert('エラー', '管理者のみ招待を作成できます');
      return;
    }

    if (!inviteEmail.trim()) {
      Alert.alert('エラー', 'メールアドレスを入力してください');
      return;
    }

    // 簡易的なメールアドレスバリデーション
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail.trim())) {
      Alert.alert('エラー', '有効なメールアドレスを入力してください');
      return;
    }

    try {
      await createInvitation(selectedFamily.familyId, { email: inviteEmail.trim() });
      logger.info('招待作成成功');
      setInviteEmail('');
      
      if (Platform.OS === 'web') {
        alert(`${inviteEmail} に招待を送信しました`);
      } else {
        Alert.alert('成功', `${inviteEmail} に招待を送信しました`);
      }
    } catch (error: any) {
      logger.error('招待作成エラー:', error);
      
      let errorMessage = '招待の作成に失敗しました';
      if (error.response?.status === 409) {
        errorMessage = '既にこのメールアドレスで有効な招待が存在します';
      }
      
      Alert.alert('エラー', errorMessage);
    }
  };

  return (
    <View style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← 戻る</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>家族管理</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* 家族情報セクション */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>家族情報</Text>
          
          <View style={styles.card}>
            <Text style={styles.label}>家族名</Text>
            {isEditingName ? (
              <View style={styles.editContainer}>
                <TextInput
                  style={styles.input}
                  value={newFamilyName}
                  onChangeText={setNewFamilyName}
                  placeholder="家族名"
                  editable={!loading}
                />
                <View style={styles.editButtons}>
                  <TouchableOpacity
                    style={[styles.button, styles.saveButton]}
                    onPress={handleUpdateFamilyName}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.buttonText}>保存</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.button, styles.cancelButton]}
                    onPress={() => {
                      setIsEditingName(false);
                      setNewFamilyName(selectedFamily.name);
                    }}
                    disabled={loading}
                  >
                    <Text style={styles.cancelButtonText}>キャンセル</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.nameDisplay}>
                <Text style={styles.familyName}>{selectedFamily.name}</Text>
                {isAdmin && (
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => setIsEditingName(true)}
                  >
                    <Text style={styles.editButtonText}>編集</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
            
            <Text style={styles.label}>招待コード</Text>
            <View style={styles.inviteCodeContainer}>
              <Text style={styles.inviteCode}>{selectedFamily.inviteCode}</Text>
            </View>
          </View>
        </View>

        {/* メンバー招待セクション（管理者のみ） */}
        {isAdmin && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>メンバーを招待</Text>
            
            <View style={styles.card}>
              <Text style={styles.label}>招待するメールアドレス</Text>
              <View style={styles.inviteInputContainer}>
                <TextInput
                  style={styles.inviteInput}
                  value={inviteEmail}
                  onChangeText={setInviteEmail}
                  placeholder="example@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!loading}
                />
                <TouchableOpacity
                  style={[styles.button, styles.inviteButton]}
                  onPress={handleCreateInvitation}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>招待</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* メンバー一覧セクション */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>メンバー一覧 ({selectedFamily.members.length}人)</Text>
          
          {selectedFamily.members.map((member) => (
            <View key={member.userId} style={styles.memberCard}>
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>{member.displayName}</Text>
                <Text style={styles.memberEmail}>{member.email}</Text>
              </View>
              
              <View style={styles.memberActions}>
                <View style={[
                  styles.roleBadge,
                  member.role === 'admin' ? styles.adminBadge : styles.memberBadge
                ]}>
                  <Text style={styles.roleText}>
                    {member.role === 'admin' ? '管理者' : 'メンバー'}
                  </Text>
                </View>
                
                {isAdmin && member.userId !== user?.uid && (
                  <View style={styles.memberButtons}>
                    <TouchableOpacity
                      style={[styles.iconButton, styles.roleChangeButton]}
                      onPress={() => handleUpdateMemberRole(member.userId, member.role)}
                    >
                      <Text style={styles.iconButtonText}>⚙️</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.iconButton, styles.removeButton]}
                      onPress={() => setShowRemoveMemberDialog(member.userId)}
                    >
                      <Text style={styles.iconButtonText}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* 危険なアクション（管理者のみ） */}
        {isAdmin && (
          <View style={styles.section}>
            <Text style={styles.dangerSectionTitle}>危険なアクション</Text>
            
            <TouchableOpacity
              style={[styles.button, styles.deleteButton]}
              onPress={() => setShowDeleteDialog(true)}
            >
              <Text style={styles.buttonText}>家族を削除</Text>
            </TouchableOpacity>
            
            <Text style={styles.dangerNote}>
              ⚠️ 家族を削除すると、全てのデータが失われます
            </Text>
          </View>
        )}
      </ScrollView>

      {/* 家族削除確認ダイアログ */}
      <ConfirmDialog
        visible={showDeleteDialog}
        title="家族を削除"
        message={`「${selectedFamily.name}」を削除しますか？\n\nこの操作は取り消せません。全てのタスク、予定、メンバー情報が削除されます。`}
        confirmText="削除"
        cancelText="キャンセル"
        onConfirm={() => {
          setShowDeleteDialog(false);
          handleDeleteFamily();
        }}
        onCancel={() => setShowDeleteDialog(false)}
      />

      {/* メンバー削除確認ダイアログ */}
      {showRemoveMemberDialog && (
        <ConfirmDialog
          visible={true}
          title="メンバーを削除"
          message="このメンバーを家族から削除しますか？"
          confirmText="削除"
          cancelText="キャンセル"
          onConfirm={() => handleRemoveMember(showRemoveMemberDialog)}
          onCancel={() => setShowRemoveMemberDialog(null)}
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
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
    width: 60,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  dangerSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF3B30',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  nameDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  familyName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#2196F3',
    borderRadius: 6,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  editContainer: {
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  editButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  inviteCodeContainer: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  inviteCode: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  inviteInputContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  inviteInput: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  memberCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  memberEmail: {
    fontSize: 12,
    color: '#666',
  },
  memberActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  adminBadge: {
    backgroundColor: '#4CAF50',
  },
  memberBadge: {
    backgroundColor: '#9E9E9E',
  },
  roleText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  memberButtons: {
    flexDirection: 'row',
    gap: 4,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roleChangeButton: {
    backgroundColor: '#2196F3',
  },
  removeButton: {
    backgroundColor: '#FF3B30',
  },
  iconButtonText: {
    fontSize: 16,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  inviteButton: {
    backgroundColor: '#4CAF50',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dangerNote: {
    fontSize: 12,
    color: '#FF3B30',
    marginTop: 8,
    textAlign: 'center',
  },
});