/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { ReactNode, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./buffer-polyfill";
//@ts-ignore
import { Buffer } from "buffer";

createRoot(document.getElementById("root")!).render((<StrictMode>{(<App />) as unknown as ReactNode}</StrictMode>) as ReactNode);
