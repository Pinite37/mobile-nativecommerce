import { Linking, Platform } from "react-native";

type ContactOpenResult =
  | { ok: true }
  | { ok: false; reason: "invalid_phone" | "failed"; error?: unknown };

const DEFAULT_COUNTRY_CALLING_CODE = "+229";

export function normalizePhoneNumber(
  rawPhone: string,
  defaultCountryCallingCode: string = DEFAULT_COUNTRY_CALLING_CODE,
): string | null {
  if (!rawPhone) return null;

  let cleaned = rawPhone.trim();
  if (!cleaned) return null;

  // Keep only digits and '+'
  cleaned = cleaned.replace(/[^0-9+]/g, "");

  // Remove '+' not at start
  cleaned = cleaned.replace(/(?!^)\+/g, "");

  // Convert 00 prefix to +
  if (cleaned.startsWith("00")) {
    cleaned = "+" + cleaned.slice(2);
  }

  // If already in E.164-ish form
  if (cleaned.startsWith("+")) {
    return cleaned;
  }

  // If user typed country code without '+'
  if (
    /^\d+$/.test(cleaned) &&
    cleaned.startsWith(defaultCountryCallingCode.replace("+", ""))
  ) {
    return "+" + cleaned;
  }

  // Remove leading zeros and prepend default CC
  cleaned = cleaned.replace(/^0+/, "");
  if (!cleaned) return null;

  return defaultCountryCallingCode + cleaned;
}

export async function openWhatsAppChat(params: {
  phone: string;
  message: string;
  defaultCountryCallingCode?: string;
}): Promise<ContactOpenResult> {
  const normalizedPhone = normalizePhoneNumber(
    params.phone,
    params.defaultCountryCallingCode,
  );

  if (!normalizedPhone) {
    return { ok: false, reason: "invalid_phone" };
  }

  // wa.me expects digits only (no '+')
  const waDigits = normalizedPhone.replace(/^\+/, "");

  const encodedMessage = encodeURIComponent(params.message);
  const appUrl = `whatsapp://send?phone=${normalizedPhone}&text=${encodedMessage}`;
  const webUrl = `https://wa.me/${waDigits}?text=${encodedMessage}`;

  // Avoid canOpenURL: on some Android/iOS configurations it can be unreliable in prod.
  // Try the native scheme first, then fall back to the universal link.
  try {
    await Linking.openURL(appUrl);
    return { ok: true };
  } catch {
    try {
      await Linking.openURL(webUrl);
      return { ok: true };
    } catch (webError) {
      return { ok: false, reason: "failed", error: webError };
    }
  }
}

export async function openPhoneCall(
  phone: string,
  defaultCountryCallingCode: string = DEFAULT_COUNTRY_CALLING_CODE,
): Promise<ContactOpenResult> {
  const normalizedPhone = normalizePhoneNumber(
    phone,
    defaultCountryCallingCode,
  );

  if (!normalizedPhone) {
    return { ok: false, reason: "invalid_phone" };
  }

  const telUrl = `tel:${normalizedPhone}`;

  // Avoid canOpenURL: it may return false on some devices even though a dialer exists.
  try {
    await Linking.openURL(telUrl);
    return { ok: true };
  } catch (error) {
    // iOS sometimes behaves better with telprompt
    if (Platform.OS === "ios") {
      try {
        await Linking.openURL(`telprompt:${normalizedPhone}`);
        return { ok: true };
      } catch {
        // fallthrough
      }
    }

    return { ok: false, reason: "failed", error };
  }
}

export async function openWebsiteUrl(
  urlOrDomain: string,
): Promise<{ ok: true } | { ok: false; error?: unknown }> {
  if (!urlOrDomain || !urlOrDomain.trim()) {
    return { ok: false };
  }

  let url = urlOrDomain.trim();
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }

  try {
    await Linking.openURL(url);
    return { ok: true };
  } catch (error) {
    return { ok: false, error };
  }
}
