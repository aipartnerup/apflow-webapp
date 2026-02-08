/**
 * AIPartnerUpFlow API Client
 * 
 * This client handles all communication with the apflow API server
 * using JSON-RPC 2.0 protocol with SSE streaming for task execution.
 */

import axios, { AxiosInstance } from 'axios';

export interface JsonRpcRequest {
  jsonrpc: '2.0';
  method: string;
  params?: any;
  id: string | number;
}

export interface JsonRpcResponse<T = any> {
  jsonrpc: '2.0';
  result?: T;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
  id: string | number;
}

export interface Task {
  id: string;
  name: string;
  user_id?: string;
  parent_id?: string;
  priority?: number;
  dependencies?: Array<{ id: string; required: boolean }>;
  inputs?: Record<string, any>;
  schemas?: Record<string, any>;
  params?: Record<string, any>;
  status?: string;
  progress?: number;
  result?: any;
  error?: string;
  created_at?: string;
  updated_at?: string;
  started_at?: string;
  completed_at?: string;
  children?: Task[];
  original_task_id?: string;
  has_copy?: boolean;
  has_children?: boolean;
  // Schedule fields
  schedule_type?: string;
  schedule_expression?: string;
  schedule_enabled?: boolean;
  schedule_start_at?: string;
  schedule_end_at?: string;
  next_run_at?: string;
  last_run_at?: string;
  max_runs?: number;
  run_count?: number;
}

export interface ScheduledTask extends Task {
  schedule_type: string;
  schedule_expression: string;
  schedule_enabled: boolean;
}

export interface WebhookTriggerResponse {
  success: boolean;
  task_id: string;
  execution_id?: string;
  message?: string;
}

export interface TaskTree extends Task {
  children: Task[];
}

export interface CreateTaskResponse {
  status: string;
  root_task_id: string;
  progress: number;
  task_count: number;
}

export interface GenerateTaskResponse {
  tasks: Task[];
  count: number;
  message: string;
  quota_info?: {
    total_used?: number;
    total_limit?: number | null;
    llm_used?: number;
    llm_limit?: number | null;
  };
}

export interface RunningTask {
  id: string;
  name: string;
  status: string;
  progress: number;
}

export interface RunningTaskStatus {
  task_id: string;
  status: string;
  message?: string;
}

export interface SystemHealth {
  status: string;
  version: string;
  uptime: number;
}

export interface TaskExecutionResponse {
  success: boolean;
  root_task_id: string;
  task_id: string;
  status: string;
  message: string;
  streaming?: boolean;
  events_url?: string;
}

export interface TaskEvent {
  type: string;
  task_id?: string;
  status?: string;
  progress?: number;
  result?: any;
  error?: string;
  final?: boolean;
  [key: string]: any;
}

export class AIPartnerUpFlowClient {
  private client: AxiosInstance;
  private requestId = 0;
  private baseURL: string;

