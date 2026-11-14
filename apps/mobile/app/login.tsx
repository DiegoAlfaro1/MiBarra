import { router } from 'expo-router';

import { BackHeader, Screen } from '../src/components/ui';
import { AuthForm } from '../src/screens/AuthForm';

export default function Login() {
  return (
    <Screen header={<BackHeader backLabel="Volver al carrito" />}>
      <AuthForm
        onSuccess={() => router.replace('/checkout')}
      />
    </Screen>
  );
}
