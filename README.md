# AIPartnerUpFlow WebApp

A modern web application for managing and executing tasks with aipartnerupflow, built with Next.js and Mantine.

## Features

- 🎨 **Modern UI**: Built with Mantine UI components
- 🌍 **Internationalization**: Support for multiple languages (English, Chinese)
- 📊 **Dashboard**: Real-time task statistics and monitoring
- 📋 **Task Management**: Create, view, update, and delete tasks
- 🌳 **Task Tree View**: Visualize task dependencies and hierarchy
- ⚡ **Real-time Updates**: Auto-refresh for running tasks
- 🔐 **Authentication**: JWT token support
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
- npm 9+
- AIPartnerUpFlow API server running (default: http://localhost:8000)

### Installation

1. Clone the repository and navigate to the project:

```bash
cd aipartnerupflow-webapp
```

2. Install dependencies:

```bash
npm install
```

3. Create `.env` file (optional):

```bash
cp .env.example .env
```

Edit `.env` and configure your settings:

```bash
# API URL
NEXT_PUBLIC_API_URL=http://localhost:8000

# Control visibility of authentication settings
# true: Show auth token input field (developer mode, default)
# false: Hide auth token input field (user mode)
NEXT_PUBLIC_SHOW_AUTH_SETTINGS=true

# Auto-login endpoint path (optional)
# If set, enables automatic cookie-based authentication
# Example: /auth/auto-login (for aipartnerupflow-demo)
# Leave empty or unset to disable auto-login
NEXT_PUBLIC_AUTO_LOGIN_PATH=
```

**Note**: `NEXT_PUBLIC_*` environment variables are embedded at build time. You need to set them:
- **Before `npm run dev.env`**: For development mode (reads from `.env`)
- **Before `npm run build.env`**: For production builds (reads from `.env`)

**Available Scripts**:
- `npm run dev` - Start development server (uses Next.js default env loading)
- `npm run dev.env` - Start development server with `.env` file (requires `dotenv-cli`)
- `npm run build` - Build for production (uses Next.js default env loading)
- `npm run build.env` - Build for production with `.env` file (requires `dotenv-cli`)
- `npm run start` - Start production server (uses Next.js default env loading)
- `npm run start.env` - Start production server with `.env` file (requires `dotenv-cli`)

The `.env` scripts use `dotenv-cli` (already included in devDependencies) to load environment variables from `.env` file.

4. Run the development server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
aipartnerupflow-webapp/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Dashboard
│   ├── tasks/              # Task management pages
│   │   ├── page.tsx        # Task list
│   │   ├── create/         # Create task
│   │   ├── running/        # Running tasks
│   │   └── [id]/           # Task detail
│   └── settings/           # Settings page
├── components/             # React components
│   ├── layout/             # Layout components
│   │   ├── AppShell.tsx    # Main layout wrapper
│   │   ├── Navbar.tsx      # Sidebar navigation
│   │   └── Header.tsx      # Top header
│   └── tasks/              # Task-related components
│       └── TaskTreeView.tsx # Task tree visualization
├── lib/                    # Utilities and configurations
│   ├── api/                # API client
│   │   └── aipartnerupflow.ts
│   ├── hooks/             # Custom React hooks
│   ├── i18n/              # Internationalization
│   │   ├── config.ts
│   │   ├── provider.tsx
│   │   └── locales/       # Translation files
│   └── providers/         # React context providers
│       └── QueryProvider.tsx
└── public/                # Static assets
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

### Settings

- Configure API base URL
- Authentication configuration (controlled by environment variables):
  - **Developer Mode**: Show token input field (default)
  - **Auto Login Mode**: Automatic cookie-based authentication (demo servers)
  - **User Mode**: Hide token settings, show contact admin message

## API Integration

The application uses JSON-RPC 2.0 protocol to communicate with the aipartnerupflow API server. All API methods are available through the `apiClient` instance:

```typescript
import { apiClient } from '@/lib/api/aipartnerupflow';

// Create tasks
await apiClient.createTasks([...]);

// Get task
await apiClient.getTask(taskId);

// Get task tree
await apiClient.getTaskTree(taskId);

// Cancel tasks
await apiClient.cancelTasks([taskId1, taskId2]);
```

## Authentication

The webapp supports two authentication modes for compatibility with different server types:

### Standard Server Authentication (JWT Token Required)

For standard `aipartnerupflow` servers:
- **JWT token is required**: Set the authentication token in Settings page
- Token is stored in `localStorage` as `auth_token`
- Token is sent in `Authorization: Bearer <token>` header with every request
- This is the default behavior and maintains backward compatibility

### Demo Server Authentication (Automatic Cookie-Based)

For `aipartnerupflow-demo` servers:
- **JWT token is optional**: Demo servers automatically generate tokens via cookies
- If no token is set, the browser automatically sends cookies (`demo_jwt_token`)
- Demo server middleware extracts the token from cookies and adds it to the Authorization header
- If a manual token is provided, it will override the auto-generated token

### Implementation Details

The webapp uses the following authentication strategy:

1. **Cookie Support**: All requests include `withCredentials: true` (axios) and `credentials: 'include'` (fetch) to enable cookie-based authentication
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
  withCredentials: true, // Required for cookie-based auth
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
  withCredentials: true, // Safe to always enable
});

