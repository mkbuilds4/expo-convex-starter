import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useConvexAuth } from 'convex/react';
import { SignInSignUp } from '../../screens/AuthScreens';

export default function SignIn() {
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();

  useEffect(() => {
    if (isAuthenticated) router.replace('/(tabs)');
  }, [isAuthenticated, router]);

  return (
    <SignInSignUp
      mode="signin"
      onBack={() => router.back()}
      onSwitchMode={() => router.replace('/(auth)/sign-up')}
    />
  );
}
