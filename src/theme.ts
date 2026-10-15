export type Palette = {
  primary: string;
  primaryDark: string;
  primaryLight: string;
  primarySoft: string;
  page: string;
  card: string;
  secondary: string;
  ink: string;
  muted: string;
  faint: string;
  white: string;
  line: string;
  lineSoft: string;
  success: string;
  danger: string;
  warning: string;
  heart: string;
  /** Pale tile behind Plot and Villa on the home screen. */
  highlight: string;
  forest: string;
  green: string;
  cream: string;
  mint: string;
};

const shared = {
  white: "#FFFFFF",
  danger: "#C0392B",
  heart: "#C45C48",
  warning: "#C88A3D",
};

function palette(input: Omit<Palette, "white" | "danger" | "heart" | "warning" | "forest" | "green" | "cream" | "mint" | "faint" | "lineSoft" | "highlight"> & { faint?: string; lineSoft?: string; warning?: string; highlight: string }): Palette {
  return {
    ...shared,
    ...input,
    faint: input.faint ?? input.muted,
    lineSoft: input.lineSoft ?? input.line,
    warning: input.warning ?? shared.warning,
    highlight: input.highlight,
    forest: input.primaryDark,
    green: input.primary,
    cream: input.page,
    mint: input.primarySoft,
  };
}

/**
 * Terracotta is the current PropertySetu combination and must stay identical
 * to the colours the app shipped with. The other sets match Vadi.
 */
export const THEMES = {
  terracotta: {
    primary: "#B56A45",
    primaryDark: "#8F4F32",
    primaryLight: "#D9A07F",
    primarySoft: "#F3E4DB",
    page: "#F7F3EC",
    card: "#FFFFFF",
    secondary: "#F1EAE2",
    ink: "#171717",
    muted: "#6F6A64",
    faint: "#99928A",
    white: "#FFFFFF",
    line: "#E4DDD5",
    lineSoft: "#EEE8E1",
    success: "#4F7D5B",
    danger: "#C0392B",
    warning: "#C88A3D",
    heart: "#C45C48",
    highlight: "#F8EEDD",
    forest: "#8F4F32",
    green: "#B56A45",
    cream: "#F7F3EC",
    mint: "#F3E4DB",
  },
  "fresh-green": palette({
    primary: "#276438",
    primaryDark: "#1D4D2A",
    primaryLight: "#3A8A4C",
    primarySoft: "#E4F0DF",
    page: "#F8FCF6",
    card: "#FCFEFA",
    secondary: "#E4F0DF",
    ink: "#183D25",
    muted: "#526B58",
    line: "#D6E5D3",
    success: "#4F7D5B",
    highlight: "#F3F8EF",
  }),
  "cream-mango": palette({
    primary: "#2F6B3C",
    primaryDark: "#1E4D2C",
    primaryLight: "#3E8C51",
    primarySoft: "#FBEBD3",
    page: "#FFF8EC",
    card: "#FFFFFF",
    secondary: "#FBEBD3",
    ink: "#243B2A",
    muted: "#6B7280",
    line: "#E8DFCF",
    success: "#2F6B3C",
    warning: "#F4A340",
    highlight: "#FFF1D6",
  }),
  "classic-green": palette({
    primary: "#2E7D32",
    primaryDark: "#1B5E20",
    primaryLight: "#43A047",
    primarySoft: "#E8F5E9",
    page: "#F5F7F2",
    card: "#FFFFFF",
    secondary: "#E8F5E9",
    ink: "#1B5E20",
    muted: "#6B7280",
    line: "#E5E7EB",
    success: "#2E7D32",
    highlight: "#F1F8F1",
  }),
  "olive-ivory": palette({
    primary: "#4B6036",
    primaryDark: "#394A29",
    primaryLight: "#6B8450",
    primarySoft: "#E9EEDC",
    page: "#FAF9F3",
    card: "#FFFFFF",
    secondary: "#E9EEDC",
    ink: "#293124",
    muted: "#687060",
    line: "#E1E3D8",
    success: "#4B6036",
    highlight: "#F4F6EA",
  }),
  "teal-pistachio": palette({
    primary: "#176B52",
    primaryDark: "#12533F",
    primaryLight: "#2B8A6D",
    primarySoft: "#E3EED5",
    page: "#F7FAF8",
    card: "#FFFFFF",
    secondary: "#E3EED5",
    ink: "#203B32",
    muted: "#61736B",
    line: "#DCE6DF",
    success: "#176B52",
    highlight: "#EEF5EA",
  }),
  winter: palette({
    primary: "#1E5690",
    primaryDark: "#163E68",
    primaryLight: "#3C7EBE",
    primarySoft: "#E3F0F8",
    page: "#F4F7FA",
    card: "#FFFFFF",
    secondary: "#E3F0F8",
    ink: "#163044",
    muted: "#5A7084",
    line: "#D3E2EE",
    success: "#1E5690",
    highlight: "#EAF3FA",
  }),
  summer: palette({
    primary: "#E07A1F",
    primaryDark: "#B85E12",
    primaryLight: "#F0A04A",
    primarySoft: "#FFE8C8",
    page: "#FFF6E8",
    card: "#FFFFFF",
    secondary: "#FFE8C8",
    ink: "#3A2410",
    muted: "#8A6A4A",
    line: "#F0DCC4",
    success: "#C46A12",
    warning: "#FFB020",
    highlight: "#FFE8C2",
  }),
  monsoon: palette({
    primary: "#0D6484",
    primaryDark: "#084E68",
    primaryLight: "#1A8BB4",
    primarySoft: "#DEEDF4",
    page: "#E6F1F7",
    card: "#FFFFFF",
    secondary: "#DEEDF4",
    ink: "#102833",
    muted: "#4B6573",
    line: "#D0DEE6",
    success: "#0D6484",
    highlight: "#E7F4FA",
  }),
} satisfies Record<string, Palette>;

