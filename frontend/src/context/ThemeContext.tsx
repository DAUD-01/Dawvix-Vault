import React, {
  createContext,
  useContext,
  useLayoutEffect,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  argbFromHex,
  hexFromArgb,
  themeFromSourceColor,
} from "@material/material-color-utilities";
import {
  loadBackgroundImage,
  saveBackgroundImage,
  removeBackgroundImage as removeStoredBgImage,
} from "../utils/imageStorage";

export type ThemeMode = "dark" | "light";
export type SurfaceStyle = "matte" | "glass";
export type ColorIntensity = "default" | "vibrant";

export interface SavedTheme {
  seedColor: string;
  mode: ThemeMode;
  surfaceStyle: SurfaceStyle;
  colorIntensity: ColorIntensity;
  bgImageBlur: number;
}

interface ThemeContextValue {
  savedTheme: SavedTheme;
  seedColor: string;
  mode: ThemeMode;
  surfaceStyle: SurfaceStyle;
  colorIntensity: ColorIntensity;
  bgImageUrl: string | null;
  bgImageBlur: number;
  previewTheme: (theme: SavedTheme) => void;
  saveTheme: (theme: SavedTheme) => void;
  discardThemePreview: () => void;
  uploadBgImage: (file: File) => Promise<void>;
  removeBgImage: () => Promise<void>;
  resetTheme: () => void;
}

export const DEFAULT_THEME_SEED = "#0D9488";
export const DEFAULT_THEME: SavedTheme = {
  seedColor: DEFAULT_THEME_SEED,
  mode: "dark",
  surfaceStyle: "matte",
  colorIntensity: "default",
  bgImageBlur: 10,
};

const THEME_STORAGE_KEY = "dawvix_vault_theme";
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const isValidHex = (value: string): boolean => /^#[\da-f]{6}$/i.test(value);

function loadSavedTheme(): SavedTheme {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (!saved) return DEFAULT_THEME;

    const parsed = JSON.parse(saved);
    if (typeof parsed === "object" && parsed !== null) {
      const seedColor =
        typeof parsed.seedColor === "string" && isValidHex(parsed.seedColor)
          ? parsed.seedColor.toUpperCase()
          : DEFAULT_THEME.seedColor;

      const mode: ThemeMode =
        parsed.mode === "light" || parsed.mode === "dark"
          ? parsed.mode
          : DEFAULT_THEME.mode;

      const surfaceStyle: SurfaceStyle =
        parsed.surfaceStyle === "glass" ? "glass" : "matte";

      const colorIntensity: ColorIntensity =
        parsed.colorIntensity === "vibrant" ? "vibrant" : "default";

      const bgImageBlur =
        typeof parsed.bgImageBlur === "number" && Number.isFinite(parsed.bgImageBlur)
          ? Math.min(24, Math.max(0, parsed.bgImageBlur))
          : typeof parsed.bgImageBlur === "boolean"
            ? parsed.bgImageBlur ? DEFAULT_THEME.bgImageBlur : 0
            : DEFAULT_THEME.bgImageBlur;

      return { seedColor, mode, surfaceStyle, colorIntensity, bgImageBlur };
    }
    return DEFAULT_THEME;
  } catch (error) {
    console.error("Failed to load saved theme", error);
    return DEFAULT_THEME;
  }
}

const toneToRgb = (argb: number): string => {
  const color = hexFromArgb(argb);
  return `${parseInt(color.slice(1, 3), 16)} ${parseInt(color.slice(3, 5), 16)} ${parseInt(color.slice(5, 7), 16)}`;
};

