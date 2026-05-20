import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

type NotificationType = 'info' | 'success' | 'warning';

interface NotificationContextProps {
  showNotification: (title: string, message: string, type?: NotificationType) => void;
}

const NotificationContext = createContext<NotificationContextProps | undefined>(undefined);

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<NotificationType>('info');
  
  const slideAnim = useRef(new Animated.Value(-120)).current;
  const timeoutRef = useRef<any>(null);

  const showNotification = useCallback((
    newTitle: string,
    newMessage: string,
    newType: NotificationType = 'info'
  ) => {
    // Clear any active timeouts
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setTitle(newTitle);
    setMessage(newMessage);
    setType(newType);
    setVisible(true);

    // Trigger correct haptics
    if (newType === 'success') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (newType === 'warning') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    // Slide Down
    Animated.spring(slideAnim, {
      toValue: 50, // Top margin position
      useNativeDriver: true,
      tension: 40,
      friction: 8
    }).start();

    // Auto dismiss after 5 seconds
    timeoutRef.current = setTimeout(() => {
      dismissNotification();
    }, 4500);
  }, []);

  const dismissNotification = () => {
    Animated.timing(slideAnim, {
      toValue: -130, // Hide above screen
      duration: 250,
      useNativeDriver: true
    }).start(({ finished }) => {
      if (finished) {
        setVisible(false);
      }
    });
  };

  const getIconDetails = () => {
    switch (type) {
      case 'success':
        return { name: 'checkmark-circle' as const, color: '#10b981', bg: '#10b98115' };
      case 'warning':
        return { name: 'warning' as const, color: '#f59e0b', bg: '#f59e0b15' };
      default:
        return { name: 'information-circle' as const, color: '#3b82f6', bg: '#3b82f615' };
    }
  };

  const iconDetails = getIconDetails();

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      {visible && (
        <Animated.View style={[styles.toastContainer, { transform: [{ translateY: slideAnim }] }]}>
          <TouchableOpacity 
            activeOpacity={0.9} 
            onPress={dismissNotification}
            style={[styles.toast, { borderColor: `${iconDetails.color}30` }]}
          >
            <View style={[styles.iconWrapper, { backgroundColor: iconDetails.bg }]}>
              <Ionicons name={iconDetails.name} size={22} color={iconDetails.color} />
            </View>
            <View style={styles.textWrapper}>
              <Text style={styles.titleText}>{title}</Text>
              <Text style={styles.messageText}>{message}</Text>
            </View>
            <TouchableOpacity onPress={dismissNotification} style={styles.closeBtn}>
              <Ionicons name="close" size={16} color="#64748b" />
            </TouchableOpacity>
          </TouchableOpacity>
        </Animated.View>
      )}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    zIndex: 9999,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 16,
    width: '100%',
    borderWidth: 1.5,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textWrapper: {
    flex: 1,
    paddingRight: 8,
  },
  titleText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  messageText: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  closeBtn: {
    padding: 4,
  },
});
