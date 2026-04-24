import { apiClient } from '../lib/apiClient';

export interface ApiResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface LoadDto {
  id: number;
  laneId: number;
  referenceNumber: string;
  pickupDate: string;
  deliveryDate: string;
  carrierCost: number;
  targetRate: number;
  bookedRate: number | null;
  status: string;
  isAutoBooked: boolean;
  aiRecommendation: string | null;
  createdAt: string;
  laneName: string;
  clientName: string | null;
}

export interface LaneDto {
  id: number;
  clientId: number;
  clientName: string;
  originCity: string;
  originState: string;
  destinationCity: string;
  destinationState: string;
  mode: string;
  isActive: boolean;
  createdAt: string;
}

export interface LoadStats {
  total: number;
  pending: number;
  accepted: number;
  rejected: number;
  booked: number;
  autoBookedToday: number;
}

export interface SystemStatus {
  isEnabled: boolean;
}

export const loadsApi = {
  getAll: async (params?: {
    page?: number;
    pageSize?: number;
    laneId?: number;
    status?: string;
  }) => {
    const { data } = await apiClient.get<ApiResult<PagedResult<LoadDto>>>('/loads', { params });
    return data.data!;
  },

  getStats: async () => {
    const { data } = await apiClient.get<ApiResult<LoadStats>>('/loads/stats');
    return data.data!;
  },

  updateStatus: async (id: number, status: string, bookedRate?: number) => {
    const { data } = await apiClient.patch<ApiResult<LoadDto>>(`/loads/${id}/status`, {
      status,
      bookedRate,
    });
    return data.data!;
  },
};

export const lanesApi = {
  getAll: async (params?: { clientId?: number; isActive?: boolean }) => {
    const { data } = await apiClient.get<ApiResult<PagedResult<LaneDto>>>('/lanes', { params });
    return data.data!;
  },

  getById: async (id: number) => {
    const { data } = await apiClient.get<ApiResult<LaneDto>>(`/lanes/${id}`);
    return data.data!;
  },
};

export const systemApi = {
  getAutoBookingStatus: async () => {
    const { data } = await apiClient.get<ApiResult<SystemStatus>>('/system/auto-booking');
    return data.data!;
  },

  toggleAutoBooking: async () => {
    const { data } = await apiClient.post<ApiResult<SystemStatus & { message: string }>>('/system/auto-booking/toggle');
    return data.data!;
  },
};

// ── Parameters ────────────────────────────────────────────────────────────────

export interface ParametersDto {
  ctrGPFloor: number;
  ctrMarginFloor: number;
  ctrMarginNormal: number;
  spotMarginFloor: number;
  datTolerance: number;
  ctrOverrideProfit: boolean;
  ctrOverrideMargin: boolean;
  spotBlockThreshold: number;
  urgencyDays: number;
  urgencyLoads: number;
}

export const parametersApi = {
  get: async () => {
    const { data } = await apiClient.get<ApiResult<ParametersDto>>('/parameters');
    return data.data!;
  },
  update: async (params: ParametersDto) => {
    const { data } = await apiClient.put<ApiResult<ParametersDto>>('/parameters', params);
    return data.data!;
  },
};

// ── Simulate ──────────────────────────────────────────────────────────────────

export interface SimulateRuleResult {
  ruleName: string;
  status: 'pass' | 'fail' | 'warn';
  description: string;
  weight: number;
}

export interface SimulateEvaluateResponse {
  pass: boolean;
  recommendation: 'AutoAccept' | 'ContractBook' | 'Review';
  score: number;
  contractNeed: boolean;
  gpBlocked: boolean;
  contractGP: number;
  gpFloor: number;
  rules: SimulateRuleResult[];
}

export interface SimulateEvaluateRequest {
  lane: string;
  carrierCost: number;
  customerRate: number;
  spotRate: number;
  contractRate: number;
  isContract: boolean;
  weeklyMinimum: number | null;
  currentWeekBookings: number;
  totalUnmetContractLoads: number;
  daysRemaining: number;
  clientCode: string | null;
  needsInsurance: boolean;
}

export const simulateApi = {
  evaluate: async (req: SimulateEvaluateRequest) => {
    const { data } = await apiClient.post<ApiResult<SimulateEvaluateResponse>>('/simulate/evaluate', req);
    return data.data!;
  },
};

