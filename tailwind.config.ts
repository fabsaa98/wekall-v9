import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      fontFamily: {
        sans: ["Roboto", "sans-serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        wk: {
          violet: "hsl(var(--wk-violet))",
          "violet-dark": "hsl(var(--wk-violet-dark))",
          "violet-soft": "hsl(var(--wk-violet-soft))",
          "violet-light": "hsl(var(--wk-violet-light))",
          green: "hsl(var(--wk-green))",
          "green-dark": "hsl(var(--wk-green-dark))",
          "green-light": "hsl(var(--wk-green-light))",
          blue: "hsl(var(--wk-blue))",
          "blue-light": "hsl(var(--wk-blue-light))",
          yellow: "hsl(var(--wk-yellow))",
          "yellow-dark": "hsl(var(--wk-yellow-dark))",
          "yellow-light": "hsl(var(--wk-yellow-light))",
          red: "hsl(var(--wk-red))",
          "red-dark": "hsl(var(--wk-red-dark))",
          "red-light": "hsl(var(--wk-red-light))",
          black: "hsl(var(--wk-black))",
          "black-soft": "hsl(var(--wk-black-soft))",
          "black-light": "hsl(var(--wk-black-light))",
          gray: "hsl(var(--wk-gray))",
          "gray-medium": "hsl(var(--wk-gray-medium))",
          "gray-border": "hsl(var(--wk-gray-border))",
          "gray-soft": "hsl(var(--wk-gray-soft))",
          "gray-light": "hsl(var(--wk-gray-light))",
          white: "hsl(var(--wk-white))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        "wk-xs": "var(--wk-shadow-xs)",
        "wk-sm": "var(--wk-shadow-sm)",
        "wk-md": "var(--wk-shadow-md)",
        "wk-lg": "var(--wk-shadow-lg)",
        "wk-xl": "var(--wk-shadow-xl)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "pulse-dot": {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "1" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "pulse-dot": "pulse-dot 1.4s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
