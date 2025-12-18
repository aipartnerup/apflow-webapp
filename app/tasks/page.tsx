'use client';

/**
 * Task List Page
 * 
 * Display list of all tasks with filtering and search
 */

import { Container, Title, Button, Group, TextInput, Table, Badge, ActionIcon, Tooltip, Text, Select, Stack, Alert, useMantineColorScheme } from '@mantine/core';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, Task } from '@/lib/api/aipartnerupflow';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { IconPlus, IconSearch, IconEye, IconCopy, IconTrash, IconDatabase, IconInfoCircle, IconPlayerPlay, IconChevronDown, IconChevronRight } from '@tabler/icons-react';
import { useState, useRef, useEffect, Fragment } from 'react';
import { notifications } from '@mantine/notifications';

export default function TaskListPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { colorScheme } = useMantineColorScheme();
  const [searchQuery, setSearchQuery] = useState('');

  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [viewMode, setViewMode] = useState<'root' | 'all'>('root');
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [childrenCache, setChildrenCache] = useState<Record<string, Task[]>>({});
  const [executingTaskId, setExecutingTaskId] = useState<string | null>(null);
  
  // Ref to store SSE cleanup functions (one per task)
  const sseCleanupRefs = useRef<Map<string, () => void>>(new Map());

  // List tasks - default to root only
  const { data: tasks, isLoading } = useQuery({
    queryKey: ['tasks', searchQuery, statusFilter, viewMode],
    queryFn: () => apiClient.listTasks({ 
      status: statusFilter,
      root_only: viewMode === 'root' 
    }),
  });

  // Initialize demo tasks mutation
  const initDemoTasksMutation = useMutation({
    mutationFn: () => apiClient.initDemoTasks(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      notifications.show({
        title: 'Success',
        message: data.message || `Demo tasks initialized successfully. Created ${data.created_count} tasks.`,
        color: 'green',
      });
    },
    onError: (error: any) => {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to initialize demo tasks',
        color: 'red',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (taskId: string) => apiClient.deleteTask(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      notifications.show({
        title: t('common.success'),
        message: t('tasks.delete') + ' ' + t('common.success'),
        color: 'green',
      });
    },
    onError: (error: any) => {
      notifications.show({
        title: t('common.error'),
        message: error.message || t('errors.apiError'),
        color: 'red',
      });
    },
  });

  const copyMutation = useMutation({
    mutationFn: (taskId: string) => apiClient.copyTask(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      notifications.show({
        title: t('common.success'),
        message: t('tasks.copy') + ' ' + t('common.success'),
        color: 'green',
      });
    },
    onError: (error: any) => {
      notifications.show({
        title: t('common.error'),
        message: error.message || t('errors.apiError'),
        color: 'red',
      });
    },
  });

  const executeMutation = useMutation({
    mutationFn: (taskId: string) => {
      // Set executing task ID when execution starts
      setExecutingTaskId(taskId);
      return apiClient.executeTask(
        taskId,
        true, // Enable streaming
        (event: any) => {
          // Handle SSE events in real-time
          queryClient.invalidateQueries({ queryKey: ['tasks'] });
          queryClient.invalidateQueries({ queryKey: ['running-tasks'] });

          // Show notification on completion or failure and clear executing state
          if (event.final || event.type === 'stream_end') {
            setExecutingTaskId(null);
            if (event.status === 'completed') {
              notifications.show({
                title: 'Task Completed',
                message: `Task ${taskId} completed successfully`,
                color: 'green',
              });
            } else if (event.status === 'failed') {
              notifications.show({
                title: 'Task Failed',
                message: event.error || `Task ${taskId} execution failed`,
                color: 'red',
              });
            }
          }
        }
      );
    },
    onSuccess: (data) => {
      notifications.show({
        title: t('common.success'),
        message: data.message || 'Task execution started',
        color: 'green',
      });
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['running-tasks'] });
    },
    onError: (error: any) => {
      // Clear executing state on error
      setExecutingTaskId(null);
      notifications.show({
        title: t('common.error'),
        message: error.message || 'Failed to execute task',
        color: 'red',
      });
    },
  });

  // Cleanup all SSE connections on unmount
  useEffect(() => {
    return () => {
      sseCleanupRefs.current.forEach((cleanup) => cleanup());
      sseCleanupRefs.current.clear();
    };
  }, []);

  // Fetch children for a parent task
  const fetchChildren = async (parentId: string) => {
    if (childrenCache[parentId]) {
      return childrenCache[parentId];
    }
    try {
      const children = await apiClient.getTaskChildren(parentId);
      setChildrenCache(prev => ({ ...prev, [parentId]: children }));
      return children;
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to load child tasks',
        color: 'red',
      });
      return [];
    }
  };

  const toggleExpand = async (taskId: string) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
      // If children not loaded yet, fetch them
      if (!childrenCache[taskId]) {
        await fetchChildren(taskId);
      }
    }
    setExpandedTasks(newExpanded);
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'completed':
        return 'green';
      case 'failed':
        return 'red';
      case 'in_progress':
        return 'blue';
      case 'cancelled':
        return 'gray';
      default:
        return 'yellow';
    }
  };

  const filteredTasks = tasks?.filter((task) =>
    task.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    task.id.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // Helper function to check if a task should show loading/running state
  const isTaskExecuting = (task: Task, parentId?: string): boolean => {
    // Check if this task is the one being executed
    if (task.id === executingTaskId) {
      return true;
    }
    // Check if task status is in_progress
    if (task.status === 'in_progress') {
      return true;
    }
    // Check if parent is executing (for child tasks)
    // Check both the passed parentId and task.parent_id
    if (parentId && parentId === executingTaskId) {
      return true;
    }
    if (task.parent_id && task.parent_id === executingTaskId) {
      return true;
    }
    return false;
  };

  // Render task row recursively (supports nested children)
  const renderTaskRow = (task: Task, level: number = 0, parentId?: string) => {
    const isExpanded = expandedTasks.has(task.id);
    const children = childrenCache[task.id] || [];
    const isRoot = level === 0;
    // Check if task has children:
    // 1. Use has_children field if available (from backend)
    // 2. If we've already loaded children and there are some, it has children
    const hasChildren = task.has_children === true || children.length > 0;

    // Get background color based on theme and level
    const getBackgroundColor = () => {
      if (level === 0) return undefined;
      // Use theme-appropriate colors
      if (colorScheme === 'dark') {
        return 'var(--mantine-color-dark-7)';
      }
      return 'var(--mantine-color-gray-0)';
    };

    // Get text color based on theme and level
    const getTextColor = () => {
      if (level === 0) return undefined;
      if (colorScheme === 'dark') {
        return 'var(--mantine-color-dark-0)';
      }
      return 'var(--mantine-color-gray-9)';
    };

    return (
      <Fragment key={task.id}>
        <Table.Tr 
          style={{ 
            backgroundColor: getBackgroundColor(),
            color: getTextColor()
          }}
        >
          <Table.Td>
            <Group gap="xs">
              {isRoot && hasChildren && (
                <ActionIcon
                  variant="subtle"
                  size="sm"
                  onClick={() => toggleExpand(task.id)}
                  style={{ cursor: 'pointer' }}
                >
                  {isExpanded ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
                </ActionIcon>
              )}
              {isRoot && !hasChildren && (
                <div style={{ width: 20 }} /> // Spacer to align with tasks that have children
              )}
              {!isRoot && (
                <Text size="sm" c="dimmed" style={{ marginLeft: `${(level - 1) * 20}px` }}>
                  └─
                </Text>
              )}
              <Text size="sm" ff="monospace" c={colorScheme === 'dark' ? 'dark.0' : 'gray.9'}>
                {task.id.substring(0, 8)}...
              </Text>
            </Group>
          </Table.Td>
          <Table.Td>
            <Text 
              fw={level > 0 ? 500 : undefined}
              style={{ marginLeft: !isRoot ? `${level * 20}px` : 0 }} 
              c={colorScheme === 'dark' ? 'dark.0' : 'gray.9'}
            >
              {task.name}
            </Text>
          </Table.Td>
          <Table.Td>
            <Badge color={getStatusColor(task.status)}>
              {task.status || 'pending'}
            </Badge>
          </Table.Td>
          <Table.Td>
            <Text c={colorScheme === 'dark' ? 'dark.0' : 'gray.9'}>
              {Math.round((task.progress || 0) * 100)}%
            </Text>
          </Table.Td>
          <Table.Td>
            <Group gap="xs">
              <Tooltip label={t('tasks.view')}>
                <ActionIcon
                  variant="subtle"
                  onClick={() => router.push(`/tasks/${task.id}`)}
                >
                  <IconEye size={16} />
                </ActionIcon>
              </Tooltip>
              {(task.status === 'pending' || task.status === 'failed') && (
                <Tooltip label="Execute Task">
                  <ActionIcon
                    variant="subtle"
                    color="blue"
                    onClick={() => executeMutation.mutate(task.id)}
                    loading={isTaskExecuting(task, parentId)}
                  >
                    <IconPlayerPlay size={16} />
                  </ActionIcon>
                </Tooltip>
              )}
              <Tooltip label={t('tasks.copy')}>
                <ActionIcon
                  variant="subtle"
                  onClick={() => copyMutation.mutate(task.id)}
                  loading={copyMutation.isPending}
                >
                  <IconCopy size={16} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label={t('tasks.delete')}>
                <ActionIcon
                  variant="subtle"
                  color="red"
                  onClick={() => deleteMutation.mutate(task.id)}
                  loading={deleteMutation.isPending}
                >
                  <IconTrash size={16} />
                </ActionIcon>
              </Tooltip>
            </Group>
          </Table.Td>
        </Table.Tr>
        {isExpanded && children.map((child) => renderTaskRow(child, level + 1, task.id))}
      </Fragment>
    );
  };

  return (
    <Container size="xl">
      <Group justify="space-between" mb="xl">
        <Title order={1}>{t('tasks.list')}</Title>
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={() => router.push('/tasks/create')}
        >
          {t('nav.createTask')}
        </Button>
      </Group>

      <Group mb="md">
        <TextInput
          placeholder={t('common.search')}
          leftSection={<IconSearch size={16} />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ flex: 1 }}
        />
        <Select
          placeholder="View Mode"
          value={viewMode}
          onChange={(value) => {
            setViewMode(value as 'root' | 'all');
            setExpandedTasks(new Set()); // Clear expanded state when switching view
            setChildrenCache({}); // Clear cache
          }}
          data={[
            { value: 'root', label: 'Root Tasks Only' },
            { value: 'all', label: 'All Tasks' },
          ]}
          style={{ width: 180 }}
        />
        <Select
          placeholder={t('tasks.filterByStatus') || 'Filter by status'}
          value={statusFilter || null}
          onChange={(value) => setStatusFilter(value || undefined)}
          data={[
            { value: '', label: t('tasks.allStatuses') || 'All Statuses' },
            { value: 'pending', label: 'Pending' },
            { value: 'in_progress', label: 'In Progress' },
            { value: 'completed', label: 'Completed' },
            { value: 'failed', label: 'Failed' },
            { value: 'cancelled', label: 'Cancelled' },
          ]}
          clearable
          style={{ width: 200 }}
        />
      </Group>

      {isLoading ? (
        <Text c="dimmed">{t('common.loading')}</Text>
      ) : filteredTasks.length === 0 ? (
        <Stack gap="md" align="center" py="xl">
          <Text c="dimmed" size="lg">{t('tasks.noTasks')}</Text>
          <Stack gap="sm" align="center" style={{ maxWidth: 500 }}>
            <Alert icon={<IconInfoCircle size={16} />} color="blue" title="Get Started with Demo Tasks">
              Initialize demo tasks to get started. This will create sample tasks demonstrating various features that you can run directly.
            </Alert>
            <Group>
              <Button
                leftSection={<IconDatabase size={16} />}
                onClick={() => initDemoTasksMutation.mutate()}
                loading={initDemoTasksMutation.isPending}
                variant="filled"
              >
                Initialize Demo Tasks
              </Button>
            </Group>
          </Stack>
        </Stack>
      ) : (
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{t('tasks.id')}</Table.Th>
              <Table.Th>{t('tasks.name')}</Table.Th>
              <Table.Th>{t('tasks.status')}</Table.Th>
              <Table.Th>{t('tasks.progress')}</Table.Th>
              <Table.Th>{t('tasks.actions')}</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {filteredTasks.map((task) => renderTaskRow(task))}
          </Table.Tbody>
        </Table>
      )}
    </Container>
  );
}

