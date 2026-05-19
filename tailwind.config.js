const { fontFamily } = require("tailwindcss/defaultTheme");

module.exports = {
  mode: "jit",
  darkMode: "class",
  purge: ["./index.html", "./src/**/*.{vue,js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter var", "Inter", ...fontFamily.sans],
      },
      fontSize: {
        "display-xl": ["4.5rem", { lineHeight: "1.1", letterSpacing: "-0.02em" }],
        "display-lg": ["3.75rem", { lineHeight: "1.1", letterSpacing: "-0.02em" }],
        "display": ["3rem", { lineHeight: "1.15", letterSpacing: "-0.02em" }],
        "heading-lg": ["2.25rem", { lineHeight: "1.2", letterSpacing: "-0.01em" }],
        "heading": ["1.875rem", { lineHeight: "1.3", letterSpacing: "-0.01em" }],
        "heading-sm": ["1.5rem", { lineHeight: "1.35" }],
        "body-lg": ["1.125rem", { lineHeight: "1.6" }],
        "body": ["1rem", { lineHeight: "1.6" }],
        "body-sm": ["0.875rem", { lineHeight: "1.5" }],
        "caption": ["0.75rem", { lineHeight: "1.4" }],
        "micro": ["0.6875rem", { lineHeight: "1.3" }],
      },
      borderRadius: {
        DEFAULT: "8px",
        secondary: "4px",
        container: "12px",
        "2xl": "16px",
        "3xl": "24px",
      },
      boxShadow: {
        DEFAULT: "0 1px 4px rgba(0, 0, 0, 0.1)",
        hover: "0 2px 8px rgba(0, 0, 0, 0.12)",
        "card": "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.06)",
        "card-hover": "0 4px 16px rgba(0,0,0,0.1), 0 8px 32px rgba(0,0,0,0.06)",
        "glow": "0 0 20px rgba(79, 70, 229, 0.15)",
        "glow-lg": "0 0 40px rgba(79, 70, 229, 0.2)",
        "inner-glow": "inset 0 1px 2px rgba(255,255,255,0.1)",
      },
      colors: {
        primary: {
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          DEFAULT: "#4F46E5",
          600: "#4F46E5",
          700: "#4338CA",
          hover: "#4338CA",
          800: "#3730a3",
          900: "#312e81",
        },
        secondary: {
          DEFAULT: "#6B7280",
          hover: "#4B5563",
        },
        accent: {
          DEFAULT: "#8B5CF6",
          hover: "#7C3AED",
          50: "#f5f3ff",
        },
        success: {
          50: "#ecfdf5",
          500: "#10b981",
          600: "#059669",
          700: "#047857",
        },
        warning: {
          50: "#fffbeb",
          500: "#f59e0b",
          600: "#d97706",
        },
        danger: {
          50: "#fef2f2",
          500: "#ef4444",
          600: "#dc2626",
        },
        surface: {
          DEFAULT: "#ffffff",
          secondary: "#f8fafc",
          tertiary: "#f1f5f9",
        },
        dark: {
          bg: "#0f172a",
          surface: "#1e293b",
          "surface-2": "#334155",
          border: "#475569",
          text: "#f8fafc",
          "text-secondary": "#94a3b8",
        },
      },
      spacing: {
        "form-field": "16px",
        section: "32px",
        "18": "4.5rem",
        "88": "22rem",
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-out",
        "fade-in-up": "fadeInUp 0.6s ease-out",
        "fade-in-down": "fadeInDown 0.4s ease-out",
        "slide-in-right": "slideInRight 0.3s ease-out",
        "slide-in-left": "slideInLeft 0.3s ease-out",
        "scale-in": "scaleIn 0.3s ease-out",
        "float": "float 6s ease-in-out infinite",
        "pulse-soft": "pulseSoft 2s ease-in-out infinite",
        "shimmer": "shimmer 2s linear infinite",
        "bounce-soft": "bounceSoft 2s ease-in-out infinite",
        "gradient": "gradient 8s ease infinite",
        "count-up": "countUp 1.5s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeInDown: {
          "0%": { opacity: "0", transform: "translateY(-10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideInRight: {
          "0%": { opacity: "0", transform: "translateX(20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        slideInLeft: {
          "0%": { opacity: "0", transform: "translateX(-20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        bounceSoft: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-5px)" },
        },
        gradient: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        countUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      backdropBlur: {
        xs: "2px",
      },
      transitionDuration: {
        "400": "400ms",
      },
    },
  },
  variants: {
    extend: {
      boxShadow: ["hover", "active", "dark"],
      opacity: ["dark"],
      backgroundColor: ["dark", "hover", "active"],
      textColor: ["dark", "hover"],
      borderColor: ["dark", "hover", "focus"],
    },
  },
};
