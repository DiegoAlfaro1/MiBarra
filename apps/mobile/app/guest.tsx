import { View, StyleSheet } from 'react-native';

import { Screen, t } from '../src/components/ui';
import { useIsWide } from '../src/lib/useIsWide';
import { AccessTop } from '../src/screens/accessParts';
import { GuestForm, GuestIncluded } from '../src/screens/accessForms';
import { WebAccessPage } from '../src/web/WebAccess';

/** Guest screen (ACC-02, NOT-03): phone layout, or the WA4 page on wide web. UI mockup; no anonymous session. */
export default function Guest() {
  if (useIsWide()) {
    return (
      <WebAccessPage
        title="Pide sin crear cuenta"
        subtitle="Solo dinos cómo llamarte en la barra. Puedes crear tu cuenta cuando quieras."
        aside={<GuestIncluded />}
        guestLink={false}
      >
        <GuestForm showTitle={false} showIncluded={false} />
      </WebAccessPage>
    );
  }
  return (
    <Screen header={<View style={styles.pad}><AccessTop skip={false} /></View>}>
      <View style={styles.bottom}>
        <GuestForm />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: t.layout.gutter },
  bottom: { paddingBottom: 24 },
});
