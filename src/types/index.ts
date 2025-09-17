export interface Submission {
  id: number;
  form_id?: string;
  form_title?: string;
  contactNumber?: string;
  name?: string;
  userId?: string;
  ip?: string;
  address?: string;
  message1?: string;
  message2?: string;
  message3?: string;
  time?: string;
  form_data?: Record<string, any>;
  submit_ip?: string;
  submit_datetime?: string;
  submit_user_id?: string;
}

export interface ContactForm {
  id: number;
  title: string;
}

export interface PaginationType {
  current: number;
  pageSize: number;
  total: number;
}

export interface TableSettings {
  bordered: boolean;
  title: boolean;
  columnHeader: boolean;
  expandable: boolean;
  fixedHeader: boolean;
  ellipsis: boolean;
  footer: boolean;
  checkbox: boolean;
  size: 'small' | 'middle' | 'default';
  tableScroll: 'scroll' | 'fixed';
  pagination: string;
}

export interface ColumnSetting {
  key: string;
  displayName: string;
  visible: boolean;
}

export interface FormField {
  name: string;
  type: string;
  label: string;
}

export interface ColumnConfig {
  key: string;
  title: string;
  visible: boolean;
  order: number;
  width?: number;
  isMetadata?: boolean;
}

export interface ColumnSettings {
  columns: ColumnConfig[];
  showMetadata: boolean;
}

// Window interface extensions
declare global {
  // eslint-disable-next-line no-unused-vars
  interface Window {
    cf7dba_ajax?: {
      ajax_url: string;
      nonce: string;
      rest_url: string;
      rest_nonce: string;
      canManageOptions?: boolean;
    };
  }
}
