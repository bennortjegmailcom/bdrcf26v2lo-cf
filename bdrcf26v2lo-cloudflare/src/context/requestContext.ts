import { AsyncLocalStorage } from 'async_hooks';

export interface RequestContextData {
  env?: any;
}

export const requestContext = new AsyncLocalStorage<RequestContextData>();
