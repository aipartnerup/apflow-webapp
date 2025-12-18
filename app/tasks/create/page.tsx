'use client';

/**
 * Create Task Page
 * 
 * Form to create new tasks with both simple and advanced JSON editing modes
 */

import { Container, Title, Button, Card, Stack, TextInput, Select, Textarea, Group, SegmentedControl, Alert } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, Task, GenerateTaskResponse } from '@/lib/api/aipartnerupflow';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { notifications } from '@mantine/notifications';
import { IconArrowLeft, IconCode, IconForms, IconAlertCircle, IconSparkles } from '@tabler/icons-react';
import { useState } from 'react';

interface TaskFormValues {
  name: string;
  executor: string;
  schemas: string;
  priority: number;
  inputs: string;
  params: string;
  parent_id?: string;
  dependencies: string;
  user_id?: string;
  id?: string;
  taskJson: string;  // For advanced mode
  generateDescription: string;  // For generate mode
  generatedTaskJson: string;  // For generate mode - generated and editable JSON
}

// Common executors
const COMMON_EXECUTORS = [
  { value: 'system_info_executor', label: 'System Info Executor', description: 'Query system resources (CPU, memory, disk)' },
  { value: 'command_executor', label: 'Command Executor', description: 'Execute shell commands' },
  { value: 'aggregate_results_executor', label: 'Aggregate Results Executor', description: 'Aggregate dependency task results' },
  { value: 'crewai_executor', label: 'CrewAI Executor', description: 'Execute CrewAI agents and tasks (requires LLM key)' },
  { value: 'batch_crewai_executor', label: 'Batch CrewAI Executor', description: 'Execute multiple CrewAI tasks in batch' },
];

