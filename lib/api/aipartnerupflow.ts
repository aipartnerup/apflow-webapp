/**
 * AIPartnerUpFlow API Client
 * 
 * This client handles all communication with the aipartnerupflow API server
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
    });

    // Add request interceptor for authentication and LLM key
    this.client.interceptors.request.use((config) => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      
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
        console.error('API Error:', error);
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
        throw new Error(response.data.error.message || 'RPC Error');
      }
      
      return response.data.result as T;
    } catch (error: any) {
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error.message || 'RPC Error');
      }
      throw error;
    }
  }


  // Task Management Methods

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
    return this.rpcRequest<Task>('/tasks', 'tasks.detail', { task_id: taskId });
  }

  /**
   * Get task tree structure starting from a task
   */
  async getTaskTree(taskId?: string, rootId?: string): Promise<TaskTree> {
    const params: any = {};
    if (taskId) params.task_id = taskId;
    if (rootId) params.root_id = rootId;
    return this.rpcRequest<TaskTree>('/tasks', 'tasks.tree', params);
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
   * @returns Execution response with root_task_id. If useStreaming=true, returns initial response and streams events via onEvent
   */
  async executeTask(
    taskId: string,
    useStreaming = true,
    onEvent?: (event: TaskEvent) => void
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
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      method: 'tasks.execute',
      params: {
        task_id: taskId,
        use_streaming: useStreaming,
      },
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
      const response = await fetch(`${this.baseURL}/tasks`, {
        method: 'POST',
        headers: allHeaders,
        body: JSON.stringify(request),
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

  // Examples Management Methods

  /**
   * Initialize examples data
   */
  async initExamples(force = false): Promise<{ success: boolean; created_count: number; message: string }> {
    return this.rpcRequest<{ success: boolean; created_count: number; message: string }>(
      '/system',
      'examples.init',
      {
        force,
      }
    );
  }

  /**
   * Check examples status
   */
  async getExamplesStatus(): Promise<{
    initialized: boolean;
    available: boolean;
    message: string;
  }> {
    return this.rpcRequest<{ initialized: boolean; available: boolean; message: string }>(
      '/system',
      'examples.status',
      {}
    );
  }
}

// Export singleton instance
export const apiClient = new AIPartnerUpFlowClient();

