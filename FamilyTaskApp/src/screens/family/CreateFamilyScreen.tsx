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

export default function CreateFamilyScreen() {
  const navigation = useNavigation();
  const { createFamily, loading } = useFamily();
  
  const [familyName, setFamilyName] = useState('');
  const [error, setError] = useState('');

  const handleCreateFamily = async () => {
    // バリデーション
    if (!familyName.trim()) {
      setError('家族名を入力してください');
      return;
    }

    if (familyName.trim().length > 50) {
      setError('家族名は50文字以内で入力してください');
      return;
    }

    try {
      setError('');
      logger.debug('家族作成開始:', familyName);
      
      await createFamily({ name: familyName.trim() });
      
      logger.info('家族作成成功、HomeScreenへ遷移');
      
      // 明示的にHomeScreenへ遷移
      navigation.navigate('Home' as never);
    } catch (error: any) {
      logger.error('家族作成エラー:', error);
      
      // エラーメッセージを抽出
      let errorMessage = '家族の作成に失敗しました';
      
      if (error.response?.data?.detail) {
        const detail = error.response.data.detail;
        if (typeof detail === 'string') {
          errorMessage = detail;
        } else if (Array.isArray(detail)) {
          errorMessage = detail.map((err: any) => err.msg).join('\n');
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* ヘッダー */}
        <View style={styles.header}>
          <Text style={styles.title}>新しい家族を作成</Text>
          <Text style={styles.subtitle}>
            家族グループを作成すると、自動的に管理者権限が付与されます
          </Text>
        </View>

        {/* フォーム */}
        <View style={styles.form}>
          <Text style={styles.label}>家族名 *</Text>
          <TextInput
            style={[styles.input, error ? styles.inputError : null]}
            placeholder="例: 田中家"
            value={familyName}
            onChangeText={(text) => {
              setFamilyName(text);
              setError(''); // エラーをクリア
            }}
            maxLength={50}
            editable={!loading}
            autoFocus
          />
          
          {error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : null}

          <Text style={styles.hint}>
            💡 家族名は後から変更できます
          </Text>
        </View>

        {/* 作成後の説明 */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>作成後にできること</Text>
          <Text style={styles.infoItem}>✅ 招待コードが自動生成されます</Text>
          <Text style={styles.infoItem}>✅ 家族メンバーを招待できます</Text>
          <Text style={styles.infoItem}>✅ タスク・予定・必要物を管理できます</Text>
        </View>

        {/* ボタン */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.createButton]}
            onPress={handleCreateFamily}
            disabled={loading}
            activeOpacity={0.7}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>作成する</Text>
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
    fontSize: 16,
    color: '#333',
  },
  inputError: {
    borderColor: '#FF3B30',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    marginTop: 8,
  },
  hint: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
  infoBox: {
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    padding: 16,
    marginBottom: 30,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976D2',
    marginBottom: 8,
  },
  infoItem: {
    fontSize: 14,
    color: '#1976D2',
    marginBottom: 4,
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
  createButton: {
    backgroundColor: '#2196F3',
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