import type { Pool, PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";

export function getPool(): Pool;
export function query<T extends RowDataPacket = RowDataPacket>(sql: string, parameters?: unknown[]): Promise<T[]>;
export function execute(sql: string, parameters?: unknown[]): Promise<ResultSetHeader>;
export function withTransaction<T>(work: (connection: PoolConnection) => Promise<T>): Promise<T>;
export function ping(): Promise<void>;