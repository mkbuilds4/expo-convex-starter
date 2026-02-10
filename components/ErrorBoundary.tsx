import type { ReactNode } from 'react';
import { Component } from 'react';
import { View, StyleSheet } from 'react-native';
import { Button } from './Button';
import { Text } from './Text';
import { useTheme } from '../lib/theme-context';
import { spacing } from '../lib/theme';

type Props = { children: ReactNode };

type State = { hasError: boolean; error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return <ErrorFallback error={this.state.error} onRetry={() => this.setState({ hasError: false, error: null })} />;
    }
    return this.props.children;
  }
}

function ErrorFallback({ error, onRetry }: { error: Error; onRetry: () => void }) {
  // useTheme must be used in a child of ThemeProvider; ErrorBoundary might catch errors above theme
  return (
    <View style={styles.container}>
      <Text variant="cardTitle" style={styles.title}>
        Something went wrong
      </Text>
      <Text variant="bodySmall" style={styles.message}>
        {error.message}
      </Text>
      <Button onPress={onRetry} style={styles.button}>
        Try again
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  title: {
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  message: {
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  button: {
    minWidth: 160,
  },
});
