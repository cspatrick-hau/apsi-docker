import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LandingPage from "./LandingPage";
import App from "./App";
import UserManual from "./UserManual";
import VideoDemoPage from "./pages/VideoDemoPage";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/main" element={<App />} />
        <Route path="/manual" element={<UserManual />} />
        <Route path="/video-demo" element={<VideoDemoPage />} />
      </Routes>
    </Router>
  </React.StrictMode>
);
