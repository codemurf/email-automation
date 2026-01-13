# AI Workflow Automation - Frontend

This is the React frontend for the AI Workflow Automation system. It provides a modern, "Dark Glass" professional interface for managing AI agents, viewing email workflows, and configuring integrations.

## Features

- **Professional Dark Glass UI:** A premium, dark-themed interface with glassmorphism effects.
- **AI Agent Dashboard:** Monitor the status and progress of your AI agents.
- **Email Kanban Board:** Visualize email processing stages (Inbox, Pending, Processing, Sent) in a Kanban view.
- **Workflow Pipeline:** clear visualization of the multi-agent workflow.
- **Real-time Logs:** View live logs and events from the backend system.
- **Integration Management:** Configure Gmail, Notion, and Slack integrations easily.
- **Responsive Design:** Optimized for various screen sizes.

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

### Installation

1.  Navigate to the frontend directory:

    ```bash
    cd frontend-react
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

### Running the Application

1.  Start the development server:
    ```bash
    npm start
    ```
    This will launch the application at `http://localhost:3000`.

### Building for Production

1.  Create a production build:
    ```bash
    npm run build
    ```
    The build artifacts will be stored in the `build/` directory.

## Configuration

The application expects the backend API to be available at `http://localhost:9000/api/v1` by default. You can configure this using environment variables if needed (create a `.env` file based on `.env.example`).

## Project Structure

- `src/components`: Reusable UI components (AgentCard, KanbanBoard, etc.)
- `src/App.tsx`: Main application component and routing logic.
- `src/App.css`: Global styles and CSS variables for the Dark Glass theme.
- `src/index.tsx`: Application entry point.

## Theme System

The application uses a CSS variable-based theme system defined in `App.css`. Key variables include:

- `--glass-bg`: Background color for glass panels.
- `--glass-border`: Border color for glass panels.
- `--accent-primary`: Primary accent color (Blue/Purple gradient).
- `--text-primary`: Primary text color.

## License

[License Information]
