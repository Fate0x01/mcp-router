import { BaseRepository } from "./base-repository";
import { SqliteManager, getSqliteManager } from "./sqlite-manager";
import { MCPServer, MCPServerConfig } from "@mcp-router/shared";
import { v4 as uuidv4 } from "uuid";

/**
 * サーバ情報用リポジトリクラス
 * BetterSQLite3を使用してサーバ情報を管理
 */
export class ServerRepository extends BaseRepository<MCPServer> {
  /**
   * コンストラクタ
   * @param db SqliteManagerインスタンス
   */
  constructor(db: SqliteManager) {
    super(db, "servers");
    console.log(
      "[ServerRepository] Initialized with database:",
      db ? "Present" : "Missing",
    );
  }

  /**
   * テーブルとインデックスを初期化
   * 注: このメソッドはテーブルの初期作成のみを行います
   * スキーマのマイグレーションはDatabaseMigrationクラスで一元管理されます
   */
  protected initializeTable(): void {
    try {
      // serversテーブルの作成（存在しない場合）
      this.db.execute(`
        CREATE TABLE IF NOT EXISTS ${this.tableName} (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          command TEXT,
          args TEXT,
          env TEXT,
          auto_start INTEGER NOT NULL,
          disabled INTEGER NOT NULL,
          auto_approve TEXT,
          context_path TEXT,
          server_type TEXT NOT NULL DEFAULT 'local',
          remote_url TEXT,
          bearer_token TEXT,
          input_params TEXT,
          description TEXT,
          version TEXT,
          latest_version TEXT,
          verification_status TEXT,
          required_params TEXT,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        )
      `);

      // インデックスの作成
      this.db.execute(
        `CREATE INDEX IF NOT EXISTS idx_servers_name ON ${this.tableName} (name)`,
      );
    } catch (error) {
      console.error("サーバテーブルの初期化中にエラーが発生しました:", error);
      throw error;
    }
  }

  /**
   * JSON文字列を安全にパース
   * @param jsonString JSON文字列
   * @param errorLabel エラーメッセージ用のラベル
   * @param defaultValue パース失敗時のデフォルト値
   * @returns パースされたオブジェクト
   */
  private safeParseJSON<T>(
    jsonString: string | null,
    errorLabel: string,
    defaultValue: T,
  ): T {
    if (!jsonString) return defaultValue;

    try {
      return JSON.parse(jsonString) as T;
    } catch (error) {
      console.error(`${errorLabel}のJSONパースに失敗しました:`, error);
      return defaultValue;
    }
  }

  /**
   * DBの行をエンティティに変換（非同期バージョン）
   */
  protected mapRowToEntity(row: any): MCPServer {
    try {
      // データをパース
      const env = this.safeParseJSON<Record<string, any>>(
        row.env,
        "環境変数",
        {},
      );
      const requiredParams: string[] = row.required_params
        ? JSON.parse(row.required_params)
        : [];
      const command = row.command;
      const bearerToken = row.bearer_token;
      const inputParams = this.safeParseJSON<any>(
        row.input_params,
        "入力パラメータ",
        undefined,
      );
      const args = this.safeParseJSON<any[]>(row.args, "引数", []);
      const remoteUrl = row.remote_url;

      // エンティティオブジェクトを構築
      return {
        id: row.id,
        name: row.name,
        command: command || "",
        args: args,
        env: env,
        autoStart: !!row.auto_start,
        disabled: !!row.disabled,
        serverType: row.server_type || "local",
        remoteUrl: remoteUrl || undefined,
        bearerToken: bearerToken || undefined,
        inputParams: inputParams,
        description: row.description || undefined,
        version: row.version || undefined,
        latestVersion: row.latest_version || undefined,
        verificationStatus: row.verification_status || undefined,
        required: requiredParams,
        status: "stopped",
        logs: [],
      };
    } catch (error) {
      console.error("サーバデータの変換中にエラーが発生しました1:", error);
      throw error;
    }
  }

