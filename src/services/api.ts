import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { Submission, FormField, PaginationType, ColumnConfig } from '../types';

// API Response interfaces
interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
}

interface SubmissionsResponse {
  submissions: Submission[];
  total: number;
  pages: number;
}

interface FormsResponse {
  forms: Array<{ id: string; title: string }>;
}

interface FormFieldsResponse {
  fields: FormField[];
}

interface SettingsResponse {
  settings: Record<string, any>;
}

interface ColumnConfigResponse {
  column_config: ColumnConfig[];
}

interface ExportResponse {
  csv_data: string;
}

class WordPressApiService {
  private axiosInstance: AxiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: '/wp-admin/admin-ajax.php',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

  // Response interceptor for error handling
  this.axiosInstance.interceptors.response.use(
    (response: AxiosResponse) => response,
    (error: any) => {
      return Promise.reject(error);
    }
  );
  }

  // Generic method to make POST requests
  private async post<T = any>(
    action: string,
    data: Record<string, any> = {}
  ): Promise<ApiResponse<T>> {
    if (!window.cf7dba_ajax) {
      throw new Error('WordPress AJAX configuration not found. Please ensure the plugin is properly loaded.');
    }
    if (!window.cf7dba_ajax.nonce) {
      throw new Error('WordPress nonce not found. Please refresh the page and try again.');
    }

    const formData = new URLSearchParams({
      action,
      ...data,
    });
    formData.append('nonce', window.cf7dba_ajax.nonce);

    const response = await this.axiosInstance.post('', formData);
    return response.data;
  }

  // Forms API methods
  async getForms(): Promise<Array<{ id: string; title: string }>> {
    const response = await this.post<FormsResponse>('cf7dba_get_forms');
    
    if (response.success) {
      // Handle different response structures
      if (response.data.forms) {
        return response.data.forms;
      } else if (Array.isArray(response.data)) {
        return response.data;
      } else {
        throw new Error('Unexpected response structure from server');
      }
    } else {
      const errorMsg = response.message || (response.data as any)?.message || 'Failed to fetch forms';
      throw new Error(errorMsg);
    }
  }

  async getFormFields(formId: string): Promise<FormField[]> {
    const response = await this.post<FormFieldsResponse>('cf7dba_get_form_fields', {
      form_id: formId,
    });
    if (response.success && response.data.fields) {
      return response.data.fields;
    }
    throw new Error(response.message || 'Failed to fetch form fields');
  }

  // Submissions API methods
  async getSubmissions(params: {
    form_id: string;
    page: number;
    per_page: number;
    search?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<{ submissions: Submission[]; pagination: PaginationType }> {
    const response = await this.post<SubmissionsResponse>('cf7dba_get_submissions', params);
    
    if (response.success) {
      return {
        submissions: response.data.submissions || [],
        pagination: {
          current: params.page,
          pageSize: params.per_page,
          total: response.data.total || 0,
        },
      };
    }
    throw new Error(response.message || 'Failed to fetch submissions');
  }

  async deleteSubmission(submissionId: number): Promise<void> {
    const response = await this.post('cf7dba_delete_submission', {
      submission_id: submissionId.toString(),
    });
    
    if (!response.success) {
      throw new Error(response.message || 'Failed to delete submission');
    }
  }

  // Settings API methods
  async getSettings(): Promise<Record<string, any>> {
    const response = await this.post<SettingsResponse>('cf7dba_get_settings');
    if (response.success && response.data.settings) {
      return response.data.settings;
    }
    throw new Error(response.message || 'Failed to fetch settings');
  }

  async saveSettings(settings: Record<string, any>): Promise<void> {
    const settingsData = Object.fromEntries(
      Object.entries(settings).map(([key, value]) => [`settings[${key}]`, value])
    );

    const response = await this.post('cf7dba_save_settings', settingsData);
    if (!response.success) {
      throw new Error(response.message || 'Failed to save settings');
    }
  }

  // Column configuration API methods
  async getColumnConfig(formId: string): Promise<ColumnConfig[]> {
    const response = await this.post<ColumnConfigResponse>('cf7dba_get_column_config', {
      form_id: formId,
    });
    
    if (response.success && response.data.column_config) {
      return response.data.column_config;
    }
    return [];
  }

  async saveColumnConfig(formId: string, columnConfig: ColumnConfig[]): Promise<void> {
    const response = await this.post('cf7dba_save_column_config', {
      form_id: formId,
      column_config: JSON.stringify(columnConfig),
    });
    
    if (!response.success) {
      throw new Error(response.message || 'Failed to save column configuration');
    }
  }

  // Export API methods
  async exportCSV(params: {
    form_id: string;
    start_date?: string;
    end_date?: string;
  }): Promise<string> {
    const response = await this.post<ExportResponse>('cf7dba_export_csv', params);
    
    if (response.success && response.data.csv_data) {
      return response.data.csv_data;
    }
    throw new Error(response.message || 'Failed to export CSV');
  }

  // Migration API methods
  async checkMigration(): Promise<{
    cfdb7_exists: boolean;
    cfdb7_count: number;
    progress: {
      cfdb7_total: number;
      leadsync_total: number;
      progress_percentage: number;
    };
  }> {
    const response = await this.post<{
      cfdb7_exists: boolean;
      cfdb7_count: number;
      progress: {
        cfdb7_total: number;
        leadsync_total: number;
        progress_percentage: number;
      };
    }>('cf7dba_check_migration', {});
    return response.data;
  }

  async migrateData(params: {
    batch_size: number;
    offset: number;
  }): Promise<{
    success: boolean;
    migrated: number;
    total: number;
    errors: string[];
    has_more: boolean;
    message?: string;
  }> {
    const response = await this.post<{
      success: boolean;
      migrated: number;
      total: number;
      errors: string[];
      has_more: boolean;
      message?: string;
    }>('cf7dba_migrate_data', params);
    return response.data;
  }

  async exportCFDB7Backup(): Promise<{ filepath: string; filename?: string }> {
    const response = await this.post<{ filepath: string; filename?: string }>('cf7dba_export_cfdb7_backup', {});
    return response.data;
  }

  async cleanupCFDB7(): Promise<void> {
    await this.post('cf7dba_cleanup_cfdb7', {});
  }

  // Utility method to check if user has manage options permission
  hasManageOptionsPermission(): boolean {
    return window.cf7dba_ajax?.canManageOptions || false;
  }

  // Method to get current nonce
  getNonce(): string {
    return window.cf7dba_ajax?.nonce || '';
  }

}

// Create and export a singleton instance
export const apiService = new WordPressApiService();

// Export the class for testing purposes
export { WordPressApiService };

// Export types for use in components
export type {
  ApiResponse,
  SubmissionsResponse,
  FormsResponse,
  FormFieldsResponse,
  SettingsResponse,
  ColumnConfigResponse,
  ExportResponse,
};