// Only send Authorization header if token exists
// This allows demo servers to use cookie-based auth automatically
const token = localStorage.getItem('auth_token');
if (token) {
  headers.Authorization = `Bearer ${token}`;
}
```

**Note**: The `withCredentials: true` setting is safe to use with standard servers - it simply enables cookie support but doesn't break existing functionality. Standard servers will continue to require manual JWT tokens.

### Backward Compatibility

**All changes are backward compatible:**
- ✅ Standard servers continue to work exactly as before (token required)
- ✅ Existing integrations are not affected
- ✅ `withCredentials: true` is safe for all server types
- ✅ Authorization header behavior unchanged (only sent if token exists)
- ✅ No breaking changes to API client interface

The only new behavior is that demo servers can now work without manual token configuration, which doesn't affect standard server usage.

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
- Work seamlessly with `aipartnerupflow-demo` servers (which provide `/auth/auto-login` endpoint)

**Example values:**
- `/auth/auto-login` - Standard demo server endpoint
- `/api/auth/auto-login` - Custom endpoint path
- Empty or unset - Disable auto-login

### Deployment Scenarios

#### Standard aipartnerupflow (Developer Mode)

For standard `aipartnerupflow` deployments where developers need to configure tokens:

**Configuration** (create `.env` file):

```bash
NEXT_PUBLIC_SHOW_AUTH_SETTINGS=true
# NEXT_PUBLIC_AUTO_LOGIN_PATH=  # Leave empty or unset
```

**Usage**:
```bash
npm run dev.env    # Development with .env file
npm run build.env  # Production build with .env file
```

**Behavior:**
- Shows API URL configuration
- Shows authentication token input field
- Developers can manually configure JWT tokens

#### aipartnerupflow-demo (Auto Login)

For `aipartnerupflow-demo` deployments with automatic authentication:

**Configuration** (create `.env` file):

```bash
NEXT_PUBLIC_SHOW_AUTH_SETTINGS=false
NEXT_PUBLIC_AUTO_LOGIN_PATH=/auth/auto-login
```

**Usage**:
```bash
npm run dev.env    # Development with .env file
npm run build.env  # Production build with .env file
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
npm run build.env  # Production build with .env file
npm run start.env  # Production server with .env file
```

**Behavior:**
- Shows API URL configuration
- Hides token input field
- Displays "Please contact your administrator" message
- Authentication configured by administrators

**Important**: 
- Create `.env` file based on your needs (copy from `.env.example`)
- Use `npm run dev.env`, `npm run build.env`, or `npm run start.env` to load from `.env` file
- `dotenv-cli` is already included in devDependencies, no additional installation needed
- For production deployments, set these environment variables **before running `npm run build.env`**, as `NEXT_PUBLIC_*` variables are embedded at build time

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

- `npm run dev` - Start development server (uses Next.js default env loading)
- `npm run dev.env` - Start development server with `.env` file (uses `dotenv-cli`)
- `npm run build` - Build for production (uses Next.js default env loading)
- `npm run build.env` - Build for production with `.env` file (uses `dotenv-cli`)
- `npm run start` - Start production server (uses Next.js default env loading)
- `npm run start.env` - Start production server with `.env` file (uses `dotenv-cli`)
- `npm run lint` - Run ESLint

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

Edit `lib/api/aipartnerupflow.ts` to add new API methods.

### Customizing Theme

Mantine theme can be customized in `app/layout.tsx`:

```typescript
<MantineProvider theme={{ /* your theme config */ }}>
```

## Contributing

This is an open-source project. Contributions are welcome!

## License

Apache-2.0
