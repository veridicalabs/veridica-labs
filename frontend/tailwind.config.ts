import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        primary: "#6366f1",
        "primary-dark": "#4f46e5",
      },
    },
  },
  plugins: [],
};
export default config;