  constructor(baseURL: string = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000') {
    this.baseURL = baseURL;
    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
      // Enable credentials (cookies) for cross-origin requests
      // This allows demo server's cookie-based authentication to work automatically
      withCredentials: true,
      // Add timeout to prevent hanging requests
      timeout: 30000, // 30 seconds
    });

    // Add request interceptor for authentication and LLM key
    // Only add Authorization header if token exists in localStorage
    // If no token, let browser cookies work automatically (demo middleware will add Authorization header)
    this.client.interceptors.request.use((config) => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      // If no token, don't add Authorization header - let demo server's cookie middleware handle it
      
      // Add LLM API key from localStorage if available (request header method)
      // Format: provider:key (e.g., "openai:sk-xxx...") or just key (backward compatible)
      // Support provider-specific keys: llm_api_key_<provider> or default llm_api_key
      // Note: If X-LLM-API-KEY is already set (e.g., by executeTask), use it directly
      if (typeof window !== 'undefined' && !config.headers['X-LLM-API-KEY']) {
        // Get default key from localStorage
        const llmKey = localStorage.getItem('llm_api_key');
        if (llmKey) {
          config.headers['X-LLM-API-KEY'] = llmKey;
        }
      }
      
      return config;
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        // Enhanced error logging with better error object handling
        const errorCode = error?.code || error?.errno || '';
        const errorMessage = error?.message || String(error) || 'Unknown error';
        const requestUrl = error?.config?.url || 'unknown';
        const fullUrl = error?.config?.baseURL 
          ? `${error.config.baseURL}${requestUrl}` 
          : `${this.baseURL}${requestUrl}`;

        // Use console.group for better organization
        if (errorCode === 'ECONNABORTED' || errorMessage.includes('timeout')) {
          console.group('⏱️ API Request Timeout');
          console.error('URL:', fullUrl);
          console.error('Base URL:', this.baseURL);
          console.error('Error Code:', errorCode);
          console.error('Error Message:', errorMessage);
          console.error('Message: Request timed out after 30 seconds');
          console.groupEnd();
        } else if (errorCode === 'ERR_NETWORK' || errorMessage === 'Network Error' || errorMessage.includes('Network Error')) {
          console.group('🌐 API Network Error');
          console.error('Full URL:', fullUrl);
          console.error('Base URL:', this.baseURL);
          console.error('Endpoint:', requestUrl);
          console.error('Error Code:', errorCode);
          console.error('Error Message:', errorMessage);
          console.error('Error Name:', error?.name || 'N/A');
          console.error('--- Troubleshooting Steps ---');
          console.error('1. Is the API server running?');
          console.error(`2. Is the API URL correct? (${this.baseURL})`);
          console.error('3. Are there CORS issues?');
          console.error('4. Is the network connection working?');
          console.error('5. Check browser console for CORS errors');
          console.error('--- Error Details ---');
          console.error('Error Object:', error);
          if (error?.stack) {
            console.error('Stack Trace (first 5 lines):');
            console.error(error.stack.split('\n').slice(0, 5).join('\n'));
          }
          console.groupEnd();
        } else if (error?.response) {
          // Server responded with error status
          const status = error.response.status;
          const method = error?.config?.method?.toUpperCase() || 'UNKNOWN';
          
          // Check if this is a JSON-RPC error response (has error field)
          // If so, we'll handle it in the RPC error handling section below
          const isRpcError = error.response.data?.error && error.response.data?.jsonrpc === '2.0';
          
          if (!isRpcError) {
            // Only log non-RPC errors to console
            console.group('❌ API Error Response');
            console.error('Status:', status);
            console.error('Status Text:', error.response.statusText);
            console.error('Method:', method);
            console.error('URL:', fullUrl);
            console.error('Response Data:', error.response.data);
          }
          
          // Special handling for 401 errors (only for non-RPC errors)
          if (!isRpcError && status === 401) {
            console.error('--- Authentication Error ---');
            if (method === 'OPTIONS') {
              console.error('⚠️ CORS Preflight Request Failed!');
              console.error('The server is rejecting OPTIONS (CORS preflight) requests with 401.');
              console.error('This is a server configuration issue. The server should allow OPTIONS requests without authentication.');
              console.error('Solution: Configure the server to allow OPTIONS requests without requiring authentication.');
            } else {
              console.error('Authentication failed. Possible causes:');
              console.error('1. Missing or invalid Authorization token');
              console.error('2. Missing or invalid authentication cookie');
              console.error('3. Token expired');
              console.error('4. Server authentication middleware misconfigured');
              const hasToken = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
              console.error('Token in localStorage:', hasToken ? 'Present' : 'Missing');
            }
          }
          
          // Special handling for CORS errors (status 0 or no response)
          if (!isRpcError && (status === 0 || !error.response)) {
            console.error('--- Possible CORS Issue ---');
            console.error('This might be a CORS (Cross-Origin Resource Sharing) problem.');
            console.error('The server may not be configured to allow requests from this origin.');
          }
          
          if (!isRpcError) {
            console.groupEnd();
          }
        } else {
          // Other errors
          console.group('⚠️ API Error (Other)');
          console.error('Error Code:', errorCode);
          console.error('Error Message:', errorMessage);
          console.error('Error Name:', error?.name || 'N/A');
          console.error('URL:', fullUrl);
          console.error('Error Object:', error);
          console.groupEnd();
        }
        return Promise.reject(error);
      }
    );
  }

  private async rpcRequest<T>(endpoint: string, method: string, params?: any): Promise<T> {
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      method,
      params,
      id: ++this.requestId,
    };

    try {
      const response = await this.client.post<JsonRpcResponse<T>>(endpoint, request);
      
      if (response.data.error) {
        // Extract error message, prefer data field if available (contains detailed error)
        const errorMessage = response.data.error.data || response.data.error.message || 'RPC Error';
        const error = new Error(String(errorMessage));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (error as any).code = response.data.error.code;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (error as any).rpcError = response.data.error;
        throw error;
      }
      
      return response.data.result as T;
    } catch (error: any) {
      // Handle network errors with more descriptive messages
      const errorCode = error?.code || error?.errno || '';
      const errorMessage = error?.message || String(error) || 'Unknown error';
      
      if (errorCode === 'ERR_NETWORK' || errorMessage === 'Network Error' || errorMessage.includes('Network Error')) {
        // Provide a more helpful error message
        let detailedMessage = `Unable to connect to API server at ${this.baseURL}${endpoint}.\n\n`;
        detailedMessage += `Possible solutions:\n`;
        detailedMessage += `1. Ensure the API server is running (check if you can access ${this.baseURL} in your browser)\n`;
        detailedMessage += `2. Verify the API URL is correct (current: ${this.baseURL})\n`;
        detailedMessage += `3. Check for CORS issues in the browser console\n`;
        detailedMessage += `4. If using a different port/domain, set NEXT_PUBLIC_API_URL environment variable\n`;
        detailedMessage += `5. Check your network connection and firewall settings`;
        
        const networkError = new Error(detailedMessage);
        (networkError as any).code = errorCode;
        (networkError as any).originalError = error;
        (networkError as any).isNetworkError = true;
        (networkError as any).apiUrl = this.baseURL;
        throw networkError;
      }
      
      // Handle timeout errors
      if (errorCode === 'ECONNABORTED' || errorMessage.includes('timeout')) {
        const timeoutError = new Error(
          `Request timeout: The API server at ${this.baseURL}${endpoint} did not respond within 30 seconds.`
        );
        (timeoutError as any).code = errorCode;
        (timeoutError as any).originalError = error;
        throw timeoutError;
      }
      
      // Handle 401 Unauthorized errors (especially CORS preflight)
      if (error.response?.status === 401) {
        const method = error?.config?.method?.toUpperCase() || '';
        let authErrorMessage = `Authentication failed (401) for ${this.baseURL}${endpoint}`;
        
        if (method === 'OPTIONS') {
          authErrorMessage = `CORS Preflight Failed: The server rejected the OPTIONS request with 401 Unauthorized.\n\n` +
            `This is a server configuration issue. The server must allow OPTIONS (CORS preflight) requests without authentication.\n\n` +
            `Server-side fix needed: Configure CORS middleware to skip authentication for OPTIONS requests.`;
        } else {
          authErrorMessage += `\n\nPossible causes:\n` +
            `- Missing or invalid authentication token\n` +
            `- Missing or invalid authentication cookie\n` +
            `- Token expired\n` +
            `- Server authentication middleware misconfigured`;
        }
        
        const authError = new Error(authErrorMessage);
        (authError as any).status = 401;
        (authError as any).isAuthError = true;
        (authError as any).isCorsPreflight = method === 'OPTIONS';
        (authError as any).originalError = error;
        throw authError;
      }
      
      // Handle RPC errors
      if (error.response?.data?.error) {
        // Extract error message, prefer data field if available (contains detailed error)
        const errorMessage = error.response.data.error.data || error.response.data.error.message || 'RPC Error';
        const rpcError = new Error(String(errorMessage));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (rpcError as any).code = error.response.data.error.code;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (rpcError as any).rpcError = error.response.data.error;
        throw rpcError;
      }
      
      // Re-throw other errors, but wrap them if they don't have a message
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error(`API Error: ${errorMessage}`);
      }
    }
  }


  // Task Management Methods

  /**
   * Generate a task from natural language description using LLM
   */
  async generateTask(description: string): Promise<GenerateTaskResponse> {
    if (!description || description.trim() === '') {
      throw new Error('Description is required');
    }
    return this.rpcRequest<GenerateTaskResponse>('/tasks', 'tasks.generate', { requirement: description.trim() });
  }

  /**
   * Create one or more tasks and execute them
   */
  async createTasks(tasks: Task[] | Task): Promise<CreateTaskResponse> {
    const taskArray = Array.isArray(tasks) ? tasks : [tasks];
    return this.rpcRequest<CreateTaskResponse>('/tasks', 'tasks.create', taskArray);
  }

  /**
   * Get task details by ID
   */
  async getTask(taskId: string): Promise<Task> {
    if (!taskId) {
      throw new Error('Task ID is required');
    }
    return this.rpcRequest<Task>('/tasks', 'tasks.get', { task_id: taskId });
  }

  /**
   * Get task detail (alias for getTask)
   */
  async getTaskDetail(taskId: string): Promise<Task> {
    const response = await this.rpcRequest<{ task: any; children: any[] }>('/tasks', 'tasks.detail', { task_id: taskId });
    function convertNode(node: { task: any; children: any[] }): Task {
      const t: Task = { ...node.task };
      t.children = (node.children || []).map(convertNode);
      return t;
    }
    return convertNode(response);
  }

  /**
   * Get task tree structure starting from a task
   */
  async getTaskTree(taskId?: string, rootId?: string): Promise<TaskTree> {
    const params: any = {};
    if (taskId) params.task_id = taskId;
    if (rootId) params.root_id = rootId;
    const response = await this.rpcRequest<{ task: any; children: any[] }>('/tasks', 'tasks.tree', params);
    function convertNode(node: { task: any; children: any[] }): Task {
      const t: Task = { ...node.task };
      t.children = node.children ? node.children.map(convertNode) : [];
      return t;
    }
    const result = convertNode(response) as TaskTree;
    // console.info('return task tree:', result);
    return result;
  }

  /**
   * Update task properties
   */
  async updateTask(
    taskId: string,
    updates: {
      status?: string;
      inputs?: Record<string, any>;
      result?: any;
      error?: string;
      progress?: number;
      started_at?: string;
      completed_at?: string;
      schedule_type?: string;
      schedule_expression?: string;
      schedule_enabled?: boolean;
      schedule_start_at?: string;
      schedule_end_at?: string;
      max_runs?: number;
    }
  ): Promise<Task> {
    return this.rpcRequest<Task>('/tasks', 'tasks.update', {
      task_id: taskId,
      ...updates,
    });
  }

  /**
   * Delete a task (marks as deleted)
   */
  async deleteTask(taskId: string): Promise<{ success: boolean; task_id: string }> {
    return this.rpcRequest<{ success: boolean; task_id: string }>('/tasks', 'tasks.delete', {
      task_id: taskId,
    });
  }

  /**
   * Create a copy of a task tree for re-execution
   */
  async copyTask(taskId: string): Promise<Task> {
    return this.rpcRequest<Task>('/tasks', 'tasks.copy', { task_id: taskId });
  }

  /**
   * Detect LLM provider from task configuration
   */
  private detectProviderFromTask(task: Task): string | undefined {
    // Check params.works.agents for LLM model
    const works = task.params?.works;
    if (works?.agents) {
      for (const agentConfig of Object.values(works.agents)) {
        const agent = agentConfig as any;
        const llm = agent?.llm;
        if (typeof llm === 'string') {
          return this.detectProviderFromModel(llm);
        }
      }
    }
    
    // Check crew-level LLM
    if (works?.llm && typeof works.llm === 'string') {
      return this.detectProviderFromModel(works.llm);
    }
    
    return undefined;
  }

  /**
   * Detect provider from model name
   */
  private detectProviderFromModel(modelName: string): string | undefined {
    if (!modelName) return undefined;
    
    const modelLower = modelName.toLowerCase();
    
    // Check if model name contains provider prefix (e.g., "openai/gpt-4")
    if (modelLower.includes('/')) {
      const provider = modelLower.split('/')[0];
      if (['openai', 'anthropic', 'google', 'gemini', 'azure', 'cohere', 'mistral', 'groq', 'together', 'ai21', 'replicate', 'ollama', 'deepinfra'].includes(provider)) {
        return provider;
      }
    }
    
    // Check model name patterns
    if (modelLower.includes('gpt-') || modelLower.includes('gpt')) return 'openai';
    if (modelLower.includes('claude')) return 'anthropic';
    if (modelLower.includes('gemini') || modelLower.includes('palm')) return 'google';
    if (modelLower.includes('command')) return 'cohere';
    if (modelLower.includes('mistral') || modelLower.includes('mixtral')) return 'mistral';
    if (modelLower.includes('llama')) return 'groq'; // Common with Groq
    if (modelLower.includes('j2-')) return 'ai21';
    if (modelLower.includes('togethercomputer')) return 'together';
    if (modelLower.includes('replicate')) return 'replicate';
    if (modelLower.includes('ollama')) return 'ollama';
    if (modelLower.includes('deepinfra')) return 'deepinfra';
    
    return undefined;
  }

  /**
   * Execute a task by ID using JSON-RPC tasks.execute endpoint
   * 
   * @param taskId Task ID to execute
   * @param useStreaming If true, enables SSE streaming for real-time updates (default: true)
   * @param onEvent Optional callback for SSE events when useStreaming is true
   * @param useDemo If true, uses demo mode (returns pre-computed demo data instead of actual execution)
   * @returns Execution response with root_task_id. If useStreaming=true, returns initial response and streams events via onEvent
   */
  async executeTask(
    taskId: string,
    useStreaming = true,
    onEvent?: (event: TaskEvent) => void,
    useDemo?: boolean
  ): Promise<TaskExecutionResponse> {
    // First, get task details to detect provider for LLM key
    let provider: string | undefined;
    try {
      const task = await this.getTask(taskId);
      provider = this.detectProviderFromTask(task);
    } catch (error) {
      // If we can't get task details, continue without provider detection
      console.debug('Could not get task details for provider detection:', error);
    }
    
    // Make request with LLM key formatted as provider:key if provider is detected
    const requestParams: any = {
      task_id: taskId,
      use_streaming: useStreaming,
    };
    if (useDemo !== undefined) {
      requestParams.use_demo = useDemo;
    }
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      method: 'tasks.execute',
      params: requestParams,
      id: ++this.requestId,
    };
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    // Get LLM key and format as provider:key if provider is detected
    if (typeof window !== 'undefined') {
      let llmKey: string | null = null;
      
      if (provider) {
        // Use provider-specific key
        llmKey = localStorage.getItem(`llm_api_key_${provider}`);
      }
      
      // Fallback to default key if provider-specific key not found
      if (!llmKey) {
        llmKey = localStorage.getItem('llm_api_key');
      }
      
      if (llmKey) {
        // Format: provider:key or just key (backward compatible)
        if (provider) {
          headers['X-LLM-API-KEY'] = `${provider}:${llmKey}`;
        } else {
          headers['X-LLM-API-KEY'] = llmKey;
        }
      }
    }
    
    // If streaming is enabled, use EventSource for SSE
    if (useStreaming && onEvent && typeof window !== 'undefined' && typeof EventSource !== 'undefined') {
      // For SSE, we need to use fetch with stream handling
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      const authHeaders: Record<string, string> = {};
      if (token) {
        authHeaders['Authorization'] = `Bearer ${token}`;
      }
      
      // Merge headers
      const allHeaders = { ...headers, ...authHeaders };
      
      // Use fetch for SSE streaming
      // Include credentials to send cookies (needed for demo server's cookie-based auth)
      const response = await fetch(`${this.baseURL}/tasks`, {
        method: 'POST',
        headers: allHeaders,
        body: JSON.stringify(request),
        credentials: 'include', // Send cookies for cross-origin requests
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
        throw new Error(errorData.error?.message || 'Unknown error');
      }
      
      // Check if response is SSE (text/event-stream)
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('text/event-stream')) {
        // Handle SSE stream
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        
        if (!reader) {
          throw new Error('Response body is not readable');
        }
        
        // Read initial response
        let initialResponse: TaskExecutionResponse | null = null;
        
        const processStream = async () => {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6); // Remove 'data: ' prefix
                try {
                  const parsed = JSON.parse(data);
                  
                  // Check if it's the initial JSON-RPC response
                  if (parsed.jsonrpc === '2.0' && parsed.result) {
                    initialResponse = parsed.result;
                  } else if (parsed.type) {
                    // It's an event, call the callback
                    onEvent(parsed);
                    
                    // Stop if final event
                    if (parsed.final || parsed.type === 'stream_end') {
                      return initialResponse || {
                        success: true,
                        root_task_id: taskId,
                        task_id: taskId,
                        status: 'started',
                        message: 'Task execution started',
                      };
                    }
                  }
                } catch (e) {
                  console.error('Error parsing SSE data:', e, data);
                }
              }
            }
          }
          
          return initialResponse || {
            success: true,
            root_task_id: taskId,
            task_id: taskId,
            status: 'started',
            message: 'Task execution started',
          };
        };
        
        // Process stream in background and return initial response
        processStream().catch((error) => {
          console.error('Error processing SSE stream:', error);
          if (onEvent) {
            onEvent({
              type: 'error',
              error: error.message || 'Stream processing error',
            });
          }
        });
        
        // Return initial response (will be updated via events)
        return initialResponse || {
          success: true,
          root_task_id: taskId,
          task_id: taskId,
          status: 'started',
          message: 'Task execution started',
        };
      } else {
        // Fallback to JSON response
        const data = await response.json();
        if (data.error) {
          throw new Error(data.error.message || 'Unknown error');
        }
        return data.result || data;
      }
    }
    
    // Non-streaming mode: use regular JSON-RPC
    const response = await this.client.post<JsonRpcResponse<TaskExecutionResponse>>(
      '/tasks',
      request,
      { headers }
    );
    
    if (response.data.error) {
      throw new Error(response.data.error.message || 'Unknown error');
    }
    
    return response.data.result!;
  }

  /**
   * Poll task status for real-time updates
   * 
   * @param taskId Task ID to poll
   * @param onUpdate Callback function called when task status is updated
   * @param interval Polling interval in milliseconds (default: 1000ms)
   * @returns Cleanup function to stop polling
   */
  pollTaskStatus(
    taskId: string,
    onUpdate: (task: Task) => void,
    interval: number = 1000
  ): () => void {
    if (typeof window === 'undefined') {
      console.warn('Polling is not available in this environment');
      return () => {};
    }

    let isPolling = true;
    let pollInterval: NodeJS.Timeout | null = null;

    const poll = async () => {
      if (!isPolling) return;

      try {
        const task = await this.getTask(taskId);
        onUpdate(task);

        // Stop polling if task is completed or failed
        if (task.status === 'completed' || task.status === 'failed' || task.status === 'cancelled') {
          isPolling = false;
          if (pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
          }
        }
      } catch (error) {
        console.error('Error polling task status:', error);
        // Continue polling on error
      }
    };

    // Start polling immediately, then at intervals
    poll();
    pollInterval = setInterval(poll, interval);

    // Return cleanup function
    return () => {
      isPolling = false;
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
    };
  }

  /**
   * Cancel one or more running tasks
   */
  async cancelTasks(taskIds: string[], force = false): Promise<RunningTaskStatus[]> {
    return this.rpcRequest<RunningTaskStatus[]>('/tasks', 'tasks.cancel', {
      task_ids: taskIds,
      force,
    });
  }

  /**
   * List currently running tasks
   */
  async getRunningTasks(userId?: string, limit = 100): Promise<RunningTask[]> {
    return this.rpcRequest<RunningTask[]>('/tasks', 'tasks.running.list', {
      user_id: userId,
      limit,
    });
  }

  /**
   * List all tasks (not just running ones)
   */
  async listTasks(params?: {
    userId?: string;
    status?: string;
    root_only?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<Task[]> {
    return this.rpcRequest<Task[]>('/tasks', 'tasks.list', {
      user_id: params?.userId,
      status: params?.status,
      root_only: params?.root_only ?? true,  // Default to true: only show root tasks
      limit: params?.limit ?? 100,
      offset: params?.offset ?? 0,
    });
  }

  /**
   * Get child tasks for a parent task
   */
  async getTaskChildren(parentId: string): Promise<Task[]> {
    if (!parentId) {
      throw new Error('Parent task ID is required');
    }
    return this.rpcRequest<Task[]>('/tasks', 'tasks.children', { parent_id: parentId });
  }

  /**
   * Get status of one or more running tasks
   */
  async getRunningTaskStatus(taskIds: string[]): Promise<RunningTaskStatus[]> {
    return this.rpcRequest<RunningTaskStatus[]>('/tasks', 'tasks.running.status', {
      task_ids: taskIds,
    });
  }

  /**
   * Get count of running tasks
   */
  async getRunningTaskCount(userId?: string): Promise<{ count: number; user_id?: string }> {
    return this.rpcRequest<{ count: number; user_id?: string }>('/tasks', 'tasks.running.count', {
      user_id: userId,
    });
  }

  // Scheduler Methods

  /**
   * List scheduled tasks
   */
  async getScheduledTasks(params?: {
    enabled_only?: boolean;
    schedule_type?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<ScheduledTask[]> {
    return this.rpcRequest<ScheduledTask[]>('/tasks', 'tasks.scheduled.list', {
      enabled_only: params?.enabled_only ?? true,
      schedule_type: params?.schedule_type,
      status: params?.status,
      limit: params?.limit ?? 100,
      offset: params?.offset ?? 0,
    });
  }

  /**
   * Initialize schedule for a task (calculate next_run_at)
   */
  async initSchedule(taskId: string, fromTime?: string): Promise<Task> {
    return this.rpcRequest<Task>('/tasks', 'tasks.scheduled.init', {
      task_id: taskId,
      from_time: fromTime,
    });
  }

  /**
   * Complete a scheduled run
   */
  async completeScheduledRun(taskId: string, params?: {
    success?: boolean;
    result?: any;
  }): Promise<Task> {
    return this.rpcRequest<Task>('/tasks', 'tasks.scheduled.complete', {
      task_id: taskId,
      ...params,
    });
  }

  /**
   * Export scheduled tasks as iCalendar (.ics) format
   */
  async exportIcal(params?: {
    schedule_type?: string;
    enabled_only?: boolean;
    limit?: number;
    calendar_name?: string;
  }): Promise<{ ical_content: string; task_count: number }> {
    return this.rpcRequest<{ ical_content: string; task_count: number }>('/tasks', 'tasks.scheduled.export-ical', {
      enabled_only: params?.enabled_only ?? true,
      schedule_type: params?.schedule_type,
      limit: params?.limit ?? 100,
      calendar_name: params?.calendar_name,
    });
  }

  /**
   * Trigger a task via webhook
   */
  async triggerWebhook(taskId: string, params?: Record<string, any>): Promise<WebhookTriggerResponse> {
    return this.rpcRequest<WebhookTriggerResponse>('/tasks', 'tasks.webhook.trigger', {
      task_id: taskId,
      ...params,
    });
  }

  // System Methods

  /**
   * Check system health status
   */
  async getHealth(): Promise<SystemHealth> {
    return this.rpcRequest<SystemHealth>('/system', 'system.health', {});
  }

  /**
   * Get agent card (A2A Protocol)
   */
  async getAgentCard(): Promise<any> {
    const response = await this.client.get('/.well-known/agent-card');
    return response.data;
  }

  // LLM Key Configuration Methods (User Config API)

  /**
   * Set LLM API key for current user
   */
  async setLLMKey(
    apiKey: string,
    provider?: string,
    userId?: string
  ): Promise<{ success: boolean; user_id: string; provider: string }> {
    return this.rpcRequest<{ success: boolean; user_id: string; provider: string }>('/system', 'config.llm_key.set', {
      api_key: apiKey,
      provider: provider,
      user_id: userId,
    });
  }

  /**
   * Get LLM key status for current user (does not return the actual key)
   */
  async getLLMKeyStatus(
    provider?: string,
    userId?: string
  ): Promise<{ has_key: boolean; user_id: string; provider?: string; providers: Record<string, string> }> {
    return this.rpcRequest<{ has_key: boolean; user_id: string; provider?: string; providers: Record<string, string> }>(
      '/system',
      'config.llm_key.get',
      {
        provider: provider,
        user_id: userId,
      }
    );
  }

  /**
   * Delete LLM API key for current user
   */
  async deleteLLMKey(
    provider?: string,
    userId?: string
  ): Promise<{ success: boolean; user_id: string; deleted: boolean; provider: string }> {
    return this.rpcRequest<{ success: boolean; user_id: string; deleted: boolean; provider: string }>(
      '/system',
      'config.llm_key.delete',
      {
        provider: provider,
        user_id: userId,
      }
    );
  }

  // Demo Tasks Management Methods

  /**
   * Check demo init status for current user
   * 
   * Checks which executors already have demo tasks for the current user.
   * Returns status information including whether demo init can be performed.
   */
  async checkDemoInitStatus(): Promise<{
    success: boolean;
    can_init: boolean;
    total_executors: number;
    existing_executors: string[];
    missing_executors: string[];
    executor_details: Record<string, any>;
    message: string;
  }> {
    try {
      const response = await this.client.get<{
        success: boolean;
        can_init: boolean;
        total_executors: number;
        existing_executors: string[];
        missing_executors: string[];
        executor_details: Record<string, any>;
        message: string;
      }>('/api/demo/tasks/init-status');
      
      return response.data;
    } catch (error: any) {
      if (error.response?.data) {
        throw new Error(error.response.data.message || error.response.data.error || 'Failed to check demo init status');
      }
      throw error;
    }
  }

  /**
   * Initialize demo tasks for current user
   * 
   * Creates demo tasks for the current user (user_id extracted from JWT/cookie automatically).
   * The created tasks will appear in the normal task list via standard API.
   */
  async initDemoTasks(): Promise<{
    success: boolean;
    created_count: number;
    task_ids: string[];
    message: string;
  }> {
    try {
      const response = await this.client.post<{
        success: boolean;
        created_count: number;
        task_ids: string[];
        message: string;
      }>('/api/demo/tasks/init-executors');
      
      return response.data;
    } catch (error: any) {
      if (error.response?.data) {
        throw new Error(error.response.data.message || error.response.data.error || 'Failed to initialize demo tasks');
      }
      throw error;
    }
  }
}

// Export singleton instance
export const apiClient = new AIPartnerUpFlowClient();