export default function CreateTaskPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<'simple' | 'advanced' | 'generate'>('simple');
  const [generateStep, setGenerateStep] = useState<'input' | 'review'>('input');

  const form = useForm<TaskFormValues>({
    initialValues: {
      name: '',
      executor: '',
      schemas: '',
      priority: 2,
      inputs: '{}',
      params: '',
      parent_id: '',
      dependencies: '[]',
      user_id: '',
      id: '',
      taskJson: JSON.stringify({
        id: '',
        parent_id: null,
        user_id: null,
        name: '',
        status: 'pending',
        priority: 2,
        dependencies: null,
        inputs: {},
        params: null,
        schemas: {
          method: ''
        }
      }, null, 2),
      generateDescription: '',
      generatedTaskJson: '',
    },
    validate: {
      name: (value) => {
        if (mode === 'advanced' || mode === 'generate') return null;
        return value.length < 1 ? 'Task name is required' : null;
      },
      executor: (value) => {
        if (mode === 'advanced' || mode === 'generate') return null;
        return value.length < 1 ? 'Executor is required' : null;
      },
      schemas: (value) => {
        if (!value || value.trim() === '') return null;
        try {
          JSON.parse(value);
          return null;
        } catch {
          return 'Invalid JSON format';
        }
      },
      inputs: (value) => {
        if (mode === 'advanced' || mode === 'generate') return null;
        try {
          JSON.parse(value);
          return null;
        } catch {
          return 'Invalid JSON format';
        }
      },
      params: (value) => {
        if (!value || value.trim() === '') return null;
        try {
          JSON.parse(value);
          return null;
        } catch {
          return 'Invalid JSON format';
        }
      },
      dependencies: (value) => {
        if (!value || value.trim() === '') return null;
        try {
          const deps = JSON.parse(value);
          if (!Array.isArray(deps)) {
            return 'Dependencies must be an array';
          }
          return null;
        } catch {
          return 'Invalid JSON format';
        }
      },
      taskJson: (value) => {
        if (mode === 'simple' || mode === 'generate') return null;
        if (!value || value.trim() === '') {
          return 'Task JSON is required in advanced mode';
        }
        try {
          const parsed = JSON.parse(value);
          if (!parsed.name) {
            return 'Task JSON must include "name" field';
          }
          return null;
        } catch (e) {
          const error = e as Error;
          return `Invalid JSON format: ${error.message}`;
        }
      },
      generatedTaskJson: (value) => {
        if (mode !== 'generate') return null;
        if (generateStep === 'input') return null; // No validation needed at input step
        if (!value || value.trim() === '') {
          return 'Generated task JSON is required';
        }
        try {
          const parsed = JSON.parse(value);
          if (!parsed.name) {
            return 'Task JSON must include "name" field';
          }
          return null;
        } catch (e) {
          const error = e as Error;
          return `Invalid JSON format: ${error.message}`;
        }
      },
      generateDescription: (value) => {
        if (mode !== 'generate') return null;
        if (generateStep === 'review') return null; // No validation needed at review step
        if (!value || value.trim() === '') {
          return 'Description is required to generate task';
        }
        return null;
      },
    },
  });

  const generateMutation = useMutation({
    mutationFn: (description: string) => apiClient.generateTask(description),
    onSuccess: (response: GenerateTaskResponse) => {
      // Format the generated tasks as JSON string
      // If multiple tasks, show the full response; if single task, show just the task
      const taskJson = response.tasks.length === 1 
        ? JSON.stringify(response.tasks[0], null, 2)
        : JSON.stringify(response.tasks, null, 2);
      form.setFieldValue('generatedTaskJson', taskJson);
      setGenerateStep('review');
      notifications.show({
        title: t('common.success'),
        message: response.message || `Successfully generated ${response.count} task(s). Please review and edit if needed.`,
        color: 'green',
      });
    },
    onError: (error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate task';
      notifications.show({
        title: t('common.error'),
        message: errorMessage,
        color: 'red',
      });
    },
  });

  const createMutation = useMutation({
    mutationFn: (task: Task | Task[]) => {
      // Create tasks (save only, execution happens on task detail page)
      return apiClient.createTasks(task);
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      
      // Handle both response formats: CreateTaskResponse or Task object
      const taskId = ('root_task_id' in data ? data.root_task_id : undefined) || 
                     ('id' in data && typeof (data as { id?: string }).id === 'string' ? (data as { id: string }).id : undefined);
      
      notifications.show({
        title: t('common.success'),
        message: t('taskForm.create') + ' ' + t('common.success'),
        color: 'green',
      });
      
      // Wait a bit for database to save, then navigate
      if (taskId) {
        // Small delay to ensure task is saved to database
        await new Promise(resolve => setTimeout(resolve, 300));
        router.push(`/tasks/${taskId}`);
      } else {
        // If no ID, go to tasks list
        router.push('/tasks');
      }
    },
    onError: (error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : t('errors.apiError');
      notifications.show({
        title: t('common.error'),
        message: errorMessage,
        color: 'red',
      });
    },
  });

  const handleGenerate = () => {
    const description = form.values.generateDescription;
    if (!description || description.trim() === '') {
      notifications.show({
        title: t('common.error'),
        message: 'Please enter a task description',
        color: 'red',
      });
      return;
    }
    generateMutation.mutate(description);
  };

  const handleSaveGenerated = () => {
    try {
      const generatedJson = form.values.generatedTaskJson;
      if (!generatedJson || generatedJson.trim() === '') {
        notifications.show({
          title: t('common.error'),
          message: 'Generated task JSON is required',
          color: 'red',
        });
        return;
      }

      const parsed = JSON.parse(generatedJson);
      
      // Handle both single task and array of tasks
      let tasks: Task[];
      if (Array.isArray(parsed)) {
        tasks = parsed;
      } else {
        tasks = [parsed];
      }
      
      // Validate and process each task
      const validatedTasks = tasks.map((task, index) => {
        // Ensure required fields
        if (!task.name) {
          throw new Error(`Task ${index + 1}: Task name is required`);
        }
        
        // Auto-generate id if not provided
        if (!task.id) {
          task.id = `task-${Date.now()}-${index}`;
        }
        
        return task;
      });

      // Create tasks (apiClient.createTasks accepts Task[] or Task)
      // Save only, execution happens on task detail page
      createMutation.mutate(validatedTasks.length === 1 ? validatedTasks[0] : validatedTasks);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Invalid JSON format';
      notifications.show({
        title: t('common.error'),
        message: errorMessage,
        color: 'red',
      });
    }
  };

  const handleSubmit = (values: TaskFormValues) => {
    try {
      let task: Task;

      if (mode === 'generate') {
        // Generate mode: use generated task JSON
        if (!values.generatedTaskJson || values.generatedTaskJson.trim() === '') {
          throw new Error('Generated task JSON is required');
        }
        task = JSON.parse(values.generatedTaskJson);
        
        // Ensure required fields
        if (!task.name) {
          throw new Error('Task name is required');
        }
        
        // Auto-generate id if not provided
        if (!task.id) {
          task.id = `task-${Date.now()}`;
        }
      } else if (mode === 'advanced') {
        // Advanced mode: parse complete JSON
        task = JSON.parse(values.taskJson);
        
        // Ensure required fields
        if (!task.name) {
          throw new Error('Task name is required');
        }
        
        // Auto-generate id if not provided
        if (!task.id) {
          task.id = `task-${Date.now()}`;
        }
      } else {
        // Simple mode: build task from form fields
        const inputs = JSON.parse(values.inputs);
        task = {
          id: values.id && values.id.trim() ? values.id : `task-${Date.now()}`,
          name: values.name,
          user_id: values.user_id || undefined,
          priority: values.priority,
          parent_id: values.parent_id || undefined,
          inputs,
        };

        // Parse dependencies if provided
        if (values.dependencies && values.dependencies.trim() !== '') {
          const deps = JSON.parse(values.dependencies);
          if (Array.isArray(deps) && deps.length > 0) {
            task.dependencies = deps;
          }
        }

        // Parse schemas - use custom schemas if provided, otherwise use executor method
        if (values.schemas && values.schemas.trim() !== '') {
          task.schemas = JSON.parse(values.schemas);
        } else {
          // Default: use executor as method
          task.schemas = {
            method: values.executor,
          };
        }

        // Add params if provided
        if (values.params && values.params.trim() !== '') {
          task.params = JSON.parse(values.params);
        }
      }

      createMutation.mutate(task);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Invalid JSON format';
      notifications.show({
        title: t('common.error'),
        message: errorMessage,
        color: 'red',
      });
    }
  };

  // Sync form values to JSON when in simple mode (for preview)
  const syncToJson = () => {
    try {
      const inputs = form.values.inputs ? JSON.parse(form.values.inputs) : {};
      const schemas = form.values.schemas ? JSON.parse(form.values.schemas) : { method: form.values.executor };
      const params = form.values.params ? JSON.parse(form.values.params) : undefined;
      const dependencies = form.values.dependencies ? JSON.parse(form.values.dependencies) : undefined;

      const taskJson: Record<string, unknown> = {
        id: form.values.id || `task-${Date.now()}`,
        name: form.values.name,
        priority: form.values.priority,
        inputs,
        schemas,
      };

      if (form.values.user_id) taskJson.user_id = form.values.user_id;
      if (form.values.parent_id) taskJson.parent_id = form.values.parent_id;
      if (dependencies && dependencies.length > 0) taskJson.dependencies = dependencies;
      if (params) taskJson.params = params;

      form.setFieldValue('taskJson', JSON.stringify(taskJson, null, 2));
    } catch {
      // Ignore sync errors
    }
  };

  return (
    <Container size="md">
      <Button
        variant="subtle"
        leftSection={<IconArrowLeft size={16} />}
        onClick={() => router.back()}
        mb="xl"
      >
        {t('common.back')}
      </Button>

      <Title order={1} mb="xl">{t('taskForm.title')}</Title>

      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            {/* Mode Selector */}
            <Group justify="space-between" align="center">
              <SegmentedControl
                value={mode}
                onChange={(value) => {
                  setMode(value as 'simple' | 'advanced' | 'generate');
                  if (value === 'simple') {
                    syncToJson();
                  } else if (value === 'generate') {
                    setGenerateStep('input');
                  }
                }}
                data={[
                  {
                    value: 'simple',
                    label: (
                      <Group gap={8}>
                        <IconForms size={16} />
                        <span>Simple Mode</span>
                      </Group>
                    ),
                  },
                  {
                    value: 'advanced',
                    label: (
                      <Group gap={8}>
                        <IconCode size={16} />
                        <span>Advanced Mode (JSON)</span>
                      </Group>
                    ),
                  },
                  {
                    value: 'generate',
                    label: (
                      <Group gap={8}>
                        <IconSparkles size={16} />
                        <span>Generate Mode (LLM)</span>
                      </Group>
                    ),
                  },
                ]}
              />
            </Group>

            {mode === 'generate' ? (
              // Generate Mode: LLM Generation
              <>
                <Alert icon={<IconAlertCircle size={16} />} color="blue" title="Generate Mode (LLM)">
                  Describe your task in natural language, and AI will generate the task configuration for you. You can review and edit the generated JSON before saving.
                </Alert>
                {generateStep === 'input' ? (
                  <>
                    <Textarea
                      label="Task Description"
                      placeholder="e.g., Create a task to check CPU usage every 5 minutes and send an alert if usage exceeds 80%"
                      description="Describe what you want the task to do in natural language"
                      minRows={6}
                      required
                      {...form.getInputProps('generateDescription')}
                    />
                    <Group justify="flex-end">
                      <Button
                        onClick={handleGenerate}
                        loading={generateMutation.isPending}
                        disabled={!form.values.generateDescription || form.values.generateDescription.trim() === ''}
                      >
                        Generate Task
                      </Button>
                    </Group>
                  </>
                ) : (
                  <>
                    <Textarea
                      label="Generated Task JSON"
                      description="Review and edit the generated task configuration. Click 'Save Task' when ready."
                      minRows={40}
                      autosize
                      resize="vertical"
                      {...form.getInputProps('generatedTaskJson')}
                    />
                    <Group justify="space-between">
                      <Button
                        variant="subtle"
                        onClick={() => {
                          setGenerateStep('input');
                          form.setFieldValue('generatedTaskJson', '');
                        }}
                      >
                        Back to Description
                      </Button>
                      <Group>
                        <Button variant="subtle" onClick={() => router.back()}>
                          {t('common.cancel')}
                        </Button>
                        <Button
                          onClick={handleSaveGenerated}
                          loading={createMutation.isPending}
                          disabled={!form.values.generatedTaskJson || form.values.generatedTaskJson.trim() === ''}
                        >
                          {t('taskForm.create')}
                        </Button>
                      </Group>
                    </Group>
                  </>
                )}
              </>
            ) : mode === 'advanced' ? (
              // Advanced Mode: Direct JSON Editing
              <>
                <Alert icon={<IconAlertCircle size={16} />} color="blue" title="Advanced Mode">
                  Edit the complete task object as JSON. All fields can be customized directly.
                </Alert>
                <Textarea
                  label="Task JSON"
                  placeholder='{"id": "", "parent_id": null, "user_id": null, "name": "Task", "status": "pending", "priority": 2, "dependencies": null, "inputs": {}, "params": null, "schemas": {"method": "executor"}}'
                  description="Complete task object in JSON format. Must include 'name' field. All fields are optional except 'name'."
                  minRows={40}
                  autosize
                  resize="vertical"
                  {...form.getInputProps('taskJson')}
                />
              </>
            ) : (
              // Simple Mode: Form Fields
              <>
                <TextInput
                  label="Task ID (Optional)"
                  placeholder="Leave empty for auto-generated ID"
                  description="Custom task ID. If empty, will be auto-generated."
                  {...form.getInputProps('id')}
                />

                <TextInput
                  label={t('taskForm.name')}
                  placeholder={t('taskForm.namePlaceholder')}
                  required
                  {...form.getInputProps('name')}
                />

                <Select
                  label={t('taskForm.executor')}
                  placeholder="Select an executor"
                  description="Choose the executor to use for this task (will set schemas.method if schemas not provided)"
                  required
                  data={COMMON_EXECUTORS}
                  searchable
                  {...form.getInputProps('executor')}
                />

                <Select
                  label={t('taskForm.priority')}
                  data={[
                    { value: '0', label: t('taskForm.priorityUrgent') },
                    { value: '1', label: t('taskForm.priorityHigh') },
                    { value: '2', label: t('taskForm.priorityNormal') },
                    { value: '3', label: t('taskForm.priorityLow') },
                  ]}
                  value={form.values.priority.toString()}
                  onChange={(value) => form.setFieldValue('priority', parseInt(value || '2'))}
                />

                <Textarea
                  label={t('taskForm.inputs')}
                  placeholder='{"resource": "cpu"} or {"command": "echo hello"}'
                  description="Execution-time input parameters (JSON format)"
                  minRows={4}
                  required
                  {...form.getInputProps('inputs')}
                />

                <Textarea
                  label="Schemas (Optional)"
                  placeholder='{"method": "system_info_executor", "type": "stdio"}'
                  description="Task schemas configuration (JSON format). If empty, will use executor as method. Can include method, type, input_schema, output_schema, etc."
                  minRows={3}
                  {...form.getInputProps('schemas')}
                />

                <Textarea
                  label="Params (Optional)"
                  placeholder='{"works": {"agents": {...}, "tasks": {...}}}'
                  description="Executor initialization parameters (e.g., CrewAI works config). Leave empty for simple executors."
                  minRows={6}
                  {...form.getInputProps('params')}
                />

                <Textarea
                  label="Dependencies (Optional)"
                  placeholder='[{"id": "task-id", "required": true}]'
                  description='Task dependencies - array of task IDs this task depends on. Format: [{"id": "task-id", "required": true}]'
                  minRows={3}
                  {...form.getInputProps('dependencies')}
                />

                <TextInput
                  label="Parent Task ID (Optional)"
                  placeholder="Enter parent task ID for creating child tasks"
                  description="Leave empty to create a root task"
                  {...form.getInputProps('parent_id')}
                />

                <TextInput
                  label="User ID (Optional)"
                  placeholder="Enter user ID"
                  description="User ID for multi-user scenarios (defaults to current user)"
                  {...form.getInputProps('user_id')}
                />
              </>
            )}

            {/* Only show form submit buttons in simple and advanced modes */}
            {/* Generate mode has its own buttons in the generate section */}
            {mode !== 'generate' && (
              <Group justify="flex-end" mt="md">
                <Button variant="subtle" onClick={() => router.back()}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit" loading={createMutation.isPending}>
                  {t('taskForm.create')}
                </Button>
              </Group>
            )}
          </Stack>
        </form>
      </Card>
    </Container>
  );
}
