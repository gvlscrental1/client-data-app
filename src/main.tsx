import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { Amplify } from "aws-amplify";
import amplifyConfig from "./amplifyconfiguration.json"; //This is for Gen1 Amplify. and if main.tsx is in src folder.
//import outputs from "../amplify_outputs.json"; //This is for Gen2 Amplify.
//import amplifyConfig from "../amplifyconfiguration.json"; //This is for Gen1 Amplify and if main.tsx is in root folder.

//Amplify.configure(outputs);//This is for Gen2 Amplify.
Amplify.configure(amplifyConfig); //This is for Gen1 Amplify.

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
