/**
 * Design tokens — AXI Marketplace
 * Police: Plus Jakarta Sans | Couleurs: voir colors.ts
 */

// ── Typographie ────────────────────────────────────────────────
export const font = {
  regular: "PlusJakartaSans-Regular",
  medium: "PlusJakartaSans-Medium",
  semibold: "PlusJakartaSans-SemiBold",
  bold: "PlusJakartaSans-Bold",
  light: "PlusJakartaSans-Light",
} as const;

export const fontSize = {
  xs: 11,
  sm: 12,
  base: 14,
  body: 16,
  sectionTitle: 18,
  title: 20,
  display: 24,
  hero: 30,
} as const;

export const lineHeight = {
  tight: 1.2,
  normal: 1.45,
  relaxed: 1.65,
} as const;

// ── Espacements (grille 4px) ───────────────────────────────────
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  "2xl": 32,
  "3xl": 40,
  "4xl": 48,
} as const;

// ── Rayons ────────────────────────────────────────────────────
export const radius = {
  sm: 8,
  md: 12,
  btn: 15,
  product: 15,
  notification: 15,
  card: 20,
  full: 9999,
  imgInner: 5,
} as const;

// ── Boutons ───────────────────────────────────────────────────
export const button = {
  minHeight: 44,
  maxHeight: 54,
  radius: radius.btn,
  paddingH: spacing.lg,
  paddingV: spacing.sm + 4,
} as const;

// ── Icônes ────────────────────────────────────────────────────
export const icon = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 32,
  xl: 48,
  containerPadding: 10,
  minPadding: 5,
} as const;

// ── Cards ─────────────────────────────────────────────────────
export const card = {
  radius: radius.card,
  padding: spacing.base,
  gap: spacing.sm,
} as const;

// ── Product card ──────────────────────────────────────────────
export const productCard = {
  radius: radius.product,
  padding: spacing.sm + 2,
  imgRadius: radius.imgInner,
  titleSize: fontSize.body,
  titleFont: font.semibold,
} as const;

// ── Notification row ──────────────────────────────────────────
export const notificationRow = {
  padding: spacing.sm + 2,
  radius: radius.notification,
} as const;

// ── Shadows (iOS + Android) ───────────────────────────────────
export const shadow = {
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;