  /**
   * エンティティのデータをJSON文字列に変換
   * @param entity サーバーエンティティ
   * @returns JSON文字列化されたデータのオブジェクト
   */
  private serializeEntityData(entity: MCPServer) {
    return {
      bearerToken: entity.bearerToken || null,
      env: JSON.stringify(entity.env || {}),
      inputParams: entity.inputParams
        ? JSON.stringify(entity.inputParams)
        : null,
      command: entity.command || null,
      args: JSON.stringify(entity.args || []),
      remoteUrl: entity.remoteUrl || null,
    };
  }

  /**
   * エンティティをDBの行に変換
   */
  protected mapEntityToRow(entity: MCPServer): Record<string, any> {
    try {
      const now = Date.now();

      // データをシリアライズ
      const { bearerToken, env, inputParams, command, args, remoteUrl } =
        this.serializeEntityData(entity);

      // DB行オブジェクトを構築
      return {
        id: entity.id,
        name: entity.name,
        // For remote servers, command can be null
        command: command,
        args: args,
        env: env,
        auto_start: entity.autoStart ? 1 : 0,
        disabled: entity.disabled ? 1 : 0,
        server_type: entity.serverType,
        remote_url: remoteUrl,
        bearer_token: bearerToken,
        input_params: inputParams,
        description: entity.description || null,
        version: entity.version || null,
        latest_version: entity.latestVersion || null,
        verification_status: entity.verificationStatus || null,
        required_params: JSON.stringify(entity.required || []),
        created_at: now,
        updated_at: now,
      };
    } catch (error) {
      console.error("サーバデータの変換中にエラーが発生しました2:", error);
      throw error;
    }
  }

  /**
   * サーバ情報を追加する
   * @param serverConfig サーバ設定情報
   * @returns 追加されたサーバ情報
   */
  public addServer(serverConfig: MCPServerConfig): MCPServer {
    try {
      const id = serverConfig.id || uuidv4();

      // MCPServerオブジェクトを作成
      const server: MCPServer = {
        ...serverConfig,
        id,
        status: "stopped",
        logs: [],
      };

      // リポジトリに追加
      this.add(server);

      return server;
    } catch (error) {
      console.error("サーバの追加中にエラーが発生しました:", error);
      throw error;
    }
  }

  /**
   * 全てのサーバ情報を取得する
   * @returns サーバ情報の配列
   */
  public getAllServers(): MCPServer[] {
    try {
      return this.getAll();
    } catch (error) {
      console.error("サーバ情報の取得中にエラーが発生しました:", error);
      throw error;
    }
  }

  /**
   * 指定されたIDのサーバ情報を取得する
   * @param id サーバID
   * @returns サーバ情報（存在しない場合はundefined）
   */
  public getServerById(id: string): MCPServer | undefined {
    try {
      return this.getById(id);
    } catch (error) {
      console.error(
        `ID: ${id} のサーバ情報の取得中にエラーが発生しました:`,
        error,
      );
      throw error;
    }
  }

  /**
   * エンティティをDBの行に変換（更新用、タイムスタンプを指定可能）
   */
  private mapEntityToRowForUpdate(
    entity: MCPServer,
    createdAt: number,
  ): Record<string, any> {
    try {
      // データをシリアライズ
      const { bearerToken, env, inputParams, command, args, remoteUrl } =
        this.serializeEntityData(entity);

      // DB行オブジェクトを構築
      return {
        id: entity.id,
        name: entity.name,
        // For remote servers, command can be null
        command: command,
        args: args,
        env: env,
        auto_start: entity.autoStart ? 1 : 0,
        disabled: entity.disabled ? 1 : 0,
        server_type: entity.serverType,
        remote_url: remoteUrl,
        bearer_token: bearerToken,
        input_params: inputParams,
        description: entity.description || null,
        version: entity.version || null,
        latest_version: entity.latestVersion || null,
        verification_status: entity.verificationStatus || null,
        required_params: JSON.stringify(entity.required || []),
        created_at: createdAt,
        updated_at: Date.now(),
      };
    } catch (error) {
      console.error("サーバデータの変換中にエラーが発生しました3:", error);
      throw error;
    }
  }

