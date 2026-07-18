import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadClient(postHandler) {
  const sourcePath = path.join(__dirname, '../../../lib/api/apflow.ts');
  const source = fs.readFileSync(sourcePath, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;

  const calls = [];
  const getCalls = [];
  const axiosInstance = {
    interceptors: {
      request: { use() {} },
      response: { use() {} },
    },
    get: async (url) => {
      getCalls.push({ url });
      return { data: { status: 'ok', url } };
    },
    post: async (url, body, config) => {
      calls.push({ url, body, config });
      return postHandler(url, body, config, calls);
    },
  };
  const fakeAxios = {
    create() {
      return axiosInstance;
    },
  };

  const testModule = { exports: {} };
  const context = vm.createContext({
    module: testModule,
    exports: testModule.exports,
    require(request) {
      if (request === 'axios') {
        return { __esModule: true, default: fakeAxios };
      }
      throw new Error(`Unexpected require: ${request}`);
    },
    process,
    console,
    TextDecoder,
  });
  vm.runInContext(transpiled, context, { filename: sourcePath });

  return {
    AIPartnerUpFlowClient: testModule.exports.AIPartnerUpFlowClient,
    calls,
    getCalls,
  };
}

function moduleNotFound(message = 'missing') {
  const error = new Error(message);
  error.response = {
    status: 404,
    data: { error: { code: 'MODULE_NOT_FOUND', message } },
  };
  return error;
}

test('falls back from namespaced v2 module ids to bare module ids', async () => {
  const { AIPartnerUpFlowClient, calls } = loadClient(async (url) => {
    if (url === '/modules/apflow.task.list') {
      throw moduleNotFound();
    }
    assert.equal(url, '/modules/task.list');
    return { data: { tasks: [{ id: 't1', name: 'Task', status: 'pending' }], total: 1 } };
  });

  const client = new AIPartnerUpFlowClient('http://localhost:8080');
  const result = await client.listTasks({ limit: 10 });

  assert.deepEqual(plain(result), {
    tasks: [{ id: 't1', name: 'Task', status: 'pending' }],
    total: 1,
  });
  assert.deepEqual(calls.map((call) => call.url), ['/modules/apflow.task.list', '/modules/task.list']);
});

test('uses schedule.set for v2 schedule updates', async () => {
  const { AIPartnerUpFlowClient, calls } = loadClient(async (url, body) => {
    if (url === '/modules/apflow.task.get') {
      return {
        data: {
          id: body.task_id,
          name: 'Scheduled task',
          status: 'pending',
          schedule_type: 'interval',
          schedule_expression: '5m',
          schedule_enabled: true,
        },
      };
    }
    if (url === '/modules/apflow.schedule.set') {
      return {
        data: {
          id: body.task_id,
          name: 'Scheduled task',
          status: 'pending',
          schedule_type: body.schedule_type,
          schedule_expression: body.schedule_expression,
          schedule_enabled: body.schedule_enabled,
        },
      };
    }
    throw new Error(`unexpected ${url}`);
  });

  const client = new AIPartnerUpFlowClient('http://localhost:8080');
  const task = await client.updateTask('task-1', { schedule_enabled: false });

  assert.equal(task.schedule_enabled, false);
  assert.deepEqual(calls.map((call) => call.url), ['/modules/apflow.task.get', '/modules/apflow.schedule.set']);
  assert.deepEqual(plain(calls[1].body), {
    task_id: 'task-1',
    schedule_type: 'interval',
    schedule_expression: '5m',
    schedule_enabled: false,
  });
});

test('normalizes v2 schedule.export_ical response shape', async () => {
  const { AIPartnerUpFlowClient } = loadClient(async (url) => {
    assert.equal(url, '/modules/apflow.schedule.export_ical');
    return { data: { ical: 'BEGIN:VCALENDAR\nEND:VCALENDAR', count: 2 } };
  });

  const client = new AIPartnerUpFlowClient('http://localhost:8080');
  const result = await client.exportIcal();

  assert.deepEqual(plain(result), {
    ical_content: 'BEGIN:VCALENDAR\nEND:VCALENDAR',
    task_count: 2,
  });
});

test('returns a clear v2 error when task generation module is unavailable', async () => {
  const { AIPartnerUpFlowClient } = loadClient(async (url) => {
    assert.equal(url, '/modules/apflow.generate');
    throw moduleNotFound();
  });

  const client = new AIPartnerUpFlowClient('http://localhost:8080');
  await assert.rejects(
    () => client.generateTask('make a task'),
    /Task generation is not available on apflow v2/
  );
});

test('treats missing server-side LLM key module as unavailable status', async () => {
  const { AIPartnerUpFlowClient, calls } = loadClient(async (url) => {
    assert.equal(url, '/modules/apflow.config.llm_key.get');
    throw moduleNotFound();
  });

  const client = new AIPartnerUpFlowClient('http://localhost:8080');
  const status = await client.getLLMKeyStatus('openai', 'u1');

  assert.deepEqual(plain(status), {
    has_key: false,
    user_id: 'u1',
    provider: 'openai',
    providers: {},
    server_available: false,
  });
  assert.equal(calls.length, 1);
});

test('returns a clear error when server-side LLM key storage is unavailable', async () => {
  const { AIPartnerUpFlowClient } = loadClient(async (url) => {
    assert.equal(url, '/modules/apflow.config.llm_key.set');
    throw moduleNotFound();
  });

  const client = new AIPartnerUpFlowClient('http://localhost:8080');
  await assert.rejects(
    () => client.setLLMKey('sk-test', 'openai'),
    /Server-side LLM key storage is not available/
  );
});