// ── Integrations ──────────────────────────────────────────────────────────────

export interface IntegrationHealth {
  name: string;
  isStub: boolean;
  isHealthy: boolean;
  statusMessage: string;
  checkedAt: string;
}

export interface DatSpotRate {
  origin: string;
  destination: string;
  spotRate: number;
  source: string;
  retrievedAt: string;
}

export interface E2openPushResult {
  success: boolean;
  externalId: string | null;
  message: string;
  sentAt: string;
}

export interface ImapLoadMessage {
  messageId: string;
  subject: string;
  origin: string;
  destination: string;
  equipmentType: string;
  targetRate: number | null;
  pickupDate: string;
  receivedAt: string;
}

export const integrationsApi = {
  getStatus: async () => {
    const { data } = await apiClient.get<ApiResult<IntegrationHealth[]>>('/integrations/status');
    return data.data!;
  },
  probeDat: async (origin: string, destination: string) => {
    const { data } = await apiClient.post<ApiResult<DatSpotRate>>('/integrations/dat/probe', { origin, destination });
    return data.data!;
  },
  probeE2open: async () => {
    const { data } = await apiClient.post<ApiResult<E2openPushResult>>('/integrations/e2open/probe');
    return data.data!;
  },
  probeImap: async () => {
    const { data } = await apiClient.post<ApiResult<ImapLoadMessage[]>>('/integrations/imap/probe');
    return data.data!;
  },
};

// ── Users ─────────────────────────────────────────────────────────────────────

export interface UserDto {
  id: string;
  username: string;
  displayName: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface CreateUserRequest {
  username: string;
  pin: string;
  displayName: string;
  role: string;
}

export interface UpdateUserRequest {
  displayName: string;
  role: string;
  isActive: boolean;
}

export const usersApi = {
  getAll: async (page = 1, pageSize = 50) => {
    const { data } = await apiClient.get<ApiResult<PagedResult<UserDto>>>('/users', {
      params: { page, pageSize },
    });
    return data.data!;
  },

  create: async (req: CreateUserRequest) => {
    const { data } = await apiClient.post<ApiResult<UserDto>>('/users', req);
    return data.data!;
  },

  update: async (id: string, req: UpdateUserRequest) => {
    const { data } = await apiClient.put<ApiResult<UserDto>>(`/users/${id}`, req);
    return data.data!;
  },

  resetPin: async (id: string, newPin: string) => {
    await apiClient.patch(`/users/${id}/pin`, { newPin });
  },

  delete: async (id: string) => {
    await apiClient.delete(`/users/${id}`);
  },
};

// ── Config ────────────────────────────────────────────────────────────────────

export interface ConfigImportResult {
  clientsUpserted: number;
  lanesUpserted: number;
  parametersApplied: boolean;
  importedAt: string;
}

export const configApi = {
  exportUrl: () => `${apiClient.defaults.baseURL}/config/export`,
  import: async (payload: unknown) => {
    const { data } = await apiClient.post<ApiResult<ConfigImportResult>>('/config/import', payload);
    return data.data!;
  },
};

// ── Integration Configs (custom/additional) ───────────────────────────────────

export interface IntegrationConfigDto {
  id: number;
  name: string;
  type: string;
  baseUrl: string;
  apiKeyMasked: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface CreateIntegrationConfigRequest {
  name: string;
  type: string;
  baseUrl?: string;
  apiKey?: string;
  notes?: string;
}

export const integrationConfigsApi = {
  getAll: async () => {
    const { data } = await apiClient.get<ApiResult<IntegrationConfigDto[]>>('/integration-configs');
    return data.data!;
  },
  create: async (req: CreateIntegrationConfigRequest) => {
    const { data } = await apiClient.post<ApiResult<IntegrationConfigDto>>('/integration-configs', req);
    return data.data!;
  },
  toggle: async (id: number) => {
    const { data } = await apiClient.patch<ApiResult<IntegrationConfigDto>>(`/integration-configs/${id}/toggle`);
    return data.data!;
  },
  remove: async (id: number) => {
    await apiClient.delete(`/integration-configs/${id}`);
  },
};
