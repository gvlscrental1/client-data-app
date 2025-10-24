import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { Amplify } from "aws-amplify";

// ✅ For Amplify Gen 1 (amplifyconfiguration.json is generated under /src)
import amplifyConfig from "./amplifyconfiguration.json";

// ⚙️ For Amplify Gen 2 (if using the new Amplify Console builds, uncomment below instead)
// import outputs from "../amplify_outputs.json";
// Amplify.configure(outputs);

// Configure Amplify (Gen 1 default)
Amplify.configure(amplifyConfig);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);