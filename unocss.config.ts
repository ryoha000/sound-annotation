import { defineConfig } from "@unocss/vite";
import presetWind from "@unocss/preset-wind";
import presetWebFonts from "@unocss/preset-web-fonts";
import presetIcons from "@unocss/preset-icons";
import transformerVariantGroup from "@unocss/transformer-variant-group";

export default defineConfig({
  presets: [
    presetWind(),
    presetIcons(),
    presetWebFonts({
      fonts: {
        sans: [
          {
            name: "Noto Sans JP",
            weights: ["400", "500", "700"],
          },
        ],
      },
    }),
  ],
  transformers: [transformerVariantGroup()],
  theme: {
    colors: {
      accent: {
        accent: "#487AF9",
        success: "#347d39",
        edit: "#116329",
        warning: "#c69026",
        error: "#EA4E60",
      },
      bg: {
        primary: "#22272e",
        secondary: "#2d333b",
        tertiary: "#323942",
        button: "#373e47",
        buttonHover: "#444c56",
      },
      ui: {},
      border: {},
      text: {
        primary: "#adbac7",
        secondary: "#CDD9E5",
        tertiary: "#768390",
        link: "#2e7cd5",
      },
    },
  },
});
