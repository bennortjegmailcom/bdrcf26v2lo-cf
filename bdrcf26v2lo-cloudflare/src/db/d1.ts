import { requestContext } from '../context/requestContext';
export interface D1Statement {
  bind(...args: any[]): D1Statement;
  all(): Promise<{ results: any[] }>;
  first(): Promise<any>;
  run(): Promise<any>;
}
export interface D1DatabaseAdapter { prepare(query: string): D1Statement; }
let localDatabase: (() => D1DatabaseAdapter) | undefined;
export function setLocalDatabase(factory: () => D1DatabaseAdapter) { localDatabase = factory; }
export function getDb(env?: any): D1DatabaseAdapter {
  const bindings = env || requestContext.getStore()?.env;
  if (bindings?.DB) return bindings.DB;
  if (localDatabase && !requestContext.getStore()?.env) return localDatabase();
  throw new Error('DB binding is missing. Configure Cloudflare D1 and apply migrations.');
}
