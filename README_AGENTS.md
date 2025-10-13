# 🤖 AI Workflow Automation - React Frontend

Modern React + TypeScript UI for multi-agent workflow orchestration with real-time updates.

## 🎨 Features

- **Real-Time Agent Monitoring** - Live SSE connection showing agent status
- **Interactive Dashboard** - Visual representation of all agents
- **Live Logs & Events** - Real-time log streaming and event tracking
- **Workflow Control** - Execute and manage email workflows
- **Responsive Design** - Beautiful gradient UI with smooth animations

## 🚀 Quick Start

### 1. Start the Backend (Port 9000)
```bash
cd /home/cis/task-Automation/ai-workflow-agent
python start_backend.py
```

### 2. Start the Frontend (Port 3000)
```bash
cd /home/cis/task-Automation/frontend-react
npm start
```

### 3. Open Browser
```
http://localhost:3000
```

## 📊 Architecture

### Agent System
- **Coordinator Agent** - Orchestrates workflow execution
- **Email Reader Agent** - Fetches and categorizes emails  
- **Summarizer Agent** - Creates daily summaries
- **Integration Agent** - Sends to Notion/Slack

### Communication
- **SSE (Server-Sent Events)** - Real-time updates from backend
- **REST API** - Workflow execution and control
- **Shared Memory** - Inter-agent data exchange

## 🎯 Components

### AgentDashboard
Shows all agents with:
- Status indicators (idle/working/completed/failed)
- Real-time progress bars
- Current task information
- Recent log entries

### LogViewer
Displays:
- Filtered logs by agent
- Real-time event stream
- Timestamp and level indicators

### WorkflowControl
Provides:
- Quick action buttons
- Custom workflow configuration
- Workflow step preview
- Reset functionality

## 🎨 UI Theme

- **Primary**: Purple gradient (#667eea → #764ba2)
- **Background**: Gradient overlay with glassmorphism
- **Cards**: White with smooth shadows
- **Animations**: Pulse effects for active agents

## 📡 API Endpoints

```typescript
GET  /api/v1/agents/status           // Get all agent status
POST /api/v1/agents/execute          // Execute workflow
GET  /api/v1/agents/events/stream    // SSE event stream
POST /api/v1/agents/reset            // Reset all agents
GET  /api/v1/agents/{id}/logs        // Get agent logs
GET  /api/v1/memory                  // Get shared memory
```

## 🔧 Development

### Prerequisites
- Node.js 16+
- Python 3.12+
- Backend running on port 9000

### Install Dependencies
```bash
npm install
```

### Run Development Server
```bash
npm start
```

### Build for Production
```bash
npm run build
```

## 📦 Project Structure

```
frontend-react/
├── src/
│   ├── components/
│   │   ├── AgentDashboard.tsx/css    # Agent grid view
│   │   ├── AgentCard.tsx/css         # Individual agent card
│   │   ├── LogViewer.tsx/css         # Logs and events
│   │   └── WorkflowControl.tsx/css   # Control panel
│   ├── App.tsx                       # Main app component
│   ├── App.css                       # Global styles
│   └── index.tsx                     # Entry point
├── public/
└── package.json
```

## 🎬 Usage

### Execute Email Workflow
1. Click "Quick Email Check" for 5 emails
2. Or configure custom email count
3. Click "Execute Workflow"
4. Watch agents work in real-time!

### Monitor Progress
- Agent cards show live progress bars
- Logs update in real-time
- Events tab shows inter-agent communication

### Reset System
Click "Reset Agents" to clear all state

## 🚀 Next Steps

- [ ] Add more workflow types
- [ ] Implement agent scheduling
- [ ] Add email preview
- [ ] Create workflow templates
- [ ] Add dark mode

## 📝 Notes

- Backend must be running on port 9000
- SSE connection auto-reconnects on failure
- Logs limited to last 10 per agent in cards
- Full logs available in Log Viewer

## 🏆 Built With

- React 19
- TypeScript 4.9
- CSS3 (Grid, Flexbox, Animations)
- Server-Sent Events (SSE)
- FastAPI Backend

---

**Status**: ✅ Production Ready  
**Version**: 1.0.0  
**Last Updated**: October 2025
