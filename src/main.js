import { jsx as _jsx } from "react/jsx-runtime";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { Amplify } from "aws-amplify";
import awsExports from "./aws-exports"; // modern Amplify uses aws-exports.js
// Configure Amplify once
Amplify.configure(awsExports);
ReactDOM.createRoot(document.getElementById("root")).render(_jsx(React.StrictMode, { children: _jsx(App, {}) }));
