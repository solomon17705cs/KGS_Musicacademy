import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { sendBroadcastNotification } from '@/lib/notifications';
import { ArrowLeft, Send, Users, Bell } from 'lucide-react-native';

export default function AdminNotificationsScreen() {
  const router = useRouter();
  const { profile } = useAuth();

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetAudience, setTargetAudience] = useState<'all' | 'student' | 'admin'>('all');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  async function handleSendNotification() {
    if (!title.trim() || !message.trim()) {
      setError('Please fill in both title and message');
      return;
    }

    setSending(true);
    setError('');

    try {
      await sendBroadcastNotification(
        title,
        message,
        targetAudience === 'all' ? undefined : targetAudience
      );

      Alert.alert('Success', 'Notification sent successfully!');
      setTitle('');
      setMessage('');
    } catch (err: any) {
      setError(err.message || 'Failed to send notification');
    } finally {
      setSending(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}>
          <ArrowLeft size={24} color="#1e293b" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Send Notification</Text>
          <Text style={styles.headerSubtitle}>Push notification to parents/students</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.formContainer}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.inputGroup}>
            <View style={styles.labelContainer}>
              <Bell size={18} color="#64748b" />
              <Text style={styles.label}>Notification Title *</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="e.g., Class Schedule Update"
              value={title}
              onChangeText={setTitle}
              editable={!sending}
            />
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.labelContainer}>
              <Send size={18} color="#64748b" />
              <Text style={styles.label}>Message *</Text>
            </View>
            <TextInput
              style={styles.textArea}
              placeholder="Enter your message..."
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              editable={!sending}
            />
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.labelContainer}>
              <Users size={18} color="#64748b" />
              <Text style={styles.label}>Target Audience</Text>
            </View>
            <View style={styles.audienceSelector}>
              {[
                { key: 'all', label: 'All Users' },
                { key: 'admin', label: 'Admins Only' },
                { key: 'student', label: 'Students Only' },
              ].map((option) => (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.audienceButton,
                    targetAudience === option.key && styles.audienceButtonActive,
                  ]}
                  onPress={() => setTargetAudience(option.key as any)}>
                  <Text
                    style={[
                      styles.audienceButtonText,
                      targetAudience === option.key && styles.audienceButtonTextActive,
                    ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.sendButton, sending && styles.sendButtonDisabled]}
            onPress={handleSendNotification}
            disabled={sending}>
            {sending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Send size={20} color="#fff" />
                <Text style={styles.sendButtonText}>Send Notification</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#fff',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  formContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: Platform.OS === 'android' ? 80 : 24,
  },
  errorContainer: {
    backgroundColor: '#fee2e2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
  },
  inputGroup: {
    marginBottom: 24,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#1e293b',
  },
  textArea: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#1e293b',
    minHeight: 140,
  },
  audienceSelector: {
    flexDirection: 'row',
    gap: 10,
  },
  audienceButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    alignItems: 'center',
  },
  audienceButtonActive: {
    backgroundColor: '#1e40af',
    borderColor: '#1e40af',
  },
  audienceButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  audienceButtonTextActive: {
    color: '#fff',
  },
  sendButton: {
    backgroundColor: '#1e40af',
    borderRadius: 12,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 32,
    shadowColor: '#1e40af',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
