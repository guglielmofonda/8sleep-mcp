import { config as dotenvConfig } from 'dotenv';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { EightSleepFunctions } from './functions.js';
import { config } from './config.js';

dotenvConfig();

async function main() {
    const eightFunctions = new EightSleepFunctions();
    const userId = config.auth.userId;
    
    const server = new McpServer({
        name: "eight-sleep-mcp",
        version: "1.0.0"
    });

    // Define schemas for function parameters
    const temperatureSchema = { 
        level: z.number(),
        duration: z.number().optional()
    };
    const sleepDataSchema = {
        startDate: z.string(),
        endDate: z.string().optional()
    };
    const dateSchema = {
        date: z.string()
    };

    // Add tools
    server.tool('getUsers', {}, async () => ({
        content: [{ type: 'text', text: JSON.stringify(await eightFunctions.getUsers()) }]
    }));

    server.tool('getTemperature', {}, async () => ({
        content: [{ type: 'text', text: JSON.stringify(await eightFunctions.getTemperature(userId)) }]
    }));

    server.tool('setTemperature', temperatureSchema, async (args) => ({
        content: [{ type: 'text', text: JSON.stringify(await eightFunctions.setTemperature(userId, args.level, args.duration)) }]
    }));

    server.tool('getHouseholdSummary', {}, async () => ({
        content: [{ type: 'text', text: JSON.stringify(await eightFunctions.getHouseholdSummary(userId)) }]
    }));

    server.tool('getBedSideUsers', {}, async () => ({
        content: [{ type: 'text', text: JSON.stringify(await eightFunctions.getBedSideUsers(userId)) }]
    }));

    server.tool('setSideTemperature', {
        side: z.enum(['left', 'right']),
        level: z.number(),
        duration: z.number().optional()
    }, async (args) => ({
        content: [{ type: 'text', text: JSON.stringify(await eightFunctions.setSideTemperature(userId, args.side, args.level, args.duration)) }]
    }));

    server.tool('getSleepData', sleepDataSchema, async (args) => ({
        content: [{ type: 'text', text: JSON.stringify(await eightFunctions.getSleepData(userId, args.startDate, args.endDate)) }]
    }));

    server.tool('getHrv', dateSchema, async (args) => ({
        content: [{ type: 'text', text: JSON.stringify(await eightFunctions.getHrv(userId, args.date)) }]
    }));

    server.tool('getSleepScore', dateSchema, async (args) => ({
        content: [{ type: 'text', text: JSON.stringify(await eightFunctions.getSleepScore(userId, args.date)) }]
    }));

    server.tool('getSleepStages', dateSchema, async (args) => ({
        content: [{ type: 'text', text: JSON.stringify(await eightFunctions.getSleepStages(userId, args.date)) }]
    }));

    server.tool('getPresence', {}, async () => ({
        content: [{ type: 'text', text: JSON.stringify(await eightFunctions.getPresence(userId)) }]
    }));

    // Alarm Management
    server.tool('getAlarms', {}, async () => ({
        content: [{ type: 'text', text: JSON.stringify(await eightFunctions.getAlarms(userId)) }]
    }));

    server.tool('setAlarm', {
        time: z.string(),
        daysOfWeek: z.array(z.number()),
        vibration: z.boolean().optional(),
        sound: z.string().optional()
    }, async (args) => ({
        content: [{ type: 'text', text: JSON.stringify(await eightFunctions.setAlarm(userId, args.time, args.daysOfWeek, args.vibration, args.sound)) }]
    }));

    server.tool('updateAlarm', {
        alarmId: z.string(),
        enabled: z.boolean().optional(),
        time: z.string().optional(),
        daysOfWeek: z.array(z.number()).optional(),
        vibration: z.boolean().optional()
    }, async (args) => {
        const { alarmId, ...updates } = args;
        return {
            content: [{ type: 'text', text: JSON.stringify(await eightFunctions.updateAlarm(userId, alarmId, updates)) }]
        };
    });

    server.tool('deleteAlarm', {
        alarmId: z.string()
    }, async (args) => {
        await eightFunctions.deleteAlarm(userId, args.alarmId);
        return {
            content: [{ type: 'text', text: JSON.stringify({ message: `Alarm ${args.alarmId} deleted successfully` }) }]
        };
    });

    // Device Control
    server.tool('getDeviceStatus', {}, async () => ({
        content: [{ type: 'text', text: JSON.stringify(await eightFunctions.getDeviceStatus(userId)) }]
    }));

    server.tool('setDevicePower', {
        on: z.boolean()
    }, async (args) => {
        await eightFunctions.setDevicePower(userId, args.on);
        return {
            content: [{ type: 'text', text: JSON.stringify({ message: `Device turned ${args.on ? 'on' : 'off'} successfully` }) }]
        };
    });

    // Additional Sleep Data
    server.tool('getRespiratoryRate', dateSchema, async (args) => ({
        content: [{ type: 'text', text: JSON.stringify(await eightFunctions.getRespiratoryRate(userId, args.date)) }]
    }));

    server.tool('getHeartRate', dateSchema, async (args) => ({
        content: [{ type: 'text', text: JSON.stringify(await eightFunctions.getHeartRate(userId, args.date)) }]
    }));

    server.tool('getSleepTiming', dateSchema, async (args) => ({
        content: [{ type: 'text', text: JSON.stringify(await eightFunctions.getSleepTiming(userId, args.date)) }]
    }));

    server.tool('getSleepFitnessTrends', {
        days: z.number().optional()
    }, async (args) => ({
        content: [{ type: 'text', text: JSON.stringify(await eightFunctions.getSleepFitnessTrends(userId, args.days)) }]
    }));

    // Temperature Scheduling
    server.tool('getTemperatureSchedules', {}, async () => ({
        content: [{ type: 'text', text: JSON.stringify(await eightFunctions.getTemperatureSchedules(userId)) }]
    }));

    server.tool('setTemperatureSchedule', {
        startTime: z.string(),
        level: z.number(),
        daysOfWeek: z.array(z.number())
    }, async (args) => ({
        content: [{ type: 'text', text: JSON.stringify(await eightFunctions.setTemperatureSchedule(userId, args.startTime, args.level, args.daysOfWeek)) }]
    }));

    server.tool('updateTemperatureSchedule', {
        scheduleId: z.string(),
        startTime: z.string().optional(),
        level: z.number().optional(),
        daysOfWeek: z.array(z.number()).optional(),
        enabled: z.boolean().optional()
    }, async (args) => {
        const { scheduleId, ...updates } = args;
        return {
            content: [{ type: 'text', text: JSON.stringify(await eightFunctions.updateTemperatureSchedule(userId, scheduleId, updates)) }]
        };
    });

    server.tool('deleteTemperatureSchedule', {
        scheduleId: z.string()
    }, async (args) => {
        await eightFunctions.deleteTemperatureSchedule(userId, args.scheduleId);
        return {
            content: [{ type: 'text', text: JSON.stringify({ message: `Temperature schedule ${args.scheduleId} deleted successfully` }) }]
        };
    });

    // User Preferences
    server.tool('getUserPreferences', {}, async () => ({
        content: [{ type: 'text', text: JSON.stringify(await eightFunctions.getUserPreferences(userId)) }]
    }));

    server.tool('updateUserPreferences', {
        units: z.enum(['imperial', 'metric']).optional(),
        timezone: z.string().optional(),
        bedSide: z.enum(['left', 'right', '']).optional(),
        sleepGoal: z.number().optional()
    }, async (args) => {
        const prefs: Record<string, any> = { ...args };
        if (prefs.bedSide === '') prefs.bedSide = null;
        return {
            content: [{ type: 'text', text: JSON.stringify(await eightFunctions.updateUserPreferences(userId, prefs)) }]
        };
    });

    const transport = new StdioServerTransport();
    await server.connect(transport);
}

main().catch(error => {
    process.exit(1);
}); 