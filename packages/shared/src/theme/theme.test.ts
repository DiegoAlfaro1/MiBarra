import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ORDER_STATUSES } from '../types.ts';
import { contrastRatio, mix, normalizeHex, parseHex, readableOn, withAlpha } from './color.ts';
import { accentTone, createTheme, paymentStatusStyles, theme, typography, type PaymentTone } from './theme.ts';
import { DEFAULT_ACCENT, palette, SHOP_ACCENTS, touchTargets } from './tokens.ts';

test('parseHex accepts 3 and 6 digit colours and rejects garbage', () => {
  assert.deepEqual(parseHex('#B4441B'), { r: 180, g: 68, b: 27 });
  assert.deepEqual(parseHex('fff'), { r: 255, g: 255, b: 255 });
  assert.equal(normalizeHex('#b4441b'), '#B4441B');
  for (const bad of ['', 'red', '#12345', '#GGGGGG', 'rgb(0,0,0)']) {
    assert.throws(() => parseHex(bad), { name: 'RangeError', message: /Invalid colour/ });
  }
});

test('mix, withAlpha and contrastRatio behave as expected', () => {
  assert.equal(mix('#000000', '#FFFFFF', 0), '#000000');
  assert.equal(mix('#000000', '#FFFFFF', 1), '#FFFFFF');
  assert.equal(mix('#000000', '#FFFFFF', 2), '#FFFFFF');
  assert.equal(withAlpha('#1C1917', 0.55), 'rgba(28,25,23,0.55)');
  assert.equal(Math.round(contrastRatio('#000000', '#FFFFFF')), 21);
  assert.equal(contrastRatio('#777777', '#777777'), 1);
  assert.equal(readableOn('#FFFFFF'), palette.stone900);
  assert.equal(readableOn('#1C1917'), palette.white);
});

test('default theme uses the design tokens from the README', () => {
  assert.equal(theme.colors.text, '#1C1917');
  assert.equal(theme.colors.background, '#F7F5F2');
  assert.equal(theme.colors.surface, '#FFFFFF');
  assert.equal(theme.colors.border, '#E7E5E4');
  assert.equal(theme.colors.textMuted, '#57534E');
  assert.equal(theme.colors.primary, '#B4441B');
  assert.equal(theme.colors.placeholder, '#F8E6DC');
  assert.equal(theme.tones.success.solid, '#15803D');
  assert.equal(theme.tones.danger.tint, '#FEE2E2');
  assert.equal(theme.tones.warning.onTint, '#78350F');
  assert.equal(theme.tones.demo.solid, '#1D4ED8');
  assert.equal(theme.radii.pill, 999);
  assert.equal(typography.h1.fontFamily, 'Bricolage Grotesque');
  assert.equal(typography.body.fontFamily, 'Inter');
});

test('dashboard surface uses its own background and larger touch targets', () => {
  const dash = createTheme({ surface: 'dashboard' });
  assert.equal(dash.colors.background, '#F1EFEC');
  assert.equal(dash.minTouchTarget, touchTargets.dashboard);
  assert.ok(dash.minTouchTarget >= 48);
  assert.equal(theme.minTouchTarget, 44);
});

test('createTheme rejects invalid options with a clear message', () => {
  assert.throws(() => createTheme({ accent: 'not-a-colour' }), { name: 'RangeError', message: /Invalid colour/ });
  assert.throws(() => createTheme({ surface: 'kiosk' as never }), { name: 'RangeError', message: /Unknown theme surface/ });
  assert.throws(() => theme.orderStatus('lost' as never), { name: 'RangeError', message: /Unknown order status/ });
  assert.throws(() => theme.paymentStatus('lost' as never), { name: 'RangeError', message: /Unknown payment status/ });
});

test('every order and payment status has a label and a tone', () => {
  for (const status of ORDER_STATUSES) {
    const s = theme.orderStatus(status);
    assert.ok(s.label.length > 0, status);
    assert.ok(s.solid && s.tint && s.onTint, status);
  }
  for (const status of Object.keys(paymentStatusStyles) as PaymentTone[]) {
    assert.ok(theme.paymentStatus(status).label.length > 0, status);
  }
});

test('text/background pairs meet WCAG AA contrast', () => {
  const c = theme.colors;
  const pairs: [string, string, string][] = [
    ['text on background', c.text, c.background],
    ['text on surface', c.text, c.surface],
    ['muted text on background', c.textMuted, c.background],
    ['muted text on surface', c.textMuted, c.surface],
    ['inverse text on inverse surface', c.textInverse, c.surfaceInverse],
    ['accent text on surface', c.textAccent, c.surface],
    ['danger text on surface', c.textDanger, c.surface],
    ['success text on surface', c.textSuccess, c.surface],
    ['primary button', c.onPrimary, c.primary],
    ['secondary button', c.onSecondary, c.secondary],
    ['placeholder icon', c.onPlaceholder, c.placeholder],
  ];
  for (const [name, tone] of Object.entries(theme.tones)) {
    pairs.push([`${name} badge`, tone.onTint, tone.tint]);
    pairs.push([`${name} solid`, tone.onSolid, tone.solid]);
  }
  for (const [name, fg, bg] of pairs) {
    const ratio = contrastRatio(fg, bg);
    assert.ok(ratio >= 4.5, `${name}: ${fg} on ${bg} is ${ratio.toFixed(2)}:1`);
  }
});

test('per-shop accents stay readable, including very light ones', () => {
  for (const accent of [...SHOP_ACCENTS, '#FACC15', '#A7F3D0', '#111827']) {
    const t = createTheme({ accent });
    assert.equal(t.colors.primary, normalizeHex(accent));
    assert.ok(contrastRatio(t.colors.onPrimary, t.colors.primary) >= 3, `onPrimary for ${accent}`);
    assert.ok(contrastRatio(t.tones.accent.onTint, t.tones.accent.tint) >= 4.5, `onTint for ${accent}`);
    assert.ok(contrastRatio(t.colors.textAccent, t.colors.surface) >= 4.5, `textAccent for ${accent}`);
  }
});

test('the default accent keeps the exact designed tints', () => {
  assert.deepEqual(accentTone(DEFAULT_ACCENT), {
    solid: '#B4441B',
    onSolid: '#FFFFFF',
    tint: '#F8E6DC',
    onTint: '#7C2D12',
    border: '#FDBA74',
  });
});

test('touch targets meet the 44px minimum', () => {
  assert.ok(touchTargets.customer >= 44);
  assert.ok(theme.controlHeights.md >= 44);
});
