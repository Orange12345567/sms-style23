import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        smsBg: "#0b93f6",
        smsLight: "#e5e7eb"
      }
    },
  },
  plugins: [],
};
export default config;
