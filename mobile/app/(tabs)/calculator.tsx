import { View, Text, StyleSheet } from 'react-native';

export default function CalculatorScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Toll Calculator</Text>
      <Text style={styles.subtitle}>Bridge + vehicle based toll calculation UI will come here.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#94a3b8',
  },
});