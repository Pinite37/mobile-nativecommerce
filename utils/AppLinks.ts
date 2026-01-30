export function createPublicProductShareUrl(productId: string): string {
  // Prefer https links for better clickability across WhatsApp/SMS/etc.
  // Universal Links / Android App Links will open the app when configured.
  const baseUrl =
    process.env.EXPO_PUBLIC_WEB_URL || "https://aximarketplace.com";
  return `${baseUrl.replace(/\/$/, "")}/p/${productId}`;
}

export function createPublicAdvertisementShareUrl(
  advertisementId: string,
): string {
  const baseUrl =
    process.env.EXPO_PUBLIC_WEB_URL || "https://aximarketplace.com";
  return `${baseUrl.replace(/\/$/, "")}/ad/${advertisementId}`;
}
