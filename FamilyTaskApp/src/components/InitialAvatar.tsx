import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface InitialAvatarProps {
  name: string;
  size?: number;
  backgroundColor?: string;
  textColor?: string;
}

export default function InitialAvatar({
  name,
  size = 40,
  backgroundColor = '#2196F3',
  textColor = '#fff',
}: InitialAvatarProps) {
  // 名前の最初の1文字を取得
  const initial = name ? name.charAt(0) : '?';

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor,
          borderWidth: 2,
          borderColor: '#fff',
        },
      ]}
    >
      <Text
        style={[
          styles.initial,
          {
            fontSize: size * 0.5,
            color: textColor,
          },
        ]}
      >
        {initial}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  initial: {
    fontWeight: 'bold',
  },
});