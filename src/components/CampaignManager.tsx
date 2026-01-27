import React, { useState, useEffect, useCallback } from "react";
import {
  Megaphone,
  Plus,
  Play,
  Pause,
  Trash2,
  Users,
  Mail,
  Calendar,
  Target,
  BarChart3,
  Clock,
  CheckCircle2,
  XCircle,
  Send,
  Upload,
  FileText,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import "./CampaignManager.css";
import { API_BASE_URL } from "../config";

interface Recipient {
  email: string;
  name: string;
  status: "pending" | "sent" | "failed";
  sent_at?: string;
  error?: string;
}

interface Campaign {
  id: string;
  name: string;
  description: string;
  subject: string;
  template: string;
  tone: string;
  status: "draft" | "active" | "paused" | "completed";
  type: string;
  recipients: Recipient[];
  sent: number;
  opened: number;
  clicked: number;
  failed: number;
  created_at: string;
  logs: { timestamp: string; message: string }[];
}

const CampaignManager: React.FC = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [filter, setFilter] = useState<
    "all" | "active" | "draft" | "completed"
  >("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadingCampaign, setUploadingCampaign] = useState<string | null>(
    null,
  );

  const [newCampaign, setNewCampaign] = useState({
    name: "",
    description: "",
    subject: "",
    template:
      "Hi {{name}},\n\nThank you for your interest!\n\nBest regards,\nAbhishek",
    tone: "professional",
    type: "email",
  });

  const fetchCampaigns = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/campaigns`);
      if (response.ok) {
        const data = await response.json();
        setCampaigns(data.campaigns || []);
      }
    } catch (error) {
      console.error("Error fetching campaigns:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCampaigns();
    // Poll for updates every 3 seconds if any campaign is active
    const interval = setInterval(() => {
      if (campaigns.some((c) => c.status === "active")) {
        fetchCampaigns();
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [fetchCampaigns, campaigns]);

  const filteredCampaigns = campaigns.filter((campaign) => {
    if (filter === "all") return true;
    return campaign.status === filter;
  });

  const createCampaign = async () => {
    if (!newCampaign.name.trim() || !newCampaign.subject.trim()) return;

    try {
      const response = await fetch(`${API_BASE_URL}/campaigns/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCampaign),
      });

      if (response.ok) {
        const data = await response.json();
        setCampaigns((prev) => [data.campaign, ...prev]);
        setNewCampaign({
          name: "",
          description: "",
          subject: "",
          template:
            "Hi {{name}},\n\nThank you for your interest!\n\nBest regards,\nAbhishek",
          tone: "professional",
          type: "email",
        });
        setShowCreateModal(false);
      }
    } catch (error) {
      console.error("Error creating campaign:", error);
    }
  };

  const handleFileUpload = async (campaignId: string, file: File) => {
    setUploadingCampaign(campaignId);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(
        `${API_BASE_URL}/campaigns/${campaignId}/upload`,
        {
          method: "POST",
          body: formData,
        },
      );

      if (response.ok) {
        const data = await response.json();
        setCampaigns((prev) =>
          prev.map((c) => (c.id === campaignId ? data.campaign : c)),
        );
        alert(`✅ Uploaded ${data.recipients_count} recipients!`);
      } else {
        const error = await response.json();
        alert(`❌ Error: ${error.detail}`);
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("❌ Error uploading file");
    } finally {
      setUploadingCampaign(null);
    }
  };

  const startCampaign = async (campaignId: string) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/campaigns/${campaignId}/start`,
        {
          method: "POST",
        },
      );

      if (response.ok) {
        const data = await response.json();
        setCampaigns((prev) =>
          prev.map((c) => (c.id === campaignId ? data.campaign : c)),
        );
      } else {
        const error = await response.json();
        alert(`❌ Error: ${error.detail}`);
      }
    } catch (error) {
      console.error("Error starting campaign:", error);
    }
  };

  const pauseCampaign = async (campaignId: string) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/campaigns/${campaignId}/pause`,
        {
          method: "POST",
        },
      );

      if (response.ok) {
        const data = await response.json();
        setCampaigns((prev) =>
          prev.map((c) => (c.id === campaignId ? data.campaign : c)),
        );
      }
    } catch (error) {
      console.error("Error pausing campaign:", error);
    }
  };

  const deleteCampaign = async (campaignId: string) => {
    if (!window.confirm("Are you sure you want to delete this campaign?"))
      return;

    try {
      const response = await fetch(`${API_BASE_URL}/campaigns/${campaignId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setCampaigns((prev) => prev.filter((c) => c.id !== campaignId));
      }
    } catch (error) {
      console.error("Error deleting campaign:", error);
    }
  };

  const getStatusColor = (status: Campaign["status"]) => {
    switch (status) {
      case "active":
        return "status-active";
      case "paused":
        return "status-paused";
      case "completed":
        return "status-completed";
      case "draft":
        return "status-draft";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "email":
        return <Mail size={16} />;
      case "newsletter":
        return <Send size={16} />;
      case "promotional":
        return <Target size={16} />;
      case "follow-up":
        return <Users size={16} />;
      default:
        return <Mail size={16} />;
    }
  };

  const stats = {
    total: campaigns.length,
    active: campaigns.filter((c) => c.status === "active").length,
    totalSent: campaigns.reduce((acc, c) => acc + c.sent, 0),
    totalFailed: campaigns.reduce((acc, c) => acc + c.failed, 0),
  };

  if (isLoading) {
    return (
      <div className="campaign-manager">
        <div className="loading-state">
          <RefreshCw size={32} className="spin" />
          <p>Loading campaigns...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="campaign-manager">
      <div className="campaign-header">
        <div className="header-left">
          <h2 className="campaign-title">
            <Megaphone size={24} />
            Campaign Manager
          </h2>
          <p className="campaign-subtitle">Create and manage email campaigns</p>
        </div>
        <button
          className="create-campaign-btn"
          onClick={() => setShowCreateModal(true)}
        >
          <Plus size={18} />
          New Campaign
        </button>
      </div>

      {/* Stats Overview */}
      <div className="campaign-stats">
        <div className="stat-card">
          <div className="stat-icon blue">
            <BarChart3 size={20} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.total}</span>
            <span className="stat-label">Total Campaigns</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">
            <Play size={20} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.active}</span>
            <span className="stat-label">Active</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple">
            <Send size={20} />
          </div>
          <div className="stat-info">
            <span className="stat-value">
              {stats.totalSent.toLocaleString()}
            </span>
            <span className="stat-label">Emails Sent</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red">
            <AlertCircle size={20} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.totalFailed}</span>
            <span className="stat-label">Failed</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="campaign-filters">
        {(["all", "active", "draft", "completed"] as const).map((f) => (
          <button
            key={f}
            className={`filter-btn ${filter === f ? "active" : ""}`}
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)} (
            {f === "all"
              ? campaigns.length
              : campaigns.filter((c) => c.status === f).length}
            )
          </button>
        ))}
      </div>

      {/* Campaign List */}
      <div className="campaigns-container">
        {filteredCampaigns.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <Megaphone size={48} />
            </div>
            <h3>No campaigns found</h3>
            <p>Create your first email campaign to get started</p>
            <button
              className="create-btn-secondary"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus size={16} /> Create Campaign
            </button>
          </div>
        ) : (
          filteredCampaigns.map((campaign) => (
            <div key={campaign.id} className="campaign-card">
              <div className="campaign-card-header">
                <div className="campaign-type-badge">
                  {getTypeIcon(campaign.type)}
                  <span>{campaign.type}</span>
                </div>
                <span
                  className={`campaign-status ${getStatusColor(campaign.status)}`}
                >
                  {campaign.status === "active" && (
                    <RefreshCw size={12} className="spin" />
                  )}
                  {campaign.status === "paused" && <Pause size={12} />}
                  {campaign.status === "completed" && (
                    <CheckCircle2 size={12} />
                  )}
                  {campaign.status === "draft" && <Clock size={12} />}
                  {campaign.status}
                </span>
              </div>

              <h3 className="campaign-name">{campaign.name}</h3>
              <p className="campaign-description">{campaign.description}</p>
              <p className="campaign-subject">
                <Mail size={14} /> Subject: {campaign.subject}
              </p>

              <div className="campaign-metrics">
                <div className="metric">
                  <Users size={14} />
                  <span>{campaign.recipients.length} recipients</span>
                </div>
                <div className="metric">
                  <Mail size={14} />
                  <span>{campaign.sent} sent</span>
                </div>
                <div className="metric success">
                  <CheckCircle2 size={14} />
                  <span>
                    {
                      campaign.recipients.filter((r) => r.status === "sent")
                        .length
                    }{" "}
                    delivered
                  </span>
                </div>
                <div className="metric error">
                  <XCircle size={14} />
                  <span>{campaign.failed} failed</span>
                </div>
              </div>

              {/* Progress bar for active campaigns */}
              {campaign.recipients.length > 0 && (
                <div className="campaign-progress">
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${((campaign.sent + campaign.failed) / campaign.recipients.length) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="progress-text">
                    {campaign.sent + campaign.failed} /{" "}
                    {campaign.recipients.length} processed
                  </span>
                </div>
              )}

              <div className="campaign-footer">
                <div className="campaign-date">
                  <Calendar size={14} />
                  <span>
                    Created:{" "}
                    {new Date(campaign.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="campaign-actions">
                  {/* Upload CSV button for drafts */}
                  {campaign.status === "draft" && (
                    <label
                      className="action-btn upload"
                      title="Upload Recipients CSV"
                    >
                      <input
                        type="file"
                        accept=".csv"
                        style={{ display: "none" }}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(campaign.id, file);
                        }}
                        disabled={uploadingCampaign === campaign.id}
                      />
                      {uploadingCampaign === campaign.id ? (
                        <RefreshCw size={16} className="spin" />
                      ) : (
                        <Upload size={16} />
                      )}
                    </label>
                  )}

                  {/* View Logs */}
                  <button
                    className="action-btn logs"
                    onClick={() => setShowLogsModal(campaign.id)}
                    title="View Logs"
                  >
                    <FileText size={16} />
                  </button>

                  {/* Start/Pause */}
                  {campaign.status !== "completed" &&
                    campaign.recipients.length > 0 && (
                      <button
                        className={`action-btn ${campaign.status === "active" ? "pause" : "play"}`}
                        onClick={() =>
                          campaign.status === "active"
                            ? pauseCampaign(campaign.id)
                            : startCampaign(campaign.id)
                        }
                        title={campaign.status === "active" ? "Pause" : "Start"}
                      >
                        {campaign.status === "active" ? (
                          <Pause size={16} />
                        ) : (
                          <Play size={16} />
                        )}
                      </button>
                    )}

                  <button
                    className="action-btn delete"
                    onClick={() => deleteCampaign(campaign.id)}
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowCreateModal(false)}
        >
          <div className="create-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <Plus size={20} /> Create New Campaign
              </h3>
              <button
                className="close-btn"
                onClick={() => setShowCreateModal(false)}
              >
                <XCircle size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label>Campaign Name *</label>
                <input
                  type="text"
                  placeholder="e.g., Summer Sale Announcement"
                  value={newCampaign.name}
                  onChange={(e) =>
                    setNewCampaign({ ...newCampaign, name: e.target.value })
                  }
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <input
                  type="text"
                  placeholder="Brief description..."
                  value={newCampaign.description}
                  onChange={(e) =>
                    setNewCampaign({
                      ...newCampaign,
                      description: e.target.value,
                    })
                  }
                />
              </div>

              <div className="form-group">
                <label>Email Subject *</label>
                <input
                  type="text"
                  placeholder="e.g., 🎉 Special Offer Just For You!"
                  value={newCampaign.subject}
                  onChange={(e) =>
                    setNewCampaign({ ...newCampaign, subject: e.target.value })
                  }
                />
              </div>

              <div className="form-group">
                <label>Email Template</label>
                <p className="form-hint">
                  Use {"{{name}}"} and {"{{email}}"} for personalization
                </p>
                <textarea
                  placeholder="Hi {{name}},&#10;&#10;Your email content here...&#10;&#10;Best regards,&#10;Your Name"
                  value={newCampaign.template}
                  onChange={(e) =>
                    setNewCampaign({ ...newCampaign, template: e.target.value })
                  }
                  rows={6}
                />
              </div>

              <div className="form-group">
                <label>Tone</label>
                <div className="type-selector">
                  {(
                    ["professional", "friendly", "urgent", "casual"] as const
                  ).map((tone) => (
                    <button
                      key={tone}
                      className={`type-btn ${newCampaign.tone === tone ? "active" : ""}`}
                      onClick={() => setNewCampaign({ ...newCampaign, tone })}
                    >
                      {tone}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="cancel-btn"
                onClick={() => setShowCreateModal(false)}
              >
                Cancel
              </button>
              <button
                className="create-btn"
                onClick={createCampaign}
                disabled={
                  !newCampaign.name.trim() || !newCampaign.subject.trim()
                }
              >
                <Plus size={16} /> Create Campaign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logs Modal */}
      {showLogsModal && (
        <div className="modal-overlay" onClick={() => setShowLogsModal(null)}>
          <div className="logs-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <FileText size={20} /> Campaign Logs
              </h3>
              <button
                className="close-btn"
                onClick={() => setShowLogsModal(null)}
              >
                <XCircle size={20} />
              </button>
            </div>
            <div className="logs-content">
              {campaigns.find((c) => c.id === showLogsModal)?.logs.length ===
              0 ? (
                <p className="no-logs">No logs yet</p>
              ) : (
                campaigns
                  .find((c) => c.id === showLogsModal)
                  ?.logs.map((log, i) => (
                    <div key={i} className="log-entry">
                      <span className="log-time">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                      <span className="log-message">{log.message}</span>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CampaignManager;