export const ThemeProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [savedTheme, setSavedTheme] = useState<SavedTheme>(loadSavedTheme);
  const [themePreview, setThemePreview] = useState<SavedTheme | null>(null);
  const [bgImageUrl, setBgImageUrl] = useState<string | null>(null);
  const activeTheme = themePreview ?? savedTheme;

  // Load background image from IndexedDB on initial mount (BGI-014, BGI-015)
  useEffect(() => {
    let active = true;
    loadBackgroundImage().then((url) => {
      if (active && url) {
        setBgImageUrl(url);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const palette = useMemo(
    () => themeFromSourceColor(argbFromHex(activeTheme.seedColor)),
    [activeTheme.seedColor],
  );

  useLayoutEffect(() => {
    const root = document.documentElement;
    const isDark = activeTheme.mode === "dark";
    const isVibrant = activeTheme.colorIntensity === "vibrant";
    const scheme = palette.schemes[activeTheme.mode];

    // Compute semantic background and surface tones based on intensity (VBR-004, VBR-005, VBR-010)
    let bgArgb: number;
    let surfaceArgb: number;
    let surfaceVariantArgb: number;
    let primaryArgb: number;
    let onPrimaryArgb: number;
    let primaryContainerArgb: number;
    let onPrimaryContainerArgb: number;
    let outlineArgb: number;

    if (isDark) {
      if (isVibrant) {
        // Vibrant dark: deeper near-black / OLED surface with punchy saturated accents
        bgArgb = palette.palettes.neutral.tone(4);
        surfaceArgb = palette.palettes.neutral.tone(8);
        surfaceVariantArgb = palette.palettes.neutral.tone(13);
        primaryArgb = palette.palettes.primary.tone(72);
        onPrimaryArgb = palette.palettes.primary.tone(10);
        primaryContainerArgb = palette.palettes.primary.tone(25);
        onPrimaryContainerArgb = palette.palettes.primary.tone(90);
        outlineArgb = palette.palettes.neutralVariant.tone(55);
      } else {
        // Default dark: soft charcoal tonal scheme
        bgArgb = scheme.background;
        surfaceArgb = scheme.surface;
        surfaceVariantArgb = palette.palettes.neutral.tone(18);
        primaryArgb = scheme.primary;
        onPrimaryArgb = scheme.onPrimary;
        primaryContainerArgb = scheme.primaryContainer;
        onPrimaryContainerArgb = scheme.onPrimaryContainer;
        outlineArgb = scheme.outline;
      }
    } else {
      if (isVibrant) {
        // Vibrant light: crisp high-contrast canvas with saturated primary accents
        bgArgb = palette.palettes.neutral.tone(98);
        surfaceArgb = palette.palettes.neutral.tone(100);
        surfaceVariantArgb = palette.palettes.neutral.tone(92);
        primaryArgb = palette.palettes.primary.tone(36);
        onPrimaryArgb = palette.palettes.primary.tone(100);
        primaryContainerArgb = palette.palettes.primary.tone(88);
        onPrimaryContainerArgb = palette.palettes.primary.tone(10);
        outlineArgb = palette.palettes.neutralVariant.tone(46);
      } else {
        // Default light: soft neutral tint
        bgArgb = palette.palettes.neutral.tone(95);
        surfaceArgb = palette.palettes.neutral.tone(98);
        surfaceVariantArgb = palette.palettes.neutral.tone(94);
        primaryArgb = scheme.primary;
        onPrimaryArgb = scheme.onPrimary;
        primaryContainerArgb = scheme.primaryContainer;
        onPrimaryContainerArgb = scheme.onPrimaryContainer;
        outlineArgb = scheme.outline;
      }
    }

    // Tonal shades for tailwind color mapping
    const primaryTones = isDark
      ? isVibrant
        ? [99, 95, 90, 85, 75, 65, 55, 45, 30, 20, 10]
        : [99, 95, 90, 90, 80, 0, 60, 50, 40, 30, 20]
      : isVibrant
        ? [10, 15, 25, 35, 45, 55, 65, 75, 85, 92, 98]
        : [10, 20, 30, 40, 30, 0, 50, 60, 70, 80, 90];

    const primaryShades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

    const slateTones = isDark
      ? isVibrant
        ? [99, 95, 88, 76, 62, 58, 34, 22, 12, 6, 2] // OLED dark range
        : [99, 95, 90, 80, 70, 62, 50, 40, 30, 20, 10]
      : isVibrant
        ? [8, 12, 18, 28, 40, 44, 64, 76, 88, 94, 99]
        : [10, 15, 20, 30, 40, 44, 60, 70, 80, 90, 98];

    const slateShades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

    // Data attributes for system state
    root.dataset.themeMode = activeTheme.mode;
    root.dataset.surfaceStyle = activeTheme.surfaceStyle;
    root.dataset.colorIntensity = activeTheme.colorIntensity;

    // Semantic CSS properties
    root.style.setProperty("--color-primary", hexFromArgb(primaryArgb));
    root.style.setProperty("--color-on-primary", hexFromArgb(onPrimaryArgb));
    root.style.setProperty("--color-primary-container", hexFromArgb(primaryContainerArgb));
    root.style.setProperty("--color-on-primary-container", hexFromArgb(onPrimaryContainerArgb));
    root.style.setProperty("--color-background", hexFromArgb(bgArgb));
    root.style.setProperty("--color-on-background", hexFromArgb(scheme.onBackground));
    root.style.setProperty("--color-surface", hexFromArgb(surfaceArgb));
    root.style.setProperty("--color-on-surface", hexFromArgb(scheme.onSurface));
    root.style.setProperty("--color-outline", hexFromArgb(outlineArgb));
    root.style.setProperty("--color-error", hexFromArgb(scheme.error));
    root.style.setProperty("--color-on-error", hexFromArgb(scheme.onError));
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", hexFromArgb(bgArgb));

    // Channels for Tailwind alpha opacity
    root.style.setProperty("--theme-primary", toneToRgb(primaryArgb));
    root.style.setProperty("--theme-primary-container", hexFromArgb(primaryContainerArgb));
    root.style.setProperty("--theme-on-primary", hexFromArgb(onPrimaryArgb));
    root.style.setProperty("--theme-on-primary-channel", toneToRgb(onPrimaryArgb));
    root.style.setProperty("--theme-primary-container-channel", toneToRgb(primaryContainerArgb));
    root.style.setProperty("--theme-on-primary-container-channel", toneToRgb(onPrimaryContainerArgb));
    root.style.setProperty("--theme-on-error-channel", toneToRgb(scheme.onError));
    root.style.setProperty("--theme-outline-channel", toneToRgb(outlineArgb));
    root.style.setProperty("--theme-surface-variant-channel", toneToRgb(surfaceVariantArgb));
    root.style.setProperty("--theme-background-channel", toneToRgb(bgArgb));
    root.style.setProperty("--theme-surface-channel", toneToRgb(surfaceArgb));
    root.style.setProperty("--theme-on-surface-channel", toneToRgb(scheme.onSurface));

    // Palette shades
    primaryTones.forEach((tone, index) => {
      const color = tone === 0 ? primaryArgb : palette.palettes.primary.tone(tone);
      root.style.setProperty(`--theme-teal-${primaryShades[index]}`, toneToRgb(color));
    });

    slateTones.forEach((tone, index) => {
      root.style.setProperty(
        `--theme-slate-${slateShades[index]}`,
        toneToRgb(palette.palettes.neutral.tone(tone)),
      );
    });
  }, [palette, activeTheme.mode, activeTheme.surfaceStyle, activeTheme.colorIntensity]);

  const persistTheme = (next: SavedTheme) => {
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(next));
    setSavedTheme(next);
  };

  const normalizeTheme = (theme: SavedTheme): SavedTheme => {
    if (!isValidHex(theme.seedColor)) {
      throw new Error("Theme color must be a valid six-digit HEX color.");
    }
    if (!Number.isFinite(theme.bgImageBlur) || theme.bgImageBlur < 0 || theme.bgImageBlur > 24) {
      throw new Error("Background image blur must be between 0 and 24 pixels.");
    }
    return { ...theme, seedColor: theme.seedColor.toUpperCase() };
  };

  const previewTheme = (theme: SavedTheme) => {
    setThemePreview(normalizeTheme(theme));
  };

  const saveTheme = (theme: SavedTheme) => {
    const next = normalizeTheme(theme);
    persistTheme(next);
    setThemePreview(null);
  };

  const discardThemePreview = () => {
    setThemePreview(null);
  };

  const uploadBgImage = async (file: File) => {
    const dataUrl = await saveBackgroundImage(file);
    setBgImageUrl(dataUrl);
  };

  const removeBgImage = async () => {
    await removeStoredBgImage();
    setBgImageUrl(null);
  };

  const resetTheme = () => {
    removeStoredBgImage();
    setBgImageUrl(null);
    persistTheme(DEFAULT_THEME);
  };

  return (
    <ThemeContext.Provider
      value={{
        savedTheme,
        seedColor: activeTheme.seedColor,
        mode: activeTheme.mode,
        surfaceStyle: activeTheme.surfaceStyle,
        colorIntensity: activeTheme.colorIntensity,
        bgImageUrl,
        bgImageBlur: activeTheme.bgImageBlur,
        previewTheme,
        saveTheme,
        discardThemePreview,
        uploadBgImage,
        removeBgImage,
        resetTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider.");
  }
  return context;
};
