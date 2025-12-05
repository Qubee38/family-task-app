import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Alert } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import ConfirmDialog from '../components/ConfirmDialog';

export default function HomeScreen() {
  const { user, signOut } = useAuth();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  const handleLogout = async () => {
    console.log('🔹 handleLogout called');
    
    // Web環境ではカスタムダイアログを使用、ネイティブではAlertを使用
    if (Platform.OS === 'web') {
      setShowLogoutDialog(true);
    } else {
      Alert.alert(
        'ログアウト',
        'ログアウトしますか？',
        [
          {
            text: 'キャンセル',
            onPress: () => console.log('❌ ログアウトキャンセル'),
            style: 'cancel',
          },
          {
            text: 'ログアウト',
            style: 'destructive',
            onPress: performLogout,
          },
        ],
      );
    }
  };

  const performLogout = async () => {
    console.log('🔹 ログアウト実行開始');
    try {
      await signOut();
      console.log('✅ ログアウト成功');
    } catch (error: any) {
      console.error('❌ ログアウトエラー:', error);
      
      if (Platform.OS === 'web') {
        alert('ログアウトに失敗しました: ' + error.message);
      } else {
        Alert.alert('エラー', 'ログアウトに失敗しました: ' + error.message);
      }
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ホーム画面</Text>
      
      <View style={styles.userInfo}>
        <Text style={styles.label}>ようこそ！</Text>
        <Text style={styles.email}>{user?.email || '不明'}</Text>
        <Text style={styles.uid}>UID: {user?.uid || '不明'}</Text>
      </View>
      
      <TouchableOpacity 
        style={styles.logoutButton} 
        onPress={handleLogout}
        activeOpacity={0.7}
      >
        <Text style={styles.logoutButtonText}>ログアウト</Text>
      </TouchableOpacity>
      
      {/* Web用の確認ダイアログ */}
      <ConfirmDialog
        visible={showLogoutDialog}
        title="ログアウト"
        message="ログアウトしますか？"
        confirmText="ログアウト"
        cancelText="キャンセル"
        onConfirm={() => {
          setShowLogoutDialog(false);
          performLogout();
        }}
        onCancel={() => {
          console.log('❌ ログアウトキャンセル');
          setShowLogoutDialog(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 30,
  },
  userInfo: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    width: '100%',
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  email: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  uid: {
    fontSize: 12,
    color: '#999',
    fontFamily: 'monospace',
  },
  logoutButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});