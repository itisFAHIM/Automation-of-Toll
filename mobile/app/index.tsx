import { Redirect } from 'expo-router';

// This makes the app immediately open the Login screen instead of Dashboard
export default function Index() {
  return <Redirect href="/login" />;
}