  /**
   * サーバ情報を更新する
   * @param id サーバID
   * @param config 更新するサーバ設定情報
   * @returns 更新されたサーバ情報（存在しない場合はundefined）
   */
  public updateServer(
    id: string,
    config: Partial<MCPServerConfig>,
  ): MCPServer | undefined {
    try {
      // 既存のサーバ情報を取得
      const existingServer = this.getById(id);
      if (!existingServer) {
        return undefined;
      }

      // 既存のcreatedAtを取得
      const createdAtResult = this.db.get<{ created_at: number }>(
        `SELECT created_at FROM ${this.tableName} WHERE id = :id`,
        { id },
      );
      const createdAt = createdAtResult?.created_at || Date.now();

      // 更新するフィールドを設定
      const updatedServer: MCPServer = {
        ...existingServer,
        name: config.name !== undefined ? config.name : existingServer.name,
        command:
          config.command !== undefined
            ? config.command
            : existingServer.command,
        args: config.args !== undefined ? config.args : existingServer.args,
        env: config.env !== undefined ? config.env : existingServer.env,
        autoStart:
          config.autoStart !== undefined
            ? config.autoStart
            : existingServer.autoStart,
        disabled:
          config.disabled !== undefined
            ? config.disabled
            : existingServer.disabled,
        serverType:
          config.serverType !== undefined
            ? config.serverType
            : existingServer.serverType,
        remoteUrl:
          config.remoteUrl !== undefined
            ? config.remoteUrl
            : existingServer.remoteUrl,
        bearerToken:
          config.bearerToken !== undefined
            ? config.bearerToken
            : existingServer.bearerToken,
        inputParams:
          config.inputParams !== undefined
            ? config.inputParams
            : existingServer.inputParams,
        description:
          config.description !== undefined
            ? config.description
            : existingServer.description,
        version:
          config.version !== undefined
            ? config.version
            : existingServer.version,
        latestVersion:
          config.latestVersion !== undefined
            ? config.latestVersion
            : existingServer.latestVersion,
        verificationStatus:
          config.verificationStatus !== undefined
            ? config.verificationStatus
            : existingServer.verificationStatus,
        required:
          config.required !== undefined
            ? config.required
            : existingServer.required,
      };

      // 行データを生成（同期）
      const row = this.mapEntityToRowForUpdate(updatedServer, createdAt);

      // SET句を生成
      const setClauses = Object.keys(row)
        .filter((key) => key !== "id") // IDは更新しない
        .map((key) => `${key} = :${key}`)
        .join(", ");

      // SQL文を構築
      const sql = `UPDATE ${this.tableName} SET ${setClauses} WHERE id = :id`;

      // クエリを実行
      this.db.execute(sql, row);
      return updatedServer;
    } catch (error) {
      console.error(
        `ID: ${id} のサーバ情報の更新中にエラーが発生しました:`,
        error,
      );
      throw error;
    }
  }

  /**
   * サーバ情報を削除する
   * @param id サーバID
   * @returns 削除に成功した場合はtrue、失敗した場合はfalse
   */
  public deleteServer(id: string): boolean {
    try {
      const server = this.getById(id);
      if (!server) {
        return false;
      }

      const result = this.delete(id);

      if (result) {
        console.log(`サーバ "${server.name}" が削除されました (ID: ${id})`);
      }

      return result;
    } catch (error) {
      console.error(
        `ID: ${id} のサーバ情報の削除中にエラーが発生しました:`,
        error,
      );
      throw error;
    }
  }
}

/**
 * ServerRepositoryのシングルトンインスタンスを取得
 */
let instance: ServerRepository | null = null;

export function getServerRepository(): ServerRepository {
  if (!instance) {
    // SqliteManagerのインスタンスを取得
    const db = getSqliteManager("mcprouter");
    console.log("[getServerRepository] Creating new ServerRepository instance");
    instance = new ServerRepository(db);
  }
  // ワークスペース切り替え時はresetServerRepository()が呼ばれるため、
  // ここでデータベースの変更をチェックする必要はない
  return instance;
}

/**
 * ServerRepositoryのインスタンスをリセット（ワークスペース切り替え時に使用）
 */
export function resetServerRepository(): void {
  console.log("[resetServerRepository] Resetting ServerRepository instance");
  instance = null;
}
