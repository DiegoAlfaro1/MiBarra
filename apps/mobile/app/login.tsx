import { router } from 'expo-router';

import { BackHeader, Screen } from '../src/components/ui';
import { AuthForm } from '../src/screens/AuthForm';
import { useAppState } from '../src/state/AppState';

export default function Login() {
  const { signIn } = useAppState();
  return (
    <Screen header={<BackHeader backLabel="Volver al carrito" />}>
      <AuthForm
        onSuccess={(session) => {
          signIn(session);
          router.replace('/checkout');
        }}
      />
    </Screen>
  );
}
