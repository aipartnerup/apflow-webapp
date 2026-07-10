# APFlow WebApp

<p align="center">
  <img src="public/logo.svg" alt="apflow Logo" width="128" height="128" />
</p>

A modern web application for managing and executing tasks with apflow v2, built with Next.js and Mantine.

## Features

- 🎨 **Modern UI**: Built with Mantine UI components with collapsible sidebar navigation
- 🌍 **Internationalization**: Support for multiple languages (English, Chinese)
- 📊 **Dashboard**: Real-time task statistics and monitoring
- 📋 **Task Management**: Create, view, update, and delete tasks
- 🌳 **Task Tree View**: Visualize task dependencies and hierarchy
- 🕐 **Scheduler**: Schedule tasks with cron, interval, daily, weekly, monthly, and one-time expressions
- ⚡ **Real-time Updates**: Auto-refresh for running tasks
- 🔐 **Authentication**: JWT token and automatic cookie-based authentication
- 🤖 **LLM Integration**: Configure LLM API keys for AI-powered task execution
- 🎯 **Type-safe**: Full TypeScript support

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **UI Library**: Mantine 8
- **Data Fetching**: TanStack Query (React Query)
- **Internationalization**: i18next
- **HTTP Client**: Axios
- **Icons**: Tabler Icons

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 9+ or npm 9+
- apflow >= 0.22.1 REST API server running (default: http://localhost:8080)

### Installation

1. Clone the repository and navigate to the project:

```bash
cd apflow-webapp
```

2. Install dependencies:

```bash
pnpm install
```

3. Start apflow v2 REST API server:

```bash
apflow rest --host 127.0.0.1 --port 8080 --cors http://localhost:3000,http://127.0.0.1:3000
```

This webapp targets the apflow v2 REST module API introduced in `apflow>=0.22.1`.
Older v1/JSON-RPC-only servers are not supported by the current client.

4. Create `.env` file (optional):

```bash
cp .env.example .env
```

Edit `.env` and configure your settings:

```bash
# API URL
NEXT_PUBLIC_API_URL=http://localhost:8080

# Control visibility of authentication settings
# true: Show auth token input field (developer mode, default)
# false: Hide auth token input field (user mode)
NEXT_PUBLIC_SHOW_AUTH_SETTINGS=true

# Auto-login endpoint path (optional)
# If set, enables automatic cookie-based authentication
# Example: /auth/auto-login (for apflow-demo)
# Leave empty or unset to disable auto-login
NEXT_PUBLIC_AUTO_LOGIN_PATH=
```

**Note**: `NEXT_PUBLIC_*` environment variables are embedded at build time. You need to set them:
- **Before `pnpm dev.env`**: For development mode (reads from `.env`)
- **Before `pnpm build.env`**: For production builds (reads from `.env`)

**Available Scripts**:
- `pnpm dev` - Start development server (uses Next.js default env loading)
- `pnpm dev.env` - Start development server with `.env` file (requires `dotenv-cli`)
- `pnpm build` - Build for production (uses Next.js default env loading)
- `pnpm build.env` - Build for production with `.env` file (requires `dotenv-cli`)
- `pnpm start` - Start production server (uses Next.js default env loading)
- `pnpm start.env` - Start production server with `.env` file (requires `dotenv-cli`)

The `.env` scripts use `dotenv-cli` (already included in devDependencies) to load environment variables from `.env` file.

5. Run the development server:

```bash
pnpm dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
apflow-webapp/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Dashboard
│   ├── tasks/              # Task management pages
│   │   ├── page.tsx        # Task list
│   │   ├── create/         # Create task
│   │   ├── running/        # Running tasks
│   │   └── [id]/           # Task detail
│   ├── scheduler/          # Scheduler page
│   │   └── page.tsx        # Scheduled tasks management
│   └── settings/           # Settings pages
│       ├── page.tsx        # API settings
│       └── llm/            # LLM key settings
│           └── page.tsx
├── components/             # React components
│   ├── layout/             # Layout components
│   │   ├── AppShell.tsx    # Main layout wrapper
│   │   └── Navbar.tsx      # Collapsible sidebar navigation
│   └── tasks/              # Task-related components
│       └── TaskTreeView.tsx # Task tree visualization
├── lib/                    # Utilities and configurations
│   ├── api/                # API client
│   │   └── apflow.ts
│   ├── hooks/             # Custom React hooks
│   ├── i18n/              # Internationalization
│   │   ├── config.ts
│   │   ├── provider.tsx
│   │   └── locales/       # Translation files
│   └── providers/         # React context providers
│       └── QueryProvider.tsx
└── public/                # Static assets
    └── logo.svg           # Brand logo (starfish)
```

## Features Overview

### Dashboard

- View running tasks count
- Monitor task statistics
- Quick access to recent tasks

### Task Management

- **Task List**: Browse all tasks with search and filtering
- **Create Task**: Form to create new tasks with executor configuration
- **Task Detail**: View detailed task information, tree structure, inputs, and results
- **Running Tasks**: Monitor currently executing tasks with real-time progress

### Scheduler

- View all scheduled tasks with status, type, expression, and run count
- Filter by schedule type (once, interval, cron, daily, weekly, monthly) and task status (pending, in_progress, completed, failed, cancelled)
- Toggle schedules on/off, trigger immediate execution, and configure schedule parameters
- Add schedules to existing tasks or remove them
- Export schedules as iCal (.ics) files

### Settings

- **API Settings**: Configure API base URL and authentication
  - **Developer Mode**: Show token input field (default)
  - **Auto Login Mode**: Automatic cookie-based authentication (demo servers)
  - **User Mode**: Hide token settings, show contact admin message
- **LLM Settings**: Manage LLM API keys for AI-powered task execution (supports header-based and server-side storage)

## API Integration

The application uses the apflow v2 REST module API to communicate with the apflow API server. It calls module endpoints such as `/modules/apflow.task.create`, `/modules/apflow.task.get`, and `/modules/apflow.schedule.set`.

The client requires `apflow>=0.22.1`. That version includes the REST module behavior and JSON-safe datetime serialization needed by the task detail and scheduler pages.

All API methods are available through the `apiClient` instance:

```typescript
import { apiClient } from '@/lib/api/apflow';

// Create tasks
await apiClient.createTasks([...]);

// Get task
await apiClient.getTask(taskId);

// Get task tree
await apiClient.getTaskTree(taskId);

// Cancel tasks
await apiClient.cancelTasks([taskId1, taskId2]);
```

## LLM API Keys

The LLM settings page supports two storage modes:

- **Method 1: Request Header** stores the key in the browser and sends it with each request as `X-LLM-API-KEY`. This is the recommended mode for standard `apflow>=0.22.1` servers.
- **Method 2: User Config** stores the key through server-side LLM key modules. If the connected apflow server does not expose those modules, the UI shows an unavailable notice and disables server-side controls.

Environment variables such as `OPENAI_API_KEY` are still read by apflow/LiteLLM on the server side.

## Authentication

The webapp supports two authentication modes for compatibility with different server types:

### Standard Server Authentication (JWT Token Required)

For standard `apflow` servers:
- **JWT token is required**: Set the authentication token in Settings page
- Token is stored in `localStorage` as `auth_token`
- Token is sent in `Authorization: Bearer <token>` header with every request
- This is the default behavior and maintains backward compatibility

### Demo Server Authentication (Automatic Cookie-Based)

For `apflow-demo` servers:
- **JWT token is optional**: Demo servers automatically generate tokens via cookies
- If no token is set, the browser automatically sends cookies (`authorization`)
- Demo server middleware extracts the token from cookies and adds it to the Authorization header
- If a manual token is provided, it will override the auto-generated token

### Implementation Details

The webapp uses the following authentication strategy:

1. **Cookie Support**: Cookie credentials are enabled only when `NEXT_PUBLIC_AUTO_LOGIN_PATH` is configured
2. **Conditional Authorization Header**: Authorization header is only added if `auth_token` exists in localStorage
3. **Backward Compatible**: Standard servers continue to work as before (token required)
4. **Demo Compatible**: Demo servers work automatically without manual token configuration

### For Developers Building Custom Clients

If you're building a custom client based on this webapp:

**Standard Server Integration:**
```typescript
// Always send Authorization header with token
const token = localStorage.getItem('auth_token');
if (token) {
  headers.Authorization = `Bearer ${token}`;
}
```

**Demo Server Integration:**
```typescript
// Enable cookies for automatic authentication
const client = axios.create({
  baseURL: apiUrl,
  withCredentials: true, // Required only for cookie-based auth
});

// Only add Authorization header if manual token exists
// Demo server will handle authentication via cookies automatically
const token = localStorage.getItem('auth_token');
if (token) {
  headers.Authorization = `Bearer ${token}`;
}
```

**Unified Approach (Recommended):**
```typescript
// Works for both standard and demo servers
const client = axios.create({
  baseURL: apiUrl,
  withCredentials: Boolean(process.env.NEXT_PUBLIC_AUTO_LOGIN_PATH),
});

// Only send Authorization header if token exists
// This allows demo servers to use cookie-based auth automatically
const token = localStorage.getItem('auth_token');
if (token) {
  headers.Authorization = `Bearer ${token}`;
}
```

### Compatibility

- Supported backend: `apflow>=0.22.1`
- Default API URL: `http://localhost:8080`
- Protocol: apflow v2 REST module endpoints under `/modules/{module_id}`
- Auto-login/cookie mode is optional and only enabled when `NEXT_PUBLIC_AUTO_LOGIN_PATH` is set
- Standard servers continue to work with manual JWT tokens when authentication is enabled server-side

## Configuration

### Environment Variables

The webapp behavior can be controlled via environment variables:

#### `NEXT_PUBLIC_SHOW_AUTH_SETTINGS`

Control visibility of authentication settings in the UI.

- **`true`** (default): Show authentication token input field (developer mode)
- **`false`**: Hide authentication token input field (user mode)

#### `NEXT_PUBLIC_AUTO_LOGIN_PATH`

Configure the auto-login endpoint path for automatic cookie-based authentication.

- **Unset or empty** (default): Disable auto-login, require manual token configuration (standard mode)
- **Set to path** (e.g., `/auth/auto-login`): Enable auto-login via cookies (demo mode)

When set, the webapp will:
- Hide token input field
- Display "Auto Login Enabled" message
- Automatically use cookie-based authentication
- Work seamlessly with `apflow-demo` servers (which provide `/auth/auto-login` endpoint)

**Example values:**
- `/auth/auto-login` - Standard demo server endpoint
- `/api/auth/auto-login` - Custom endpoint path
- Empty or unset - Disable auto-login

### Deployment Scenarios

#### Standard apflow (Developer Mode)

For standard `apflow` deployments where developers need to configure tokens:

**Configuration** (create `.env` file):

```bash
NEXT_PUBLIC_SHOW_AUTH_SETTINGS=true
# NEXT_PUBLIC_AUTO_LOGIN_PATH=  # Leave empty or unset
```

**Usage**:
```bash
pnpm dev.env    # Development with .env file
pnpm build.env  # Production build with .env file
```

**Behavior:**
- Shows API URL configuration
- Shows authentication token input field
- Developers can manually configure JWT tokens

#### apflow-demo (Auto Login)

For `apflow-demo` deployments with automatic authentication:

**Configuration** (create `.env` file):

```bash
NEXT_PUBLIC_SHOW_AUTH_SETTINGS=false
NEXT_PUBLIC_AUTO_LOGIN_PATH=/auth/auto-login
```

**Usage**:
```bash
pnpm dev.env    # Development with .env file
pnpm build.env  # Production build with .env file
```

**Behavior:**
- Shows API URL configuration
- Hides token input field
- Displays "Auto Login Enabled" message
- Users don't need to configure anything - authentication works automatically via cookies

#### Enterprise Deployment (User Mode)

For enterprise deployments where authentication is managed centrally:

**Configuration** (create `.env` file):

```bash
NEXT_PUBLIC_SHOW_AUTH_SETTINGS=false
# NEXT_PUBLIC_AUTO_LOGIN_PATH=  # Leave empty or unset
```

**Usage**:
```bash
pnpm build.env  # Production build with .env file
pnpm start.env  # Production server with .env file
```

**Behavior:**
- Shows API URL configuration
- Hides token input field
- Displays "Please contact your administrator" message
- Authentication configured by administrators

**Important**: 
- Create `.env` file based on your needs (copy from `.env.example`)
- Use `pnpm dev.env`, `pnpm build.env`, or `pnpm start.env` to load from `.env` file
- `dotenv-cli` is already included in devDependencies, no additional installation needed
- For production deployments, set these environment variables **before running `pnpm build.env`**, as `NEXT_PUBLIC_*` variables are embedded at build time

## Internationalization

The application supports multiple languages. Currently available:

- English (en)
- Chinese (zh)

To add a new language:

1. Create a new JSON file in `lib/i18n/locales/`
2. Add the translation keys
3. Import and add to `lib/i18n/config.ts`

## Development

### Available Scripts

- `pnpm dev` - Start development server (uses Next.js default env loading)
- `pnpm dev.env` - Start development server with `.env` file (uses `dotenv-cli`)
- `pnpm build` - Build for production (uses Next.js default env loading)
- `pnpm build.env` - Build for production with `.env` file (uses `dotenv-cli`)
- `pnpm start` - Start production server (uses Next.js default env loading)
- `pnpm start.env` - Start production server with `.env` file (uses `dotenv-cli`)
- `pnpm lint` - Run ESLint
- `pnpm test` - Run Node.js API client tests

### Code Style

- TypeScript for type safety
- ESLint for code quality
- Mantine components for UI consistency

## Customization

### Adding New Pages

1. Create a new file in `app/` directory
2. Use the `AppShell` layout (already included in root layout)
3. Add navigation item in `components/layout/Navbar.tsx`

### Extending API Client

Edit `lib/api/apflow.ts` to add new API methods.

### Customizing Theme

Mantine theme can be customized in `app/layout.tsx`:

```typescript
<MantineProvider theme={{ /* your theme config */ }}>
```

## Contributing

This is an open-source project. Contributions are welcome!

## License

Apache-2.0
