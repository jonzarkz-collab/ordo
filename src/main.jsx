import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";
// Liquid glass (1.0.2). Imported LAST so equal-specificity rules in
// styles.css cannot silently win. Deleting this line restores the flat look.
import "./styles/glass.css";

createRoot(document.getElementById("root")).render(<App />);
