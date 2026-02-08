'use client';

import { Suspense, useState } from 'react';
import {
  Container,
  Title,
  Text,
  Group,
  Table,
  Badge,
  Switch,
  Button,
  ActionIcon,
  Tooltip,
  Select,
  Modal,
  TextInput,
  NumberInput,
  Stack,
} from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';
import {
  IconRefresh,
  IconPlayerPlay,
  IconEye,
  IconSettings,
  IconCalendarEvent,
  IconPlus,
  IconTrash,
  IconDownload,
} from '@tabler/icons-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { notifications } from '@mantine/notifications';
import { useForm } from '@mantine/form';
import { apiClient, ScheduledTask, Task } from '@/lib/api/apflow';

function formatExpressionDescription(type?: string, expression?: string): string {
  if (!type || !expression) return '-';
  switch (type) {
    case 'once': {
      const d = new Date(expression);
      if (isNaN(d.getTime())) return expression;
      return `Once at ${d.toLocaleString()}`;
    }
    case 'interval': {
      const seconds = parseInt(expression, 10);
      if (isNaN(seconds)) return expression;
      if (seconds < 60) return `Every ${seconds}s`;
      if (seconds < 3600) return `Every ${Math.round(seconds / 60)} min`;
      if (seconds < 86400) return `Every ${Math.round(seconds / 3600)} hour${Math.round(seconds / 3600) !== 1 ? 's' : ''}`;
      return `Every ${Math.round(seconds / 86400)} day${Math.round(seconds / 86400) !== 1 ? 's' : ''}`;
    }
    case 'cron':
      return expression;
    case 'daily':
      return `Daily at ${expression}`;
    case 'weekly': {
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const parts = expression.split(' ');
      if (parts.length >= 2) {
        const days = parts[0].split(',').map(d => dayNames[parseInt(d, 10)] || d).join(', ');
        return `${days} at ${parts[1]}`;
      }
      return expression;
    }
    case 'monthly': {
      const parts = expression.split(' ');
      if (parts.length >= 2) {
        const days = parts[0].split(',').map(d => {
          const n = parseInt(d, 10);
          if (n === 1 || n === 21 || n === 31) return `${n}st`;
          if (n === 2 || n === 22) return `${n}nd`;
          if (n === 3 || n === 23) return `${n}rd`;
          return `${n}th`;
        }).join(', ');
        return `${days} at ${parts[1]}`;
      }
      return expression;
    }
    default:
      return expression;
  }
}

const SCHEDULE_TYPES = [
  { value: 'once', labelKey: 'scheduler.typeOnce' },
  { value: 'interval', labelKey: 'scheduler.typeInterval' },
  { value: 'cron', labelKey: 'scheduler.typeCron' },
  { value: 'daily', labelKey: 'scheduler.typeDaily' },
  { value: 'weekly', labelKey: 'scheduler.typeWeekly' },
  { value: 'monthly', labelKey: 'scheduler.typeMonthly' },
];

function getTypeColor(type?: string): string {
  switch (type) {
    case 'once': return 'gray';
    case 'interval': return 'blue';
    case 'cron': return 'violet';
    case 'daily': return 'teal';
    case 'weekly': return 'orange';
    case 'monthly': return 'pink';
    default: return 'gray';
  }
}

function getStatusColor(status?: string): string {
  switch (status) {
    case 'completed': return 'green';
    case 'failed': return 'red';
    case 'in_progress': return 'blue';
    case 'cancelled': return 'gray';
    case 'pending':
    default: return 'yellow';
  }
}

/** Parse an ISO string to Date, or return null */
function parseDate(value?: string): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

/** Convert Date to ISO string, or empty string */
function toISOString(value: Date | null): string {
  return value ? value.toISOString() : '';
}

interface ScheduleFormValues {
  schedule_type: string;
  schedule_expression: string;
  schedule_expression_date: Date | null;  // for "once" type
  schedule_start_at: Date | null;
  schedule_end_at: Date | null;
  max_runs: number | '';
  schedule_enabled: boolean;
}

function SchedulerPageContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [enabledOnly, setEnabledOnly] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<ScheduledTask | null>(null);
  const [deleteTargetTask, setDeleteTargetTask] = useState<ScheduledTask | null>(null);
  const [addSelectedTaskId, setAddSelectedTaskId] = useState<string | null>(null);

  const defaultFormValues: ScheduleFormValues = {
    schedule_type: 'interval',
    schedule_expression: '',
    schedule_expression_date: null,
    schedule_start_at: null,
    schedule_end_at: null,
    max_runs: '',
    schedule_enabled: true,
  };

  const form = useForm<ScheduleFormValues>({ initialValues: { ...defaultFormValues } });
  const addForm = useForm<ScheduleFormValues>({ initialValues: { ...defaultFormValues } });

  /** Convert form values to the API payload strings */
  function formToApi(values: ScheduleFormValues) {
    return {
      schedule_type: values.schedule_type,
      schedule_expression: values.schedule_type === 'once'
        ? toISOString(values.schedule_expression_date)
        : values.schedule_expression,
      schedule_enabled: values.schedule_enabled,
      schedule_start_at: toISOString(values.schedule_start_at) || undefined,
      schedule_end_at: toISOString(values.schedule_end_at) || undefined,
      max_runs: values.max_runs === '' ? undefined : values.max_runs,
    };
  }

  const { data: scheduledTasks, isLoading, refetch } = useQuery({
    queryKey: ['scheduled-tasks', enabledOnly, typeFilter, statusFilter],
    queryFn: () => apiClient.getScheduledTasks({
      enabled_only: enabledOnly,
      schedule_type: typeFilter || undefined,
      status: statusFilter || undefined,
    }),
    refetchInterval: 10000,
  });

  // Fetch all tasks for the "Add Schedule" task selector
  const { data: allTasks } = useQuery({
    queryKey: ['all-tasks-for-scheduler'],
    queryFn: () => apiClient.listTasks({ root_only: true, limit: 200 }),
    enabled: addModalOpen,
  });

  // Build select options: exclude tasks that already have a schedule
  const scheduledTaskIds = new Set((scheduledTasks || []).map((st) => st.id));
  const taskSelectData = (allTasks || [])
    .filter((task: Task) => !scheduledTaskIds.has(task.id))
    .map((task: Task) => ({
      value: task.id,
      label: `${task.name} (${task.id.slice(0, 8)}...)`,
    }));

  const toggleEnabledMutation = useMutation({
    mutationFn: async ({ taskId, enabled }: { taskId: string; enabled: boolean }) => {
      await apiClient.updateTask(taskId, { schedule_enabled: enabled });
      if (enabled) {
        await apiClient.initSchedule(taskId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-tasks'] });
    },
    onError: (error: any) => {
      notifications.show({
        title: t('common.error'),
        message: error.message || t('scheduler.updateError'),
        color: 'red',
      });
    },
  });

  const triggerMutation = useMutation({
    mutationFn: (taskId: string) => apiClient.triggerWebhook(taskId),
    onSuccess: () => {
      notifications.show({
        title: t('common.success'),
        message: t('scheduler.triggerSuccess'),
        color: 'green',
      });
      queryClient.invalidateQueries({ queryKey: ['scheduled-tasks'] });
    },
    onError: (error: any) => {
      notifications.show({
        title: t('common.error'),
        message: error.message || t('scheduler.triggerError'),
        color: 'red',
      });
    },
  });

  // Save (edit existing schedule)
  const saveMutation = useMutation({
    mutationFn: async (values: ScheduleFormValues) => {
      if (!selectedTask) return;
      const payload = formToApi(values);
      await apiClient.updateTask(selectedTask.id, payload);
      if (values.schedule_enabled) {
        await apiClient.initSchedule(selectedTask.id);
      }
    },
    onSuccess: () => {
      notifications.show({
        title: t('common.success'),
        message: t('scheduler.updateSuccess'),
        color: 'green',
      });
      queryClient.invalidateQueries({ queryKey: ['scheduled-tasks'] });
      setConfigModalOpen(false);
      setSelectedTask(null);
    },
    onError: (error: any) => {
      notifications.show({
        title: t('common.error'),
        message: error.message || t('scheduler.updateError'),
        color: 'red',
      });
    },
  });

  // Add schedule to an existing task
  const addMutation = useMutation({
    mutationFn: async (values: ScheduleFormValues) => {
      if (!addSelectedTaskId) return;
      const payload = formToApi(values);
      await apiClient.updateTask(addSelectedTaskId, payload);
      if (values.schedule_enabled) {
        await apiClient.initSchedule(addSelectedTaskId);
      }
    },
    onSuccess: () => {
      notifications.show({
        title: t('common.success'),
        message: t('scheduler.addSuccess'),
        color: 'green',
      });
      queryClient.invalidateQueries({ queryKey: ['scheduled-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['all-tasks-for-scheduler'] });
      setAddModalOpen(false);
      setAddSelectedTaskId(null);
      addForm.reset();
    },
    onError: (error: any) => {
      notifications.show({
        title: t('common.error'),
        message: error.message || t('scheduler.addError'),
        color: 'red',
      });
    },
  });

  // Delete (clear) schedule from a task
  const deleteMutation = useMutation({
    mutationFn: async (taskId: string) => {
      await apiClient.updateTask(taskId, {
        schedule_type: '',
        schedule_expression: '',
        schedule_enabled: false,
        schedule_start_at: undefined,
        schedule_end_at: undefined,
        max_runs: undefined,
      });
    },
    onSuccess: () => {
      notifications.show({
        title: t('common.success'),
        message: t('scheduler.deleteSuccess'),
        color: 'green',
      });
      queryClient.invalidateQueries({ queryKey: ['scheduled-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['all-tasks-for-scheduler'] });
      setDeleteConfirmOpen(false);
      setDeleteTargetTask(null);
    },
    onError: (error: any) => {
      notifications.show({
        title: t('common.error'),
        message: error.message || t('scheduler.deleteError'),
        color: 'red',
      });
    },
  });

  const [exporting, setExporting] = useState(false);

  const handleExportIcal = async () => {
    setExporting(true);
    try {
      const result = await apiClient.exportIcal({
        enabled_only: enabledOnly,
        schedule_type: typeFilter || undefined,
      });
      if (!result.ical_content || result.task_count === 0) {
        notifications.show({
          title: t('common.success'),
          message: t('scheduler.exportEmpty'),
          color: 'yellow',
        });
        return;
      }
      const blob = new Blob([result.ical_content], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'apflow-schedule.ics';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      notifications.show({
        title: t('common.success'),
        message: t('scheduler.exportSuccess'),
        color: 'green',
      });
    } catch (error: any) {
      notifications.show({
        title: t('common.error'),
        message: error.message || t('scheduler.exportError'),
        color: 'red',
      });
    } finally {
      setExporting(false);
    }
  };

  const openConfigModal = (task: ScheduledTask) => {
    setSelectedTask(task);
    form.setValues({
      schedule_type: task.schedule_type || 'interval',
      schedule_expression: task.schedule_type === 'once' ? '' : (task.schedule_expression || ''),
      schedule_expression_date: task.schedule_type === 'once' ? parseDate(task.schedule_expression) : null,
      schedule_start_at: parseDate(task.schedule_start_at),
      schedule_end_at: parseDate(task.schedule_end_at),
      max_runs: task.max_runs ?? '',
      schedule_enabled: task.schedule_enabled ?? true,
    });
    setConfigModalOpen(true);
  };

  const openDeleteConfirm = (task: ScheduledTask) => {
    setDeleteTargetTask(task);
    setDeleteConfirmOpen(true);
  };

  const formatDateTime = (dt?: string) => {
    if (!dt) return t('scheduler.never');
    return new Date(dt).toLocaleString();
  };

  const typeFilterData = [
    { value: '', label: t('scheduler.allTypes') },
    ...SCHEDULE_TYPES.map(st => ({ value: st.value, label: t(st.labelKey) })),
  ];

  const statusFilterData = [
    { value: '', label: t('scheduler.allStatuses') },
    { value: 'pending', label: t('tasks.statusPending') },
    { value: 'in_progress', label: t('tasks.statusInProgress') },
    { value: 'completed', label: t('tasks.statusCompleted') },
    { value: 'failed', label: t('tasks.statusFailed') },
    { value: 'cancelled', label: t('tasks.statusCancelled') },
  ];

  const editExpressionHelpKey = `scheduler.expressionHelp.${form.values.schedule_type}` as const;
  const addExpressionHelpKey = `scheduler.expressionHelp.${addForm.values.schedule_type}` as const;

  /** Render the expression field based on schedule_type */
  function renderExpressionField(
    formInstance: ReturnType<typeof useForm<ScheduleFormValues>>,
    helpKey: string,
  ) {
    if (formInstance.values.schedule_type === 'once') {
      return (
        <DateTimePicker
          label={t('scheduler.expression')}
          placeholder={t(helpKey)}
          clearable
          valueFormat="YYYY-MM-DD HH:mm:ss"
          {...formInstance.getInputProps('schedule_expression_date')}
        />
      );
    }
    return (
      <TextInput
        label={t('scheduler.expression')}
        placeholder={t(helpKey)}
        description={t(helpKey)}
        {...formInstance.getInputProps('schedule_expression')}
      />
    );
  }

  const rows = (scheduledTasks || []).map((task) => (
    <Table.Tr key={task.id}>
      <Table.Td>
        <Text size="sm" fw={500} lineClamp={1}>{task.name}</Text>
        <Text size="xs" c="dimmed" ff="monospace" lineClamp={1}>{task.id}</Text>
      </Table.Td>
      <Table.Td>
        <Badge color={getStatusColor(task.status)} variant="light" size="sm">
          {t(`tasks.status${task.status === 'in_progress' ? 'InProgress' : (task.status ? task.status.charAt(0).toUpperCase() + task.status.slice(1) : 'Pending')}`)}
        </Badge>
      </Table.Td>
      <Table.Td>
        <Badge color={getTypeColor(task.schedule_type)} variant="light" size="sm">
          {t(`scheduler.type${task.schedule_type ? task.schedule_type.charAt(0).toUpperCase() + task.schedule_type.slice(1) : 'Once'}`)}
        </Badge>
      </Table.Td>
      <Table.Td>
        <Text size="sm">{formatExpressionDescription(task.schedule_type, task.schedule_expression)}</Text>
      </Table.Td>
      <Table.Td>
        <Switch
          checked={task.schedule_enabled}
          onChange={() => toggleEnabledMutation.mutate({ taskId: task.id, enabled: !task.schedule_enabled })}
          size="sm"
        />
      </Table.Td>
      <Table.Td>
        <Text size="sm">{formatDateTime(task.next_run_at)}</Text>
      </Table.Td>
      <Table.Td>
        <Text size="sm">{formatDateTime(task.last_run_at)}</Text>
      </Table.Td>
      <Table.Td>
        <Text size="sm">
          {task.run_count ?? 0}{task.max_runs ? ` / ${task.max_runs}` : ` / ${t('scheduler.unlimited')}`}
        </Text>
      </Table.Td>
      <Table.Td>
        <Group gap={4} wrap="nowrap">
          <Tooltip label={t('scheduler.trigger')}>
            <ActionIcon
              variant="subtle"
              color="green"
              onClick={() => triggerMutation.mutate(task.id)}
              loading={triggerMutation.isPending}
              size="sm"
            >
              <IconPlayerPlay size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label={t('scheduler.viewTask')}>
            <ActionIcon
              variant="subtle"
              color="blue"
              onClick={() => router.push(`/tasks?id=${task.id}`)}
              size="sm"
            >
              <IconEye size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label={t('scheduler.configure')}>
            <ActionIcon
              variant="subtle"
              color="gray"
              onClick={() => openConfigModal(task)}
              size="sm"
            >
              <IconSettings size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label={t('scheduler.deleteSchedule')}>
            <ActionIcon
              variant="subtle"
              color="red"
              onClick={() => openDeleteConfirm(task)}
              size="sm"
            >
              <IconTrash size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <Container size="xl">
      <Group justify="space-between" mb="md">
        <div>
          <Title order={2}>{t('scheduler.title')}</Title>
          <Text c="dimmed" size="sm">{t('scheduler.description')}</Text>
        </div>
        <Group gap="sm">
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={() => setAddModalOpen(true)}
          >
            {t('scheduler.addSchedule')}
          </Button>
          <Button
            variant="light"
            leftSection={<IconDownload size={16} />}
            onClick={handleExportIcal}
            loading={exporting}
          >
            {t('scheduler.exportIcal')}
          </Button>
          <Button
            variant="subtle"
            leftSection={<IconRefresh size={16} />}
            onClick={() => refetch()}
          >
            {t('common.refresh')}
          </Button>
        </Group>
      </Group>

      <Group mb="md" gap="md">
        <Switch
          label={t('scheduler.enabledOnly')}
          checked={enabledOnly}
          onChange={(e) => setEnabledOnly(e.currentTarget.checked)}
        />
        <Select
          placeholder={t('scheduler.allTypes')}
          data={typeFilterData}
          value={typeFilter || ''}
          onChange={(v) => setTypeFilter(v || null)}
          clearable
          style={{ width: 160 }}
        />
        <Select
          placeholder={t('scheduler.allStatuses')}
          data={statusFilterData}
          value={statusFilter || ''}
          onChange={(v) => setStatusFilter(v || null)}
          clearable
          style={{ width: 160 }}
        />
      </Group>

      {isLoading ? (
        <Text c="dimmed">{t('common.loading')}</Text>
      ) : !scheduledTasks || scheduledTasks.length === 0 ? (
        <Stack align="center" gap="sm" py="xl">
          <IconCalendarEvent size={48} stroke={1.5} color="gray" />
          <Text fw={500}>{t('scheduler.noScheduledTasks')}</Text>
          <Text size="sm" c="dimmed" maw={400} ta="center">
            {t('scheduler.noScheduledTasksDescription')}
          </Text>
        </Stack>
      ) : (
        <Table.ScrollContainer minWidth={800}>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t('scheduler.taskName')}</Table.Th>
                <Table.Th>{t('scheduler.taskStatus')}</Table.Th>
                <Table.Th>{t('scheduler.scheduleType')}</Table.Th>
                <Table.Th>{t('scheduler.expression')}</Table.Th>
                <Table.Th>{t('scheduler.enabled')}</Table.Th>
                <Table.Th>{t('scheduler.nextRun')}</Table.Th>
                <Table.Th>{t('scheduler.lastRun')}</Table.Th>
                <Table.Th>{t('scheduler.runCount')}</Table.Th>
                <Table.Th>{t('scheduler.actions')}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>{rows}</Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}

      {/* Edit Schedule Modal */}
      <Modal
        opened={configModalOpen}
        onClose={() => { setConfigModalOpen(false); setSelectedTask(null); }}
        title={t('scheduler.configureSchedule')}
        size="md"
      >
        <form onSubmit={form.onSubmit((values) => saveMutation.mutate(values))}>
          <Stack gap="md">
            <Select
              label={t('scheduler.scheduleType')}
              data={SCHEDULE_TYPES.map(st => ({ value: st.value, label: t(st.labelKey) }))}
              {...form.getInputProps('schedule_type')}
            />
            {renderExpressionField(form, editExpressionHelpKey)}
            <DateTimePicker
              label={t('scheduler.startTime')}
              placeholder={t('scheduler.startTime')}
              clearable
              valueFormat="YYYY-MM-DD HH:mm:ss"
              {...form.getInputProps('schedule_start_at')}
            />
            <DateTimePicker
              label={t('scheduler.endTime')}
              placeholder={t('scheduler.endTime')}
              clearable
              valueFormat="YYYY-MM-DD HH:mm:ss"
              {...form.getInputProps('schedule_end_at')}
            />
            <NumberInput
              label={t('scheduler.maxRuns')}
              placeholder={t('scheduler.maxRunsPlaceholder')}
              min={1}
              {...form.getInputProps('max_runs')}
            />
            <Switch
              label={t('scheduler.enabled')}
              {...form.getInputProps('schedule_enabled', { type: 'checkbox' })}
            />
            <Group justify="flex-end">
              <Button variant="subtle" onClick={() => { setConfigModalOpen(false); setSelectedTask(null); }}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" loading={saveMutation.isPending}>
                {t('scheduler.saveSchedule')}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Add Schedule Modal */}
      <Modal
        opened={addModalOpen}
        onClose={() => { setAddModalOpen(false); setAddSelectedTaskId(null); addForm.reset(); }}
        title={t('scheduler.addSchedule')}
        size="md"
      >
        <form onSubmit={addForm.onSubmit((values) => addMutation.mutate(values))}>
          <Stack gap="md">
            <Text size="sm" c="dimmed">{t('scheduler.addScheduleDescription')}</Text>
            <Select
              label={t('scheduler.selectTask')}
              placeholder={t('scheduler.selectTaskPlaceholder')}
              data={taskSelectData}
              value={addSelectedTaskId}
              onChange={setAddSelectedTaskId}
              searchable
              required
            />
            <Select
              label={t('scheduler.scheduleType')}
              data={SCHEDULE_TYPES.map(st => ({ value: st.value, label: t(st.labelKey) }))}
              {...addForm.getInputProps('schedule_type')}
            />
            {renderExpressionField(addForm, addExpressionHelpKey)}
            <DateTimePicker
              label={t('scheduler.startTime')}
              placeholder={t('scheduler.startTime')}
              clearable
              valueFormat="YYYY-MM-DD HH:mm:ss"
              {...addForm.getInputProps('schedule_start_at')}
            />
            <DateTimePicker
              label={t('scheduler.endTime')}
              placeholder={t('scheduler.endTime')}
              clearable
              valueFormat="YYYY-MM-DD HH:mm:ss"
              {...addForm.getInputProps('schedule_end_at')}
            />
            <NumberInput
              label={t('scheduler.maxRuns')}
              placeholder={t('scheduler.maxRunsPlaceholder')}
              min={1}
              {...addForm.getInputProps('max_runs')}
            />
            <Switch
              label={t('scheduler.enabled')}
              {...addForm.getInputProps('schedule_enabled', { type: 'checkbox' })}
            />
            <Group justify="flex-end">
              <Button variant="subtle" onClick={() => { setAddModalOpen(false); setAddSelectedTaskId(null); addForm.reset(); }}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" loading={addMutation.isPending} disabled={!addSelectedTaskId}>
                {t('scheduler.saveSchedule')}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Delete Schedule Confirmation Modal */}
      <Modal
        opened={deleteConfirmOpen}
        onClose={() => { setDeleteConfirmOpen(false); setDeleteTargetTask(null); }}
        title={t('scheduler.deleteSchedule')}
        size="sm"
      >
        <Stack gap="md">
          <Text size="sm">{t('scheduler.deleteScheduleConfirm')}</Text>
          {deleteTargetTask && (
            <Text size="sm" fw={500}>{deleteTargetTask.name}</Text>
          )}
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => { setDeleteConfirmOpen(false); setDeleteTargetTask(null); }}>
              {t('common.cancel')}
            </Button>
            <Button
              color="red"
              loading={deleteMutation.isPending}
              onClick={() => deleteTargetTask && deleteMutation.mutate(deleteTargetTask.id)}
            >
              {t('common.delete')}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}

export default function SchedulerPage() {
  return (
    <Suspense fallback={<Container><Text>Loading...</Text></Container>}>
      <SchedulerPageContent />
    </Suspense>
  );
}
