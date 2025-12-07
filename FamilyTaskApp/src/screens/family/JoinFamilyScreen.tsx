import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useFamily } from '../../contexts/FamilyContext';
import { logger } from '../../utils/logger';

export default function JoinFamilyScreen() {
  const navigation = useNavigation();
  const { acceptInvitation, loading } = useFamily();
  
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');

  const handleJoinFamily = async () => {
    // バリデーション
    const code = inviteCode.trim().toUpperCase();
    
    if (!code) {
      setError('招待コードを入力してください');
      return;
    }

    if (code.length !== 6) {
      setError('招待コードは6桁です');
      return;
    }

    // 英数字のみ
    if (!/^[A-Z0-9]{6}$/.test(code)) {
      setError('招待コードは英数字6桁です');
      return;
    }

    try {
      setError('');
      logger.debug('招待承認開始:', code);
      
      await acceptInvitation({ inviteCode: code });
      
      logger.info('招待承認成功、HomeScreenへ遷移');
      
      // 明示的にHomeScreenへ遷移
      navigation.navigate('Home' as never);
    } catch (error: any) {
      logger.error('招待承認エラー:', error);
      
      // エラーメッセージを抽出
      let errorMessage = '招待コードが無効です';
      
      if (error.response?.status === 404) {
        errorMessage = '招待コードが見つかりません';
      } else if (error.response?.status === 400) {
        errorMessage = '招待の有効期限が切れています';
      } else if (error.response?.status === 409) {
        errorMessage = '既にこの家族のメンバーです';
      } else if (error.response?.data?.detail) {
        const detail = error.response.data.detail;
        if (typeof detail === 'string') {
          errorMessage = detail;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
    }
  };

  const handleCodeChange = (text: string) => {
    // 英数字のみ、大文字に変換、6桁まで
    const formatted = text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    setInviteCode(formatted);
    setError(''); // エラーをクリア
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* ヘッダー */}
        <View style={styles.header}>
          <Text style={styles.title}>招待コードで参加</Text>
          <Text style={styles.subtitle}>
            家族のメンバーから共有された6桁の招待コードを入力してください
          </Text>
        </View>

        {/* フォーム */}
        <View style={styles.form}>
          <Text style={styles.label}>招待コード *</Text>
          <TextInput
            style={[styles.input, error ? styles.inputError : null]}
            placeholder="ABC123"
            value={inviteCode}
            onChangeText={handleCodeChange}
            maxLength={6}
            autoCapitalize="characters"
            autoCorrect={false}
            editable={!loading}
            autoFocus
          />
          
          {error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : null}

          <Text style={styles.hint}>
            💡 招待コードは英数字6桁です
          </Text>
          
          {/* 入力補助表示 */}
          {inviteCode.length > 0 && (
            <View style={styles.codePreview}>
              <Text style={styles.codePreviewLabel}>入力中:</Text>
              <Text style={styles.codePreviewText}>
                {inviteCode}
                {inviteCode.length < 6 && (
                  <Text style={styles.codePreviewPlaceholder}>
                    {'_'.repeat(6 - inviteCode.length)}
                  </Text>
                )}
              </Text>
            </View>
          )}
        </View>

        {/* 参加後の説明 */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>参加後にできること</Text>
          <Text style={styles.infoItem}>✅ 家族のタスク・予定を確認できます</Text>
          <Text style={styles.infoItem}>✅ 自分のタスクを作成できます</Text>
          <Text style={styles.infoItem}>✅ 家族メンバーとコミュニケーションできます</Text>
          <Text style={styles.infoNote}>
            ⚠️ 一般メンバーとして参加します（権限は管理者が変更可能）
          </Text>
        </View>

        {/* ボタン */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.joinButton]}
            onPress={handleJoinFamily}
            disabled={loading || inviteCode.length !== 6}
            activeOpacity={0.7}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>参加する</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={() => navigation.goBack()}
            disabled={loading}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelButtonText}>キャンセル</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 60,
  },
  header: {
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  form: {
    marginBottom: 30,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 16,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    letterSpacing: 4,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  inputError: {
    borderColor: '#FF3B30',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  hint: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  codePreview: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  codePreviewLabel: {
    fontSize: 14,
    color: '#1976D2',
    marginRight: 8,
  },
  codePreviewText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976D2',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  codePreviewPlaceholder: {
    color: '#90CAF9',
  },
  infoBox: {
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    padding: 16,
    marginBottom: 30,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#388E3C',
    marginBottom: 8,
  },
  infoItem: {
    fontSize: 14,
    color: '#388E3C',
    marginBottom: 4,
  },
  infoNote: {
    fontSize: 12,
    color: '#F57C00',
    marginTop: 8,
    fontStyle: 'italic',
  },
  buttonContainer: {
    marginTop: 'auto',
  },
  button: {
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  joinButton: {
    backgroundColor: '#4CAF50',
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
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
});