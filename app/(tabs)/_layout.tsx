import { Tabs } from 'expo-router';
import { User, Award } from 'lucide-react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Platform, useWindowDimensions } from 'react-native';

export default function TabLayout() {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: '#fff',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.4)',
        tabBarStyle: {
          backgroundColor: '#0f172a',
          position: isMobile ? 'relative' : 'absolute',
          bottom: isMobile ? 0 : 24,
          left: isMobile ? 0 : 24,
          right: isMobile ? 0 : 24,
          height: isMobile ? 70 : 80,
          borderTopLeftRadius: 0,
          borderTopRightRadius: 0,
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
          borderTopWidth: 0,
          borderTopColor: '#1e293b',
          paddingBottom: Platform.OS === 'ios' ? 20 : 8,
          paddingTop: 8,
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.2,
          shadowRadius: 20,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginTop: -2,
        },
      }}>
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progress',
          tabBarIcon: ({ size, color }) => (
            <MaterialCommunityIcons name="music-clef-treble" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="milestones"
        options={{
          title: 'Milestones',
          tabBarIcon: ({ size, color }) => <Award size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ size, color }) => <User size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="support"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="student-attendance"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
    </Tabs>
  );
}
