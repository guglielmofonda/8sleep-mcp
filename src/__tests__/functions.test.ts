import { jest } from '@jest/globals';

type MockAxiosClient = {
  get: any;
  put: any;
  post: any;
  patch: any;
  delete: any;
  request: any;
  interceptors: {
    request: { use: any };
    response: { use: any };
  };
};

const makeAxiosClient = (): MockAxiosClient => ({
  get: jest.fn(),
  put: jest.fn(),
  post: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
  request: jest.fn(),
  interceptors: {
    request: { use: jest.fn() },
    response: { use: jest.fn() },
  },
});

let clientApi: MockAxiosClient;
let appApi: MockAxiosClient;
let authApi: MockAxiosClient;
let createMock: jest.Mock;

class MockAxiosError extends Error {
  response?: { status?: number; data?: { message?: string } };
  config?: any;
}

(jest as any).unstable_mockModule('axios', () => ({
  default: {
    create: (...args: any[]) => createMock(...args),
  },
  AxiosError: MockAxiosError,
}));

process.env.EIGHT_SLEEP_EMAIL = 'test@example.com';
process.env.EIGHT_SLEEP_PASSWORD = 'test-password';
process.env.EIGHT_SLEEP_USER_ID = 'user1';

const { EightSleepFunctions } = await import('../functions.js');

describe('EightSleepFunctions temperature controls', () => {
  let eightFunctions: InstanceType<typeof EightSleepFunctions>;

  beforeEach(() => {
    clientApi = makeAxiosClient();
    appApi = makeAxiosClient();
    authApi = makeAxiosClient();
    createMock = jest.fn()
      .mockReturnValueOnce(clientApi)
      .mockReturnValueOnce(appApi)
      .mockReturnValueOnce(authApi);
    eightFunctions = new EightSleepFunctions();
  });

  it('turns on temperature control before setting a target level', async () => {
    appApi.put.mockResolvedValue({ data: {} });

    const result = await eightFunctions.setTemperature('user1', -50, 28800);

    expect(result).toEqual({ message: 'Temperature updated successfully' });
    expect(appApi.put).toHaveBeenNthCalledWith(1, '/users/user1/temperature', {
      currentState: { type: 'smart' },
    });
    expect(appApi.put).toHaveBeenNthCalledWith(2, '/users/user1/temperature', {
      currentLevel: -50,
    });
    expect(appApi.put).toHaveBeenNthCalledWith(3, '/users/user1/temperature', {
      timeBased: {
        level: -50,
        durationSeconds: 28800,
      },
    });
    expect(clientApi.put).not.toHaveBeenCalled();
  });

  it('uses the app-api temperature state endpoint for device power', async () => {
    appApi.put.mockResolvedValue({ data: {} });

    await eightFunctions.setDevicePower('user1', true);
    await eightFunctions.setDevicePower('user1', false);

    expect(appApi.put).toHaveBeenNthCalledWith(1, '/users/user1/temperature', {
      currentState: { type: 'smart' },
    });
    expect(appApi.put).toHaveBeenNthCalledWith(2, '/users/user1/temperature', {
      currentState: { type: 'off' },
    });
    expect(clientApi.put).not.toHaveBeenCalled();
  });

  it('reads current temperature state from app-api', async () => {
    appApi.get.mockResolvedValueOnce({
      data: {
        currentLevel: -50,
        currentDeviceLevel: -59,
        currentState: { type: 'timeBased' },
      },
    });

    const result = await eightFunctions.getTemperature('user1');

    expect(result).toEqual({
      current: -59,
      target: -50,
      state: 'timeBased',
      heating: true,
      cooling: false,
    });
    expect(appApi.get).toHaveBeenCalledWith('/users/user1/temperature');
    expect(clientApi.get).not.toHaveBeenCalled();
  });

  it('rejects invalid raw temperature levels', async () => {
    await expect(eightFunctions.setTemperature('user1', 150))
      .rejects
      .toThrow('Temperature level must be between -100 and 100');
  });
});
