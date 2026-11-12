// Placeholder screen. The real UI is delivered in a separate PR.
import { StyleSheet, Text, View } from 'react-native';

export default function DashboardHome() {
  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" style={styles.title}>
        MiBarra Dashboard
      </Text>
      <Text style={styles.body}>Manage your shop&apos;s orders and menu. Coming soon.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 28, fontWeight: '700', color: '#1a1a1a' },
  body: { marginTop: 8, fontSize: 16, color: '#333', textAlign: 'center' },
});
