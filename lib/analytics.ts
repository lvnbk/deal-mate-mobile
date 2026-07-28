import PostHog from 'posthog-react-native';

// PostHog is optional: without a key (e.g. local dev) every call is a no-op,
// so screens can track events unconditionally.
const KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY;
const HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

const client = KEY ? new PostHog(KEY, { host: HOST }) : null;

// Exposed so the feature-flag layer can read remote flags off the same instance.
export const posthogClient = client;

export const analyticsEnabled = !!client;

// Event names kept in one place so backend/dashboards stay consistent.
export const events = {
  onboardingComplete: 'onboarding_complete',
  dealView: 'deal_view',
  dealOpen: 'deal_open',
  dealSave: 'deal_save',
  dealUnsave: 'deal_unsave',
  dealShare: 'deal_share',
  feedbackSubmit: 'feedback_submit',
  alertSet: 'price_alert_set',
  alertDelete: 'price_alert_delete',
  barcodeScan: 'barcode_scan',
  barcodeResult: 'barcode_result',
} as const;

type Props = Record<string, string | number | boolean | null>;

export const analytics = {
  capture(event: string, props?: Props) {
    client?.capture(event, props);
  },
  screen(name: string, props?: Props) {
    client?.screen(name, props);
  },
  identify(distinctId: string, props?: Props) {
    client?.identify(distinctId, props);
  },
};
