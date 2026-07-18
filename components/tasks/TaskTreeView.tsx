'use client';

/**
 * Task Tree View Component
 * 
 * Display task tree structure recursively
 */

import { Card, Text, Badge, Group, Stack } from '@mantine/core';
import { Task } from '@/lib/api/apflow';
import { IconChevronRight } from '@tabler/icons-react';

interface TaskTreeViewProps {
  task: Task;
  level?: number;
}

export function TaskTreeView({ task, level = 0 }: TaskTreeViewProps) {
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

  return (
    <Stack gap="xs">
      <Card
        shadow="sm"
        padding="md"
        radius="md"
        withBorder
        style={{
          marginLeft: `${level * 20}px`,
          borderLeft: level > 0 ? '2px solid var(--mantine-color-blue-4)' : undefined,
        }}
      >
        <Group justify="space-between">
          <Group>
            {level > 0 && <IconChevronRight size={16} />}
            <div>
              <Text fw={500}>{task.name}</Text>
              <Text size="xs" c="dimmed" ff="monospace" style={{ minWidth: '100px' }}>
                {`${task.id.substring(0, 4)}...${task.id.substring(task.id.length - 4)}`}
              </Text>
            </div>
          </Group>
          <Group>
            <Badge color={getStatusColor(task.status)}>
              {task.status || 'pending'}
            </Badge>
            {task.progress !== undefined && (
              <Text size="sm" c="dimmed">
                {Math.round((task.progress || 0) * 100)}%
              </Text>
            )}
          </Group>
        </Group>
      </Card>
      {task.children && task.children.length > 0 && (
        <Stack gap="xs">
          {task.children.map((child) => (
            <TaskTreeView key={child.id} task={child} level={level + 1} />
          ))}
        </Stack>
      )}
    </Stack>
  );
}
