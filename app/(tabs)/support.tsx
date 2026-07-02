import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Linking,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { ArrowLeft, Mail, Phone, MessageCircle, Clock, Globe } from 'lucide-react-native';

export default function SupportScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const contactInfo = [
    {
      icon: <Mail size={24} color={colors.primary} />,
      title: 'Email',
      value: 'kgsmusicacademy@gmail.com',
      action: () => Linking.openURL('mailto:kgsmusicacademy@gmail.com'),
    },
    {
      icon: <Phone size={24} color={colors.success} />,
      title: 'Phone',
      value: '+91 9487927742',
      action: () => Linking.openURL('tel:+919487927742'),
    },
    {
      icon: <MessageCircle size={24} color="#25D366" />,
      title: 'WhatsApp',
      value: '+91 9487927742',
      action: () => Linking.openURL('https://wa.me/9487927742'),
    },
  ];

  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Help & Support</Text>
          <Text style={styles.headerSubtitle}>We're here to help</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Us</Text>
          <View style={styles.contactList}>
            {contactInfo.map((contact, index) => (
              <TouchableOpacity
                key={index}
                style={styles.contactCard}
                onPress={contact.action}>
                <View style={styles.contactIconBox}>
                  {contact.icon}
                </View>
                <View style={styles.contactInfo}>
                  <Text style={styles.contactTitle}>{contact.title}</Text>
                  <Text style={styles.contactValue}>{contact.value}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support Hours</Text>
          <View style={styles.hoursCard}>
            <View style={styles.hoursRow}>
              <Clock size={20} color={colors.textSecondary} />
              <View style={styles.hoursInfo}>
                <Text style={styles.hoursText}>Monday - Friday</Text>
                <Text style={styles.hoursValue}>4:00 PM - 9:00 PM</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.hoursRow}>
              <Globe size={20} color={colors.textSecondary} />
              <View style={styles.hoursInfo}>
                <Text style={styles.hoursText}>Weekend</Text>
                <Text style={styles.hoursValue}>Closed</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          <View style={styles.faqList}>
            <View style={styles.faqCard}>
              <Text style={styles.faqQuestion}>How do I view my child's progress?</Text>
              <Text style={styles.faqAnswer}>
                Log in with your parent email. All linked children will appear on the Progress tab.
              </Text>
            </View>
            <View style={styles.faqCard}>
              <Text style={styles.faqQuestion}>How are progress updates tracked?</Text>
              <Text style={styles.faqAnswer}>
                Instructors update progress after each session. You'll receive notifications for new updates.
              </Text>
            </View>
            <View style={styles.faqCard}>
              <Text style={styles.faqQuestion}>Can I add more children to my account?</Text>
              <Text style={styles.faqAnswer}>
                Contact the admin to add more children. Provide your parent email during registration.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function createStyles(colors: Record<string, string>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      backgroundColor: colors.headerBg,
      paddingTop: 0,
      paddingHorizontal: 20,
      paddingBottom: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.iconBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerContent: {
      flex: 1,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.text,
    },
    headerSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 2,
    },
    content: {
      flex: 1,
    },
    section: {
      padding: 20,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 16,
    },
    contactList: {
      gap: 12,
    },
    contactCard: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 3,
      elevation: 1,
    },
    contactIconBox: {
      width: 48,
      height: 48,
      borderRadius: 12,
      backgroundColor: colors.iconBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    contactInfo: {
      flex: 1,
    },
    contactTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 2,
    },
    contactValue: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
    },
    hoursCard: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 3,
      elevation: 1,
    },
    hoursRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 8,
    },
    hoursInfo: {
      flex: 1,
    },
    hoursText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    hoursValue: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      marginTop: 2,
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 8,
    },
    faqList: {
      gap: 12,
    },
    faqCard: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 3,
      elevation: 1,
    },
    faqQuestion: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.primary,
      marginBottom: 8,
    },
    faqAnswer: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
    },
  });
}
