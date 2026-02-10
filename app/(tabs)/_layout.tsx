import { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { useRouter } from 'expo-router';
import { useConvexAuth } from 'convex/react';

export default function TabsLayout() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useConvexAuth();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) router.replace('/(auth)');
  }, [isAuthenticated, isLoading, router]);

  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarLabel: 'Home' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarLabel: 'Profile' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarLabel: 'Settings' }} />
    </Tabs>
  );
}