export type ThemeKey = keyof typeof THEMES;
export const THEME_KEYS = Object.keys(THEMES) as ThemeKey[];
export const DEFAULT_THEME: ThemeKey = "terracotta";

export function isThemeKey(value: unknown): value is ThemeKey {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(THEMES, value);
}

let activeTheme: ThemeKey = DEFAULT_THEME;
let themeVersion = 0;

export const colors: Palette = { ...THEMES[DEFAULT_THEME] };

export function setTheme(key: ThemeKey) {
  if (!isThemeKey(key) || key === activeTheme) return;
  activeTheme = key;
  Object.assign(colors, THEMES[key]);
  buttonShadow.shadowColor = colors.primaryDark;
  cardShadow.shadowColor = colors.ink;
  themeVersion += 1;
}

export function getThemeKey(): ThemeKey {
  return activeTheme;
}

export function themed<T extends object>(factory: () => T): T {
  let cached: T | undefined;
  let cachedVersion = -1;
  const resolve = (): T => {
    if (cached === undefined || cachedVersion !== themeVersion) {
      cached = factory();
      cachedVersion = themeVersion;
    }
    return cached;
  };
  return new Proxy({} as T, {
    get: (_target, prop) => (resolve() as Record<PropertyKey, unknown>)[prop],
    has: (_target, prop) => prop in resolve(),
    ownKeys: () => Reflect.ownKeys(resolve()),
    getOwnPropertyDescriptor: (_target, prop) => {
      const desc = Object.getOwnPropertyDescriptor(resolve(), prop);
      if (desc) desc.configurable = true;
      return desc;
    },
  });
}

export const space = {
  screen: 20,
  card: 16,
};

export const buttonShadow = {
  shadowColor: "#8F4F32",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.16,
  shadowRadius: 8,
  elevation: 3,
};

export const cardShadow = {
  shadowColor: "#171717",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 2,
};
