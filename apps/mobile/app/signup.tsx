import { View, StyleSheet } from 'react-native';

import { Screen, t } from '../src/components/ui';
import { useIsWide } from '../src/lib/useIsWide';
import { AccessTop } from '../src/screens/accessParts';
import { PerkChips, SignUpForm } from '../src/screens/accessForms';
import { WebAccessPage } from '../src/web/WebAccess';

/** Sign-up screen (ACC-01): phone layout, or the WA3 page on wide web. Creates a real account in Supabase Auth. */
export default function SignUp() {
  if (useIsWide()) {
    return (
      <WebAccessPage title="Crea tu cuenta" subtitle="Junta sellos en cada cafetería y pide de nuevo en un toque." aside={<PerkChips />}>
        <SignUpForm showTitle={false} />
      </WebAccessPage>
    );
  }
  return (
    <Screen header={<View style={styles.pad}><AccessTop /></View>}>
      <View style={styles.bottom}>
        <SignUpForm />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: t.layout.gutter },
  bottom: { paddingBottom: 24 },
});
