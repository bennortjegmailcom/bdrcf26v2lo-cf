export class BdrApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_BDR_API_URL) ||
      (typeof process !== 'undefined' && process.env?.VITE_BDR_API_URL) ||
      '/api/v1';
  }

  private async getHeaders(): Promise<HeadersInit> {
    
    return {
      'Content-Type': 'application/json',

    };
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers = await this.getHeaders();
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      credentials: 'same-origin',
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as { error?: { message?: string } };
      throw new Error(errorData.error?.message || `API Error: ${response.statusText}`);
    }

    const json = await response.json() as { data: T };
    return json.data;
  }
}
