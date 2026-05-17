import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import TheGreatDivide from "./TheGreatDivide.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <TheGreatDivide />
  </StrictMode>
);
