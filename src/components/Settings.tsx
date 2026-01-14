import React, { useState, useEffect } from "react";
import "./Settings.css";
import { API_BASE_URL } from "../config";

interface SettingsProps {
  theme: "dark" | "light";
  onThemeToggle: () => void;
}

const Settings: React.FC<SettingsProps> = ({ theme, onThemeToggle }) => {
  const [gmailConnected, setGmailConnected] = useState(false);
  const [gmailEmail, setGmailEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [mockMode, setMockMode] = useState(true);

  // Check Gmail connection status on load
  useEffect(() => {
    // Check URL params for OAuth callback result
    const urlParams = new URLSearchParams(window.location.search);
    const gmailParam = urlParams.get("gmail");

    if (gmailParam === "connected") {
      setGmailConnected(true);
      setMockMode(false);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);

      // Double check status with backend
      checkGmailStatus();
    } else {
      checkGmailStatus();
    }
  }, []);

  const checkGmailStatus = async () => {
    try {
      console.log("Checking Gmail status...");
      const response = await fetch(`${API_BASE_URL}/auth/gmail/status`);
      const data = await response.json();
      console.log("Gmail status:", data);

      if (data.connected) {
        setGmailConnected(true);
        setMockMode(false);
      } else {
        setGmailConnected(false);
        setMockMode(data.mock_mode);
      }
    } catch (error) {
      console.error("Error checking Gmail status:", error);
    }
  };

  const handleConnectGmail = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/gmail/connect`);
      const data = await response.json();

      if (data.auth_url) {
        // Redirect to Google OAuth
        window.location.href = data.auth_url;
      }
    } catch (error) {
      console.error("Error connecting Gmail:", error);
      alert("Failed to connect Gmail. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnectGmail = async () => {
    try {
      await fetch(`${API_BASE_URL}/auth/gmail/disconnect`, { method: "POST" });
      setGmailConnected(false);
      setGmailEmail("");
      setMockMode(true);
    } catch (error) {
      console.error("Error disconnecting Gmail:", error);
    }
  };

  return (
    <div className="settings-container">
      <div className="settings-header">
        <h2>Settings</h2>
        <p className="settings-subtitle">
          Configure your account and preferences
        </p>
      </div>

      {/* Appearance Section */}
      {/* <div className="settings-section">
        <div className="section-header">
          <h3>Appearance</h3>
        </div>
        <div className="section-content">
          <div className="setting-row">
            <div className="setting-info">
              <span className="setting-label">Theme</span>
              <span className="setting-description">
                Current: {theme === "dark" ? "Dark" : "Light"}
              </span>
            </div>
            <button className="theme-toggle-btn" onClick={onThemeToggle}>
              {theme === "dark" ? "☀️ Light Mode" : "🌙 Dark Mode"}
            </button>
          </div>
        </div>
      </div> */}

      {/* Gmail Connection Section */}
      <div className="settings-section gmail-section">
        <div className="section-header">
          <div className="section-title-row">
            <svg
              className="gmail-icon"
              viewBox="0 0 24 24"
              width="24"
              height="24"
            >
              <path
                fill="#EA4335"
                d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"
              />
            </svg>
            <h3>Gmail Account</h3>
          </div>
          <span
            className={`connection-status ${
              gmailConnected ? "connected" : "disconnected"
            }`}
          >
            {gmailConnected
              ? "✓ Connected"
              : mockMode
              ? "⚡ Demo Mode"
              : "○ Not Connected"}
          </span>
        </div>

        <div className="section-content">
          {gmailConnected ? (
            <div className="connected-state">
              <div className="connected-info">
                <span className="connected-email">
                  {gmailEmail || "Gmail Connected"}
                </span>
                <span className="connected-description">
                  Your Gmail is connected and ready for automation
                </span>
              </div>
              <button
                className="disconnect-btn"
                onClick={handleDisconnectGmail}
              >
                Disconnect
              </button>
            </div>
          ) : (
            <div className="connect-state">
              <p className="connect-description">
                Connect your Gmail account to enable email automation,
                AI-powered replies, and smart inbox management.
              </p>
              <button
                className="google-connect-btn"
                onClick={handleConnectGmail}
                disabled={loading}
              >
                <svg viewBox="0 0 24 24" width="18" height="18">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                {loading ? "Connecting..." : "Connect with Google"}
              </button>
              {mockMode && (
                <p className="demo-notice">
                  Currently in demo mode with sample emails. Connect Gmail for
                  real data.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Help Section */}
      <div className="settings-section help-section">
        <div className="section-header">
          <h3>About MailGen</h3>
        </div>
        <div className="section-content">
          <p className="about-text">
            MailGen is an AI-powered email automation tool that helps you manage
            your inbox efficiently.
          </p>
          <div className="feature-list">
            <div className="feature-item">✓ Smart email categorization</div>
            <div className="feature-item">✓ AI-powered reply suggestions</div>
            <div className="feature-item">
              ✓ Kanban workflow for email management
            </div>
            <div className="feature-item">✓ Task extraction from emails</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
