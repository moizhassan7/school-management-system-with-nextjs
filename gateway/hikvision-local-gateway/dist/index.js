import { randomUUID } from 'node:crypto';
import { loadConfig } from './config.js';
import { CloudClient } from './cloud.js';
import { GatewayStore } from './store.js';
import { testDevice } from './hikvision.js';
const config = loadConfig();
const cloud = new CloudClient(config);
const store = new GatewayStore(config.dbPath);
async function flushEvents() {
    const queued = store.nextEvents(250);
    if (!queued.length)
        return;
    try {
        const result = await cloud.pushEvents(randomUUID(), queued.map((item) => item.payload));
        store.acknowledgeEvents([...(result.accepted || []), ...(result.duplicates || [])]);
    }
    catch (error) {
        store.failEvents(queued.map((item) => item.id), error instanceof Error ? error.message : 'Unknown push error');
    }
}
async function executeCommands() {
    const { commands } = await cloud.commands();
    for (const command of commands) {
        try {
            await cloud.commandResult(command.id, { status: 'RUNNING' });
            if (command.type === 'TEST_CONNECTION' || command.type === 'PROBE_CAPABILITIES') {
                const result = await testDevice((command.payload?.device || {}));
                await cloud.commandResult(command.id, { status: 'SUCCEEDED', result });
                continue;
            }
            await cloud.commandResult(command.id, {
                status: 'FAILED',
                error: `Command ${command.type} requires school-specific Hikvision payload mapping before live execution`,
            });
        }
        catch (error) {
            await cloud.commandResult(command.id, {
                status: 'FAILED',
                error: error instanceof Error ? error.message : 'Unknown command failure',
            });
        }
    }
}
async function tick() {
    await cloud.heartbeat({
        version: '0.1.0',
        hostInfo: {
            platform: process.platform,
            node: process.version,
        },
    });
    await executeCommands();
    await flushEvents();
}
async function main() {
    console.log('Hikvision local gateway started');
    await tick().catch((error) => console.error(error));
    setInterval(() => {
        tick().catch((error) => console.error(error));
    }, config.pollIntervalMs);
}
void main();
