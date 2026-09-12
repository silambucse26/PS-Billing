import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Initialize font size from settings (default: medium = 16px)
const savedFontSize = localStorage.getItem("pc_font_size") || "medium";
const fontSizesMap: Record<string, string> = {
  small: "14px",
  medium: "16px",
  large: "18px",
  xlarge: "20px",
};
document.documentElement.style.fontSize = fontSizesMap[savedFontSize] || "16px";

// Initialize font style family from settings (default: inter)
const savedFontStyle = localStorage.getItem("pc_font_style") || "inter";
const fontStylesMap: Record<string, string> = {
  inter: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  jakarta: "'Plus Jakarta Sans', sans-serif",
  roboto: "'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  outfit: "'Outfit', sans-serif",
  opensans: "'Open Sans', sans-serif",
  system: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
};
const activeFamily = fontStylesMap[savedFontStyle] || fontStylesMap.inter;
document.documentElement.style.setProperty('--app-font-family', activeFamily);
document.documentElement.style.fontFamily = activeFamily;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
