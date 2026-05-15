/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./lib/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: [
          "SF Pro Display",
          "SF Pro Text",
          "-apple-system",
          "BlinkMacSystemFont",
          "Helvetica Neue",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
        sans: [
          "SF Pro Text",
          "SF Pro Display",
          "-apple-system",
          "BlinkMacSystemFont",
          "Helvetica Neue",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
      },
      colors: {
        // Apple-inspired canvas
        background: "#f5f5f7",
        foreground: "#1d1d1f",
        muted: "#ededf2",
        "muted-foreground": "rgba(0, 0, 0, 0.56)",
        border: "rgba(0, 0, 0, 0.08)",
        card: "#ffffff",
        // Accent = Apple Blue, reserved for interactive
        accent: "#0071e3",
        "accent-foreground": "#ffffff",
        "accent-tint": "rgba(0, 113, 227, 0.06)",
        link: "#0066cc",
        "link-dark": "#2997ff",
        // Semantic
        destructive: "#d70015",
        "destructive-foreground": "#ffffff",
        "destructive-tint": "rgba(215, 0, 21, 0.06)",
        success: "#1f883d",
        "success-foreground": "#ffffff",
        "success-tint": "rgba(31, 136, 61, 0.08)",
        warn: "#b25000",
        "warn-foreground": "#ffffff",
        "warn-tint": "rgba(178, 80, 0, 0.08)",
        // Dark surfaces from DESIGN.md
        onyx: "#1d1d1f",
        "surface-1": "#272729",
        "surface-2": "#262628",
        "surface-3": "#28282a",
        "surface-4": "#2a2a2d",
        "surface-5": "#242426",
      },
      spacing: {
        4.5: "18px",
        13: "52px",
        18: "72px",
      },
      backgroundImage: {
        "accent-fade":
          "linear-gradient(180deg, rgba(0,113,227,0.24) 0%, rgba(0,113,227,0) 100%)",
        "success-fade":
          "linear-gradient(180deg, rgba(31,136,61,0.22) 0%, rgba(31,136,61,0) 100%)",
        "warn-fade":
          "linear-gradient(180deg, rgba(178,80,0,0.22) 0%, rgba(178,80,0,0) 100%)",
        "destructive-fade":
          "linear-gradient(180deg, rgba(215,0,21,0.22) 0%, rgba(215,0,21,0) 100%)",
      },
      transitionTimingFunction: {
        "out-expo": "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      borderRadius: {
        none: "0",
        xs: "5px",
        sm: "8px",
        md: "11px",
        lg: "12px",
        xl: "18px",
        pill: "980px",
      },
      boxShadow: {
        product: "rgba(0, 0, 0, 0.22) 3px 5px 30px 0px",
        card: "0 1px 2px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06)",
        "card-dark": "0 1px 2px rgba(0,0,0,0.5), 0 12px 28px rgba(0,0,0,0.35)",
      },
      letterSpacing: {
        tighter: "-0.374px",
        tight: "-0.28px",
        cap: "-0.224px",
        micro: "-0.12px",
      },
      fontSize: {
        nano: ["10px", { lineHeight: "1.47", letterSpacing: "-0.08px" }],
        micro: ["12px", { lineHeight: "1.33", letterSpacing: "-0.12px" }],
        caption: ["14px", { lineHeight: "1.29", letterSpacing: "-0.224px" }],
        body: ["17px", { lineHeight: "1.47", letterSpacing: "-0.374px" }],
        button: ["17px", { lineHeight: "1", letterSpacing: "-0.022em" }],
        sub: ["21px", { lineHeight: "1.19", letterSpacing: "0.011em" }],
        tile: ["28px", { lineHeight: "1.14", letterSpacing: "0.007em" }],
        section: ["40px", { lineHeight: "1.1", letterSpacing: "-0.01em" }],
        hero: ["56px", { lineHeight: "1.07", letterSpacing: "-0.28px" }],
      },
      backdropBlur: {
        nav: "20px",
      },
      backdropSaturate: {
        nav: "1.8",
      },
    },
  },
  plugins: [],
};

export default config;
