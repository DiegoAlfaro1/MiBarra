import { View, StyleSheet } from 'react-native';

import { Screen, t } from '../src/components/ui';
import { useIsWide } from '../src/lib/useIsWide';
import { AccessTop } from '../src/screens/accessParts';
import { SignInForm } from '../src/screens/accessForms';
import { WebAccessPage } from '../src/web/WebAccess';

/** Sign-in screen (ACC-03): phone layout, or the WA2 page on wide web.  */
export default function SignIn() {
  if (useIsWide()) {
    return (
      <WebAccessPage title="Hola de nuevo" subtitle="Inicia sesión para ver tus sellos y pedidos.">
        <SignInForm showTitle={false} />
      </WebAccessPage>
    );
  }
  return (
    <Screen header={<View style={styles.pad}><AccessTop /></View>}>
      <View style={styles.bottom}>
        <SignInForm />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: t.layout.gutter },
  bottom: { paddingBottom: 24 },
});
