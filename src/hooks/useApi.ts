import { useState, useCallback, useEffect } from 'react';
import { apiService } from '../services/api';
import { Submission, FormField, PaginationType } from '../types';

// Custom hook for API calls with loading states and error handling
export const useApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generic method to handle API calls with loading and error states
  const executeApiCall = useCallback(async <T>(
    apiCall: () => Promise<T>,
    showLoading: boolean = true
  ): Promise<T | null> => {
    if (showLoading) {
      setLoading(true);
    }
    setError(null);

    try {
      const result = await apiCall();
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      // Error logging handled by error handling system
      return null;
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, []);

  // Forms API hooks
  const getForms = useCallback(async () => {
    return executeApiCall(() => apiService.getForms());
  }, [executeApiCall]);

  const getFormFields = useCallback(async (formId: string) => {
    return executeApiCall(() => apiService.getFormFields(formId));
  }, [executeApiCall]);

  // Submissions API hooks
  const getSubmissions = useCallback(async (params: {
    form_id: string;
    page: number;
    per_page: number;
    search?: string;
    start_date?: string;
    end_date?: string;
  }) => {
    return executeApiCall(() => apiService.getSubmissions(params));
  }, [executeApiCall]);

  const deleteSubmission = useCallback(async (submissionId: number) => {
    return executeApiCall(() => apiService.deleteSubmission(submissionId));
  }, [executeApiCall]);

  // Settings API hooks
  const getSettings = useCallback(async () => {
    return executeApiCall(() => apiService.getSettings());
  }, [executeApiCall]);

  const saveSettings = useCallback(async (settings: Record<string, any>) => {
    return executeApiCall(() => apiService.saveSettings(settings));
  }, [executeApiCall]);

  // Column configuration API hooks
  const getColumnConfig = useCallback(async (formId: string) => {
    return executeApiCall(() => apiService.getColumnConfig(formId));
  }, [executeApiCall]);

  const saveColumnConfig = useCallback(async (formId: string, columnConfig: Array<{
    key: string;
    title: string;
    visible: boolean;
    order: number;
    width?: number;
    isMetadata?: boolean;
  }>) => {
    return executeApiCall(() => apiService.saveColumnConfig(formId, columnConfig));
  }, [executeApiCall]);

  // Export API hooks
  const exportCSV = useCallback(async (params: {
    form_id: string;
    start_date?: string;
    end_date?: string;
  }) => {
    return executeApiCall(() => apiService.exportCSV(params));
  }, [executeApiCall]);

  // Migration API hooks
  const checkMigration = useCallback(async () => {
    return executeApiCall(() => apiService.checkMigration());
  }, [executeApiCall]);

  const migrateData = useCallback(async (params: {
    batch_size: number;
    offset: number;
  }) => {
    return executeApiCall(() => apiService.migrateData(params));
  }, [executeApiCall]);

  const exportCFDB7Backup = useCallback(async () => {
    return executeApiCall(() => apiService.exportCFDB7Backup());
  }, [executeApiCall]);

  const cleanupCFDB7 = useCallback(async () => {
    return executeApiCall(() => apiService.cleanupCFDB7());
  }, [executeApiCall]);

  // Utility methods
  const hasManageOptionsPermission = useCallback(() => {
    return apiService.hasManageOptionsPermission();
  }, []);

  const getNonce = useCallback(() => {
    return apiService.getNonce();
  }, []);

  // Clear error method
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // State
    loading,
    error,
    
    // API methods
    getForms,
    getFormFields,
    getSubmissions,
    deleteSubmission,
    getSettings,
    saveSettings,
    getColumnConfig,
    saveColumnConfig,
    exportCSV,
    
    // Migration methods
    checkMigration,
    migrateData,
    exportCFDB7Backup,
    cleanupCFDB7,
    
    // Utility methods
    hasManageOptionsPermission,
    getNonce,
    clearError,
  };
};

// Hook for managing form data with automatic loading states
export const useFormData = (formId: string | null) => {
  const { getFormFields, loading, error } = useApi();
  const [formFields, setFormFields] = useState<FormField[]>([]);

  const loadFormFields = useCallback(async () => {
    if (!formId) {
      setFormFields([]);
      return;
    }

    const fields = await getFormFields(formId);
    if (fields) {
      setFormFields(fields);
    }
  }, [formId, getFormFields]);

  // Automatically load form fields when formId changes
  useEffect(() => {
    loadFormFields();
  }, [loadFormFields]);

  return {
    formFields,
    loadFormFields,
    loading,
    error,
  };
};

// Hook for managing submissions with pagination
export const useSubmissions = (formId: string | null, pagination: PaginationType, searchQuery?: string, dateRange?: [string, string] | null) => {
  const { getSubmissions, loading, error } = useApi();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [total, setTotal] = useState(0);

  const loadSubmissions = useCallback(async () => {
    if (!formId) {
      setSubmissions([]);
      setTotal(0);
      return;
    }

    const params = {
      form_id: formId,
      page: pagination.current,
      per_page: pagination.pageSize,
      search: searchQuery || '',
      start_date: dateRange?.[0] || '',
      end_date: dateRange?.[1] || '',
    };

    const result = await getSubmissions(params);
    if (result) {
      setSubmissions(result.submissions);
      setTotal(result.pagination.total);
    }
  }, [formId, pagination, searchQuery, dateRange, getSubmissions]);

  // Automatically load submissions when dependencies change
  useEffect(() => {
    loadSubmissions();
  }, [loadSubmissions]);

  return {
    submissions,
    total,
    loadSubmissions,
    loading,
    error,
  };
};
