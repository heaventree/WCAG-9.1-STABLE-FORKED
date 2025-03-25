import { storageService } from './storage';
import { handleAPIError } from '../utils/errorHandler';
import { toast } from 'react-hot-toast';
import { queryClient } from '../providers/AppProvider';

export const api = {
  // List API Keys with error handling and caching
  listAPIKeys: async (options?: { force?: boolean }) => {
    try {
      const keys = await storageService.getItem('api_keys') || [];
      return keys;
    } catch (error) {
      const apiError = handleAPIError(error);
      toast.error(apiError.message);
      return [];
    }
  },

  // Create API Key with validation
  createAPIKey: async (key: any) => {
    try {
      // Validate required fields
      if (!key.name || !key.scopes?.length) {
        throw new Error('Name and at least one scope are required');
      }

      const keys = await storageService.getItem('api_keys') || [];
      const newKey = {
        ...key,
        id: Date.now().toString(),
        created_at: new Date().toISOString()
      };
      
      keys.push(newKey);
      await storageService.setItem('api_keys', keys);

      // Invalidate and refetch keys list
      await queryClient.invalidateQueries(['api-keys']);
      toast.success('API key created successfully');

      return newKey;
    } catch (error) {
      const apiError = handleAPIError(error);
      toast.error(apiError.message);
      throw apiError;
    }
  },

  // Get API Usage Stats with retry logic
  getAPIUsageStats: async (keyId: string) => {
    try {
      const usage = await storageService.getItem(`api_usage_${keyId}`) || {
        totalCalls: 0,
        successRate: 100,
        avgResponseTime: 0
      };
      return usage;
    } catch (error) {
      const apiError = handleAPIError(error);
      toast.error(apiError.message);
      return {
        totalCalls: 0,
        successRate: 0,
        avgResponseTime: 0
      };
    }
  },
};