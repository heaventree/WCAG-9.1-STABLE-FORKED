export interface APIKey {
  id: string;
  user_id: string;
  name: string;
  key: string;
  scopes: string[];
  last_used?: string;
  expires_at?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface APILog {
  id: string;
  api_key_id: string;
  endpoint: string;
  method: string;
  status_code: number;
  response_time: number;
  created_at: string;
}

export interface Webhook {
  id: string;
  user_id: string;
  url: string;
  events: string[];
  secret: string;
  is_active: boolean;
  last_triggered?: string;
  created_at: string;
  updated_at: string;
}

export interface APIError {
  code: string;
  message: string;
  details?: unknown;
}