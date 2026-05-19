/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.{js,ts,tsx}",
    "./App.{js,ts,tsx}",
    "./components/**/*.{js,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: "#FAF8F5",
        foreground: "#3D3028",
        card: "#FFFFFF",
        "card-foreground": "#3D3028",
        primary: "#4CAF85",
        "primary-foreground": "#FFFFFF",
        secondary: "#F4F1EC",
        "secondary-foreground": "#5A5048",
        accent: "#E8A96B",
        "accent-foreground": "#4A3820",
        muted: "#EDE9E3",
        "muted-foreground": "#7A7068",
        border: "#E8E3DC",
        destructive: "#D44C3C",
        "destructive-foreground": "#FFFFFF",
      },
    },
  },
  plugins: [],
};
