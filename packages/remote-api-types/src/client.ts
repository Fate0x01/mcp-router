import {
  createTRPCProxyClient,
  httpBatchLink,
  TRPCClientError,
} from "@trpc/client";
import { MCPServer } from "@mcp_router/shared";
import type {
  ServerStatus,
  CreateServerInput,
  UpdateServerInput,
  RequestLogEntry,
  LogQueryOptions,
} from "./schema";

export interface RemoteAPIClientConfig {
  url: string;
  token: string;
  headers?: Record<string, string>;
}

/**
 * tRPCクライアントを作成
 *
 * 注意: サーバー側でRemoteAPIRouterインターフェースに準拠したtRPCルーターを実装してください。
 */
export function createRemoteAPIClient(
  config: RemoteAPIClientConfig,
): RemoteAPIClient {
  const client = createTRPCProxyClient<any>({
    links: [
      httpBatchLink({
        url: `${config.url}/trpc`,
        headers: () => ({
          authorization: `Bearer ${config.token}`,
          ...config.headers,
        }),
        // 30秒のタイムアウト
        fetch: (url, options) => {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 30000);

          return fetch(url, {
            ...options,
            signal: controller.signal,
          }).finally(() => clearTimeout(timeout));
        },
      }),
    ],
  });

  return client as unknown as RemoteAPIClient;
}

// 型安全なクライアントインターフェース
export interface RemoteAPIClient {
  servers: {
    list: {
      query: () => Promise<MCPServer[]>;
    };
    get: {
      query: (input: { id: string }) => Promise<MCPServer | null>;
    };
    create: {
      mutate: (input: CreateServerInput) => Promise<MCPServer>;
    };
    update: {
      mutate: (input: UpdateServerInput & { id: string }) => Promise<MCPServer>;
    };
    delete: {
      mutate: (input: { id: string }) => Promise<void>;
    };
    start: {
      mutate: (input: { id: string }) => Promise<void>;
    };
    stop: {
      mutate: (input: { id: string }) => Promise<void>;
    };
    getStatus: {
      query: (input: { id: string }) => Promise<ServerStatus>;
    };
  };
  logs: {
    list: {
      query: (input?: LogQueryOptions) => Promise<{
        logs: RequestLogEntry[];
        total: number;
      }>;
    };
    get: {
      query: (input: { id: string }) => Promise<RequestLogEntry | null>;
    };
    delete: {
      mutate: (input: { id: string }) => Promise<void>;
    };
    clear: {
      mutate: (input?: { serverId?: string }) => Promise<void>;
    };
  };
}

export { TRPCClientError };
