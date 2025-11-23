/**
 * AIPartnerUpFlow API Client
 * 
 * This client handles all communication with the aipartnerupflow API server
 * using JSON-RPC 2.0 protocol and A2A Protocol for task execution.
 */

import axios, { AxiosInstance } from 'axios';
// Try to import A2A SDK - adjust imports based on actual SDK API
let A2ASDK: any = null;
try {
  A2ASDK = require('@a2a-js/sdk');
  // Log available exports for debugging
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    console.log('A2A SDK loaded, available exports:', Object.keys(A2ASDK || {}));
  }
} catch (e) {
  console.warn('A2A SDK not available, will use fallback method:', e);
}

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

export class AIPartnerUpFlowClient {
  private client: AxiosInstance;
  private requestId = 0;
  private baseURL: string;
  private a2aClient: any = null; // A2A Client instance (lazy initialized)

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

  /**
   * Initialize A2A client (lazy initialization)
   * Creates A2A client using ClientFactory pattern similar to test_a2a_client.py
   * Falls back to direct HTTP if SDK is not available
   */
  private async getA2AClient(): Promise<any> {
    if (this.a2aClient) {
      return this.a2aClient;
    }

    // If SDK is not available, return null to use direct HTTP approach
    if (!A2ASDK) {
      console.warn('[A2A Client] SDK not available, will use direct HTTP approach');
      return null;
    }

    try {
      console.log('[A2A Client] Initializing A2A client...');
      
      // Create axios instance for A2A client (reuse existing client to inherit interceptors)
      const axiosInstance = this.client;

      // Try to use A2A SDK - check multiple possible export patterns
      let ClientFactory: any = null;
      let ClientConfig: any = null;
      let AgentCard: any = null;

      // Log available exports for debugging
      const availableKeys = A2ASDK ? Object.keys(A2ASDK) : [];
      console.log('[A2A Client] Available SDK exports:', availableKeys);

      // Try different export patterns
      if (A2ASDK.ClientFactory) {
        console.log('[A2A Client] Using direct exports (ClientFactory, ClientConfig, AgentCard)');
        ClientFactory = A2ASDK.ClientFactory;
        ClientConfig = A2ASDK.ClientConfig;
        AgentCard = A2ASDK.AgentCard;
      } else if (A2ASDK.default) {
        console.log('[A2A Client] Using default export');
        ClientFactory = A2ASDK.default.ClientFactory || A2ASDK.default;
        ClientConfig = A2ASDK.default.ClientConfig;
        AgentCard = A2ASDK.default.AgentCard;
      } else if (typeof A2ASDK === 'function') {
        console.log('[A2A Client] SDK is a function');
        // SDK might export a single function
        ClientFactory = A2ASDK;
      }

      // If SDK classes not found, log and return null to use HTTP fallback
      if (!ClientFactory || !ClientConfig) {
        console.warn('[A2A Client] ClientFactory/ClientConfig not found. Available exports:', availableKeys);
        console.warn('[A2A Client] Will use direct HTTP approach instead');
        return null;
      }

      console.log('[A2A Client] Creating ClientConfig...');
      // Create A2A client config
      const config = new ClientConfig({
        streaming: true,
        polling: false,
        // Use axios instance for HTTP client
        httpClient: axiosInstance,
      });

      console.log('[A2A Client] Creating ClientFactory...');
      // Create client factory
      const factory = new ClientFactory(config);

      console.log('[A2A Client] Fetching agent card...');
      // Fetch agent card first (required to create client)
      const cardResponse = await axiosInstance.get('/.well-known/agent-card');
      const cardData = cardResponse.data;
      console.log('[A2A Client] Agent card received:', cardData);
      
      console.log('[A2A Client] Parsing agent card...');
      // Parse agent card
      const agentCard = AgentCard.fromJSON ? AgentCard.fromJSON(cardData) : new AgentCard(cardData);

      console.log('[A2A Client] Creating A2A client from factory...');
      // Create A2A client using factory
      this.a2aClient = factory.create(agentCard);

      console.log('[A2A Client] A2A client initialized successfully');
      return this.a2aClient;
    } catch (error: any) {
      console.error('[A2A Client] Failed to initialize A2A SDK client:', error);
      console.error('[A2A Client] Error details:', {
        message: error?.message,
        stack: error?.stack,
        name: error?.name,
      });
      console.warn('[A2A Client] Will use HTTP fallback');
      return null; // Return null to trigger HTTP fallback
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
   * Execute a task by ID
   */
  /**
   * Execute task using A2A Protocol with A2A SDK Client (recommended method)
   * 
   * This method uses the official A2A SDK Client, following the pattern from test_a2a_client.py:
   * - Creates an A2A Message with data part containing task data
   * - Uses A2A Client.send_message() to send the message
   * - Handles streaming responses if enabled
   */
  async executeTask(
    taskId: string,
    useStreaming = false
  ): Promise<{ success: boolean; root_task_id: string; task_id: string; status: string; message: string }> {
    try {
      // Get A2A client (lazy initialization) - returns null if SDK not available
      const a2aClient = await this.getA2AClient();
      
      // First, get task details to build task data for A2A message
      const task = await this.getTask(taskId);
      
      // Detect provider for LLM key
      const provider = this.detectProviderFromTask(task);
      
      // Prepare task data in A2A format (similar to test_a2a_client.py)
      const taskData = {
        id: task.id,
        name: task.name,
        user_id: task.user_id,
        status: task.status || 'pending',
        priority: task.priority || 1,
        has_children: task.has_children || false,
        dependencies: task.dependencies || [],
        schemas: task.schemas || {},
        inputs: task.inputs || {},
        params: task.params,
      };
      
      // Get LLM key and format as provider:key if provider is detected
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
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
      
      // Create A2A Message (following test_a2a_client.py pattern)
      const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Create A2A message in plain object format (works with or without SDK)
      const a2aMessage = {
        message_id: messageId,
        role: 'user',
        parts: [
          {
            kind: 'data' as const,
            data: { tasks: [taskData] },
          },
        ],
        metadata: useStreaming ? { stream: true } : undefined,
      };
      
      // If A2A SDK client is available, use it
      if (a2aClient) {
        try {
          // Try to use SDK client
          const sendMethod = a2aClient.send_message || a2aClient.sendMessage || a2aClient.send;
          if (sendMethod) {
            const responses: any[] = [];
            const responseIterator = sendMethod.call(a2aClient, a2aMessage);
            
            for await (const response of responseIterator) {
              responses.push(response);
              
              // Response can be either Message or (Task, Update) tuple
              if (response && typeof response === 'object') {
                // Check if it's a Message with parts
                if ('parts' in response && response.parts) {
                  for (const part of response.parts) {
                    if (part.kind === 'data' && part.data) {
                      const resultData = part.data;
                      if (resultData.status || resultData.root_task_id || resultData.task_id) {
                        return {
                          success: resultData.status !== 'failed',
                          root_task_id: resultData.root_task_id || taskId,
                          task_id: resultData.task_id || taskId,
                          status: resultData.status || 'started',
                          message: resultData.message || 'Task execution started',
                        };
                      }
                    }
                  }
                } else if (Array.isArray(response) && response.length === 2) {
                  // Response is (Task, Update) tuple
                  const [task, update] = response;
                  if (task && task.id) {
                    return {
                      success: true,
                      root_task_id: task.id,
                      task_id: task.id,
                      status: update?.status || 'started',
                      message: update?.message || 'Task execution started',
                    };
                  }
                }
              }
            }
            
            // If we got responses but no specific result, return success
            if (responses.length > 0) {
              return {
                success: true,
                root_task_id: taskId,
                task_id: taskId,
                status: 'started',
                message: 'Task execution started via A2A SDK',
              };
            }
          }
        } catch (sdkError) {
          console.warn('[Task Execution] A2A SDK client execution failed, falling back to JSON-RPC:', sdkError);
          // Fall through to JSON-RPC approach
        }
      }
      
      // If A2A SDK is not available, fall back to JSON-RPC method
      // The server expects JSON-RPC format, not raw A2A messages
      // This is expected behavior - JSON-RPC is the standard method
      console.log('[Task Execution] Using JSON-RPC method (A2A SDK not available or not configured)');
      return this.executeTaskLegacy(taskId, useStreaming);
    } catch (error: any) {
      // If A2A protocol fails, fall back to JSON-RPC method for backward compatibility
      console.warn('[Task Execution] A2A protocol execution failed, falling back to JSON-RPC:', error);
      return this.executeTaskLegacy(taskId, useStreaming);
    }
  }

  /**
   * Legacy executeTask method using JSON-RPC tasks.execute (kept for backward compatibility)
   * @deprecated Use executeTask() which uses A2A Protocol instead
   */
  private async executeTaskLegacy(
    taskId: string,
    useStreaming = false
  ): Promise<{ success: boolean; root_task_id: string; task_id: string; status: string; message: string }> {
    // First, get task details to detect provider
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
    
    const response = await this.client.post<JsonRpcResponse<{ success: boolean; root_task_id: string; task_id: string; status: string; message: string }>>(
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

