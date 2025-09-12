import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Table, Button, Space, Pagination, Select, Typography, Row, Col, message, ConfigProvider } from 'antd';
import { SettingOutlined, EditOutlined, EyeOutlined, DeleteOutlined, ColumnHeightOutlined, PlusOutlined, MinusOutlined } from '@ant-design/icons';
import { Submission, PaginationType, FormField, ColumnConfig, TableSettings } from '../../types';
import ColumnSettingsModal from '../modals/ColumnSettingsModal';
import TableSettingsModal from '../modals/TableSettingsModal';
import SubmissionDetailModal from '../modals/SubmissionDetailModal';
import ColumnManagerModal from '../modals/ColumnManagerModal';
import { DeleteConfirmationModal, toast } from '../ui/shared';
import { useApi } from '../../hooks/useApi';

const { Text: TypographyText } = Typography;

interface SubmissionsTableProps {
  submissions: Submission[];
  loading: boolean;
  pagination: PaginationType;
  formFields: FormField[];
  onPaginationChange: (_pagination: PaginationType) => void;
  onRefresh?: () => void;
  formId?: string;
  tableSettings: TableSettings;
  onTableSettingsChange: (_settings: TableSettings) => void;
}

const SubmissionsTable: React.FC<SubmissionsTableProps> = ({
  submissions,
  loading,
  pagination: _pagination,
  formFields,
  onPaginationChange,
  onRefresh,
  formId,
  tableSettings,
  onTableSettingsChange
}) => {
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [columnSettingsVisible, setColumnSettingsVisible] = useState(false);
  const [tableSettingsVisible, setTableSettingsVisible] = useState(false);
  const [submissionDetailVisible, setSubmissionDetailVisible] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [submissionToDelete, setSubmissionToDelete] = useState<Submission | null>(null);
  const [columnManagerVisible, setColumnManagerVisible] = useState(false);
  const [columns, setColumns] = useState<ColumnConfig[]>([]);
  const [bulkDeleteVisible, setBulkDeleteVisible] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // API hooks
  const { getColumnConfig, saveColumnConfig, deleteSubmission: apiDeleteSubmission } = useApi();
  const [sortField, setSortField] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'ascend' | 'descend' | undefined>(undefined);

  // Load column configuration from database
  const loadColumnConfig = useCallback(async () => {
    if (!formId) return;

    const columnConfig = await getColumnConfig(formId);
    if (columnConfig && columnConfig.length > 0) {
      // Loading column config from database
      setColumns(columnConfig);
    } else {
      // No column config found in database, will use defaults
    }
  }, [formId, getColumnConfig]);

  // Save column configuration to database
  const saveColumnConfigToDb = useCallback(async (columnConfig: ColumnConfig[]) => {
    if (!formId) return;

    try {
      await saveColumnConfig(formId, columnConfig);
      message.success('Column configuration saved successfully');
    } catch (error) {
      // Failed to save column config
      message.error('Failed to save column configuration');
    }
  }, [formId, saveColumnConfig]);

  // Load column configuration when formId changes or component mounts
  useEffect(() => {
    if (formId) {
      // Clear existing columns first
      setColumns([]);
      loadColumnConfig();
    }
  }, [formId, loadColumnConfig]);

  const generateDefaultColumns = useCallback((formFields: FormField[]): ColumnConfig[] => {
    const cols: ColumnConfig[] = [
      {
        key: 'id',
        title: 'ID',
        visible: true,
        order: 0,
        width: 100,
        isMetadata: true
      }
    ];

    // Add form fields
    formFields.forEach((field, index) => {
      cols.push({
        key: field.name,
        title: field.label || field.name.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        visible: true,
        order: index + 1,
        width: 150
      });
    });

    // Add essential metadata
    cols.push(
      {
        key: 'submit_ip',
        title: 'Submit IP',
        visible: false,
        order: cols.length,
        width: 120,
        isMetadata: true
      },
      {
        key: 'submit_datetime',
        title: 'Submit Time',
        visible: true,
        order: cols.length + 1,
        width: 150,
        isMetadata: true
      },
      {
        key: 'submit_user_id',
        title: 'User ID',
        visible: false,
        order: cols.length + 2,
        width: 100,
        isMetadata: true
      }
    );

    return cols;
  }, []);

  // Generate default columns when formFields change
  useEffect(() => {
    if (formFields.length > 0) {
      const defaultColumns = generateDefaultColumns(formFields);
      setColumns(defaultColumns);
    }
  }, [formFields, generateDefaultColumns]);

  // Helper function to get pagination alignment
  const getPaginationJustify = (position: string): 'start' | 'center' | 'end' => {
    if (position.includes('Left')) return 'start';
    if (position.includes('Center')) return 'center';
    if (position.includes('Right')) return 'end';
    return 'center'; // default
  };

  // Helper function to check if pagination should be shown
  const shouldShowPagination = (position: string) => {
    return position && position !== 'None' && position !== 'none' && position !== '';
  };

  // Handle table sorting
  const handleTableChange = (_pagination: any, _filters: any, sorter: any) => {
    if (sorter && sorter.field) {
      setSortField(sorter.field);
      setSortOrder(sorter.order);
    } else {
      setSortField('');
      setSortOrder(undefined);
    }
  };

  // Memoized sorted submissions
  const sortedSubmissions = useMemo(() => {
    if (!sortField || !sortOrder) {
      return submissions;
    }

    return [...submissions].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      // Get values based on field type
      if (sortField === 'id') {
        aValue = a.id;
        bValue = b.id;
      } else if (sortField === 'submit_datetime') {
        aValue = a.submit_datetime || a.time;
        bValue = b.submit_datetime || b.time;
      } else if (sortField === 'submit_user_id') {
        aValue = a.submit_user_id;
        bValue = b.submit_user_id;
      } else {
        // For form fields, get from form_data
        aValue = a.form_data?.[sortField] || '';
        bValue = b.form_data?.[sortField] || '';
      }

      // Handle null/undefined values
      if (aValue == null) aValue = '';
      if (bValue == null) bValue = '';

      // Convert to appropriate types for comparison
      if (sortField === 'id' || sortField === 'submit_user_id') {
        aValue = Number(aValue) || 0;
        bValue = Number(bValue) || 0;
      } else if (sortField === 'submit_datetime') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      } else {
        aValue = String(aValue).toLowerCase();
        bValue = String(bValue).toLowerCase();
      }

      // Compare values
      if (aValue < bValue) {
        return sortOrder === 'ascend' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortOrder === 'ascend' ? 1 : -1;
      }
      return 0;
    });
  }, [submissions, sortField, sortOrder]);

  const handleExpand = useCallback((expanded: boolean, record: Submission) => {
    setExpandedRows(prev => {
      const newExpandedRows = new Set(prev);
    if (expanded) {
      newExpandedRows.add(record.id);
    } else {
      newExpandedRows.delete(record.id);
    }
      return newExpandedRows;
    });
  }, []);

  const handleView = useCallback((record: Submission) => {
    setSelectedSubmission(record);
    setSubmissionDetailVisible(true);
  }, []);

  const handleEdit = useCallback((_record: Submission) => {
    // Implement edit functionality
    toast.info('Edit functionality coming soon');
  }, []);

  const handleDelete = useCallback((record: Submission) => {
    setSubmissionToDelete(record);
    setDeleteConfirmVisible(true);
  }, []);

  // Consolidated delete function
  const deleteSubmission = useCallback(async (submission: Submission, showToast: boolean = true): Promise<void> => {
    try {
      await apiDeleteSubmission(submission.id);
      if (showToast) {
        toast.success('Submission deleted successfully');
      }
      onRefresh?.();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete submission';
      if (errorMessage.includes('permission') || errorMessage.includes('Permission')) {
        if (showToast) {
          message.warning('You do not have permission to delete submissions');
        }
      } else {
        // Failed to delete submission
        if (showToast) {
          message.error(errorMessage);
        }
      }
    }
  }, [onRefresh, apiDeleteSubmission]);

  const handleDeleteSubmission = useCallback(async (submission: Submission): Promise<void> => {
    try {
      await deleteSubmission(submission);
      setSubmissionDetailVisible(false);
    } catch (error) {
      // Error is already logged in deleteSubmission
      // Delete operation failed
    }
  }, [deleteSubmission]);

  const handleColumnSave = useCallback((newColumns: ColumnConfig[]) => {
    setColumns(newColumns);
    // Only save to database if user has manage_options permission (admin only)
    if (window.cf7dba_ajax?.canManageOptions) {
      saveColumnConfigToDb(newColumns);
    }
  }, [saveColumnConfigToDb]);

  const handleTableSettingsSave = useCallback((newSettings: TableSettings) => {
    onTableSettingsChange(newSettings);
  }, [onTableSettingsChange]);

  const confirmDelete = useCallback(async () => {
    if (submissionToDelete) {
      await deleteSubmission(submissionToDelete);
      setDeleteConfirmVisible(false);
      setSubmissionToDelete(null);
    }
  }, [submissionToDelete, deleteSubmission]);

  // Bulk delete function
  const handleBulkDelete = useCallback(async () => {
    if (selectedRowKeys.length === 0) return;
    
    setBulkDeleting(true);
    try {
      const deletePromises = selectedRowKeys.map(async (id) => {
        const submission = submissions.find(s => s.id === id);
        if (submission) {
          try {
            await apiDeleteSubmission(submission.id);
            return { success: true, id };
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const isPermissionError = errorMessage.includes('permission') || errorMessage.includes('Permission');
            // Failed to delete submission
            return { success: false, id, error: errorMessage, isPermissionError };
          }
        }
        return { success: false, id, error: 'Submission not found' };
      });
      
      const results = await Promise.allSettled(deletePromises);
      
      // Count successful and failed deletions
      const successful = results.filter(result => 
        result.status === 'fulfilled' && result.value.success
      ).length;
      
      const failed = results.length - successful;
      
      // Check if any failures were due to permission errors
      const permissionErrors = results.filter(result => 
        result.status === 'fulfilled' && 
        result.value.success === false && 
        result.value.isPermissionError
      ).length;
      
      // Clear selection and close modal
      setSelectedRowKeys([]);
      setBulkDeleteVisible(false);
      
      // Refresh table data if any deletions were successful
      if (successful > 0) {
        onRefresh?.();
      }
      
      // Show appropriate message
      if (successful === 0) {
        if (permissionErrors > 0) {
          message.warning('You do not have permission to delete submissions');
        } else {
          message.error('Failed to delete any submissions');
        }
      } else if (failed > 0) {
        if (permissionErrors > 0) {
          message.warning(`Deleted ${successful} submission(s), ${failed} failed due to permission restrictions`);
        } else {
          message.warning(`Deleted ${successful} submission(s), ${failed} failed`);
        }
      }
      // No success message for bulk delete - silent success
    } catch (error) {
      // Bulk delete failed
      message.error('Bulk delete operation failed');
    } finally {
      setBulkDeleting(false);
    }
  }, [selectedRowKeys, submissions, onRefresh, apiDeleteSubmission]);

  const handleBulkDeleteClick = useCallback(() => {
    if (selectedRowKeys.length === 0) {
      toast.warning('Please select submissions to delete');
      return;
    }
    setBulkDeleteVisible(true);
  }, [selectedRowKeys]);

  // Memoized table columns
  const tableColumns = useMemo(() => [
    // Dynamic columns based on column config
    ...columns
      .filter(col => col.visible)
      .sort((a, b) => a.order - b.order)
      .map(col => {
        // Determine if column should be sortable
        const isSortable = (key: string) => {
          // Only allow sorting for specific columns
          const sortableColumns = ['id', 'submit_datetime', 'submit_user_id'];
          return sortableColumns.includes(key);
        };

        const baseColumn = {
          title: col.title,
          dataIndex: col.key,
          key: col.key,
          width: col.width,
          ellipsis: tableSettings.ellipsis,
          sorter: isSortable(col.key)
        };

        // Add custom render functions for specific columns
        if (col.key === 'id') {
          return {
            ...baseColumn,
            render: (value: string, record: Submission) => {
              return value || record.id || '-';
            }
          };
        }

        if (col.key === 'submit_datetime' || col.key === 'time') {
          return {
            ...baseColumn,
            render: (value: string, record: Submission) => {
              const dateValue = value || record.submit_datetime || record.time;
              return dateValue ? new Date(dateValue).toLocaleString() : '-';
            }
          };
        }

        if (col.key === 'submit_ip') {
          return {
            ...baseColumn,
            render: (value: string, record: Submission) => {
              return value || record.submit_ip || '-';
            }
          };
        }

        if (col.key === 'submit_user_id') {
          return {
            ...baseColumn,
            render: (value: string, record: Submission) => {
              return value || record.submit_user_id || '-';
            }
          };
        }

        // For form fields, add custom render logic
        if (!col.isMetadata && col.key !== 'id') {
          return {
            ...baseColumn,
            render: (_: any, record: Submission) => {
              // Try to get value from form_data first
              if (record.form_data && record.form_data[col.key]) {
                const fieldValue = record.form_data[col.key];
                if (Array.isArray(fieldValue)) {
                  return fieldValue.join(', ');
                }
                return typeof fieldValue === 'string' && fieldValue.length > 50 
                  ? fieldValue.substring(0, 50) + '...' 
                  : fieldValue || '-';
              }
              
              // Try alternative field name variations
              const alternativeKeys = [
                col.key,
                col.key.replace(/-/g, '_'),
                col.key.replace(/_/g, '-'),
                col.key.toLowerCase(),
                col.key.toUpperCase()
              ];
              
              for (const altKey of alternativeKeys) {
                if (record.form_data && record.form_data[altKey]) {
                  const fieldValue = record.form_data[altKey];
                  if (Array.isArray(fieldValue)) {
                    return fieldValue.join(', ');
                  }
                  return typeof fieldValue === 'string' && fieldValue.length > 50 
                    ? fieldValue.substring(0, 50) + '...' 
                    : fieldValue || '-';
                }
              }
              
              // Fallback to extracted fields for backward compatibility
              const fallbackMap: Record<string, string> = {
                'contact_number': record.contactNumber || '',
                'phone': record.contactNumber || '',
                'telephone': record.contactNumber || '',
                'mobile': record.contactNumber || '',
                'name': record.name || '',
                'full_name': record.name || '',
                'first_name': record.name || '',
                'address': record.address || '',
                'message': record.message1 || '',
                'comment': record.message1 || '',
                'subject': record.message2 || '',
                'topic': record.message2 || ''
              };
              
              const fallbackValue = fallbackMap[col.key] || '-';
              return typeof fallbackValue === 'string' && fallbackValue.length > 50 
                ? fallbackValue.substring(0, 50) + '...' 
                : fallbackValue;
            }
          };
        }

        return baseColumn;
      }),
    {
      title: 'ACTION',
      key: 'action',
      width: 120,
      render: (_: any, record: Submission) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            size="small"
          />
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => handleView(record)}
            size="small"
          />
          <Button
            type="text"
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record)}
            size="small"
            danger
          />
        </Space>
      )
    }
  ], [columns, tableSettings.ellipsis, handleEdit, handleView, handleDelete]);

  // Memoized styles
  const expandedRowStyles = useMemo(() => ({
    container: { 
      padding: '20px', 
      backgroundColor: '#fafafa',
      borderRadius: '8px',
      border: '1px solid #e8e8e8',
      margin: '8px 0'
    },
    sectionTitle: { 
      fontSize: '16px', 
      marginBottom: '16px', 
      display: 'block',
      color: '#262626',
      fontWeight: 600
    },
    metadataGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '12px',
      marginBottom: '20px'
    },
    metadataItem: {
      backgroundColor: '#fff',
      padding: '12px',
      borderRadius: '6px',
      border: '1px solid #e8e8e8'
    },
    metadataLabel: {
      display: 'block',
      fontSize: '11px',
      color: '#8c8c8c',
      marginBottom: '4px',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.5px',
      fontWeight: 600
    },
    metadataValue: {
      fontSize: '14px',
      color: '#262626',
      fontWeight: 500,
      wordBreak: 'break-word' as const
    },
    formDataGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: '12px',
      marginBottom: '20px'
    },
    formDataItem: {
      backgroundColor: '#fff',
      padding: '12px',
      borderRadius: '6px',
      border: '1px solid #e8e8e8',
      minHeight: '60px'
    },
    formDataLabel: {
      display: 'block',
      fontSize: '11px',
      color: '#8c8c8c',
      marginBottom: '6px',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.5px',
      fontWeight: 600
    },
    formDataValue: {
      fontSize: '14px',
      color: '#262626',
      lineHeight: '1.4',
      wordBreak: 'break-word' as const,
      minHeight: '20px'
    },
    actionRow: { 
      marginTop: '20px',
      paddingTop: '16px',
      borderTop: '1px solid #e8e8e8',
      textAlign: 'center' as const
    },
    actionButton: {
      borderRadius: '6px',
      fontWeight: 500,
      height: '32px',
      padding: '4px 16px',
      margin: '0 4px'
    }
  }), []);

  const expandedRowRender = useCallback((record: Submission) => {
    // Get form data
    const formData = record.form_data || {};
    
    // Filter columns based on column configuration
    const visibleColumns = columns.filter(col => col.visible);
    
    // Get metadata columns that are visible
    const metadataColumns = visibleColumns.filter(col => col.isMetadata);
    
    // Get form field columns that are visible
    const formFieldColumns = visibleColumns.filter(col => !col.isMetadata && col.key !== 'id');
    
    return (
    <div style={expandedRowStyles.container}>
        {/* Submission Metadata */}
        <TypographyText style={expandedRowStyles.sectionTitle}>
          Submission Details
        </TypographyText>
        
        <div style={expandedRowStyles.metadataGrid}>
          {metadataColumns.map(col => {
            let value = '-';
            const label = col.title;
            
            // Get value based on column key
            if (col.key === 'id') {
              value = String(record.id);
            } else if (col.key === 'submit_ip') {
              value = record.submit_ip || '-';
            } else if (col.key === 'submit_user_id') {
              value = record.submit_user_id || '-';
            } else if (col.key === 'submit_datetime') {
              value = record.submit_datetime ? new Date(record.submit_datetime).toLocaleString() : '-';
            } else if (col.key === 'form_id') {
              value = record.form_id || '-';
            }
            
            return (
              <div key={col.key} style={expandedRowStyles.metadataItem}>
                <span style={expandedRowStyles.metadataLabel}>{label}</span>
                <div style={expandedRowStyles.metadataValue}>{value}</div>
              </div>
            );
          })}
        </div>
        
        {/* Form Data Fields */}
        {Object.keys(formData).length > 0 && (
          <>
            <TypographyText style={expandedRowStyles.sectionTitle}>
              Form Data
            </TypographyText>
            
            <div style={expandedRowStyles.formDataGrid}>
              {Object.entries(formData).map(([key, value]) => {
                // Check if this field should be shown based on column configuration
                const shouldShow = formFieldColumns.some(col => {
                  // Direct match
                  if (col.key === key) return true;
                  
                  // Try alternative field name variations
                  const alternativeKeys = [
                    col.key,
                    col.key.replace(/-/g, '_'),
                    col.key.replace(/_/g, '-'),
                    col.key.toLowerCase(),
                    col.key.toUpperCase()
                  ];
                  
                  return alternativeKeys.includes(key);
                });
                
                // Only show if it should be displayed based on column config
                if (!shouldShow) return null;
                
                return (
                  <div key={key} style={expandedRowStyles.formDataItem}>
                    <span style={expandedRowStyles.formDataLabel}>
                      {key.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                    <div style={expandedRowStyles.formDataValue}>
                      {Array.isArray(value) ? value.join(', ') : String(value || '-')}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
        
        {/* Action Buttons */}
        <div style={expandedRowStyles.actionRow}>
          <Space size="middle">
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
              style={expandedRowStyles.actionButton}
            >
              Edit
            </Button>
            <Button
              type="default"
              icon={<EyeOutlined />}
              onClick={() => handleView(record)}
              style={expandedRowStyles.actionButton}
            >
              View Details
            </Button>
            <Button
              type="primary"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record)}
              style={expandedRowStyles.actionButton}
            >
              Delete
            </Button>
          </Space>
        </div>
    </div>
  );
  }, [expandedRowStyles, handleEdit, handleView, handleDelete, columns]);

  // Memoized expanded row keys array
  const expandedRowKeysArray = useMemo(() => Array.from(expandedRows), [expandedRows]);

  // Memoized styles
  const controlStyles = useMemo(() => ({
    topControls: { marginBottom: '16px', padding: '0 8px' },
    itemCount: { fontSize: '14px', color: '#8c8c8c' },
    pageSizeSelect: { width: 120 },
    button: { 
      height: '36px',
      borderRadius: '6px',
      border: '1px solid #d9d9d9',
      backgroundColor: 'white'
    }
  }), []);

  // Memoized options
  const pageSizeOptions = useMemo(() => [
    { value: 15, label: '15 / page' },
    { value: 25, label: '25 / page' },
    { value: 50, label: '50 / page' }
  ], []);

  return (
    <ConfigProvider>
    <div className="submissions-table">
        {/* Message Container */}
        <div id="antd-message-container" style={{ position: 'fixed', top: '24px', left: '50%', transform: 'translateX(-50%)', zIndex: 9999 }}></div>
      {/* Top Controls */}
      <Row justify="space-between" align="middle" style={controlStyles.topControls}>
        <Col>
          <Space size="middle" align="center">
            <TypographyText style={controlStyles.itemCount}>
              Show {_pagination.pageSize} items of {_pagination.total}
            </TypographyText>
            <Select
              value={_pagination.pageSize}
              onChange={(pageSize) => onPaginationChange({ ..._pagination, pageSize })}
              style={controlStyles.pageSizeSelect}
              options={pageSizeOptions}
            />
          </Space>
        </Col>
        
        <Col>
          <Space size="middle">
            {selectedRowKeys.length > 0 && (
              <Button
                icon={<DeleteOutlined />}
                onClick={handleBulkDeleteClick}
                danger
                style={{
                  ...controlStyles.button,
                  backgroundColor: '#ff4d4f',
                  borderColor: '#ff4d4f',
                  color: '#fff'
                }}
              >
                Delete Selected ({selectedRowKeys.length})
              </Button>
            )}
            <Button
              icon={<ColumnHeightOutlined />}
              onClick={() => setColumnManagerVisible(true)}
              style={controlStyles.button}
            >
              Column Manager
            </Button>
            <Button
              icon={<SettingOutlined />}
              onClick={() => setTableSettingsVisible(true)}
              style={controlStyles.button}
            >
              Table Settings
            </Button>
          </Space>
        </Col>
      </Row>

      {/* Data Table */}
      <Table
        columns={tableColumns}
        dataSource={sortedSubmissions}
        loading={loading}
        rowKey="id"
        pagination={false}
        onChange={handleTableChange}
        expandable={tableSettings.expandable ? {
          expandedRowRender,
          expandedRowKeys: expandedRowKeysArray,
          onExpand: handleExpand,
          expandIcon: ({ expanded, onExpand, record }) => (
            <Button
              type="text"
              icon={expanded ? <MinusOutlined /> : <PlusOutlined />}
              onClick={(e) => onExpand(record, e)}
              size="small"
              style={{
                color: '#8C8C8C',
                border: 'none',
                boxShadow: 'none',
                padding: '6px',
                height: 'auto',
                minWidth: 'auto'
              }}
            />
          )
        } : undefined}
        size={tableSettings.size as any}
        bordered={tableSettings.bordered}
        showHeader={tableSettings.columnHeader}
        scroll={tableSettings.fixedHeader ? { x: 1000, y: 400 } : { x: 1000 }}
        rowSelection={tableSettings.checkbox ? {
          selectedRowKeys,
          onChange: setSelectedRowKeys,
          getCheckboxProps: (record) => ({
            name: record.id.toString(),
          }),
        } : undefined}
      />

      {/* Bottom Pagination */}
      {shouldShowPagination(tableSettings.paginationBottom) && (
        <div style={{ 
          marginTop: '24px',
          width: '100%',
          backgroundColor: '#fafafa',
          padding: '12px 20px',
          borderRadius: '8px',
          border: '1px solid #f0f0f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          {/* Fixed Left Section - Items count */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}>
            <TypographyText style={{ 
              fontSize: '14px', 
              color: '#8c8c8c',
              whiteSpace: 'nowrap'
            }}>
              Show {_pagination.pageSize} items of {_pagination.total}
            </TypographyText>
            
            {/* Divider */}
            <div style={{
              height: '20px',
              width: '1px',
              backgroundColor: '#d9d9d9'
            }} />
          </div>
          
          {/* Adjustable Center Section - Pagination Controls */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: getPaginationJustify(tableSettings.paginationBottom) === 'start' ? 'flex-start' : 
                           getPaginationJustify(tableSettings.paginationBottom) === 'end' ? 'flex-end' : 'center',
            flex: 1,
            margin: '0 20px'
          }}>
            <Pagination
              current={_pagination.current}
              total={_pagination.total}
              pageSize={_pagination.pageSize}
              showSizeChanger={false}
              onChange={(page) => onPaginationChange({ ..._pagination, current: page })}
              size="small"
              showQuickJumper={false}
              showTotal={() => null}
              simple={false}
              showLessItems={false}
              pageSizeOptions={[]}
              style={{
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              className="custom-pagination"
              itemRender={(page, type, originalElement) => {
                if (type === 'prev') {
                  return (
                    <button
                      style={{
                        width: '32px',
                        height: '32px',
                        border: '1px solid #d9d9d9',
                        borderRadius: '6px',
                        backgroundColor: '#fff',
                        color: _pagination.current === 1 ? '#bfbfbf' : '#595959',
                        cursor: _pagination.current === 1 ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                        fontWeight: '500',
                        transition: 'all 0.2s',
                        outline: 'none',
                        boxShadow: 'none'
                      }}
                      disabled={_pagination.current === 1}
                      onMouseEnter={(e) => {
                        if (_pagination.current !== 1) {
                          e.currentTarget.style.borderColor = '#1890ff';
                          e.currentTarget.style.color = '#1890ff';
                          e.currentTarget.style.backgroundColor = '#f0f8ff';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (_pagination.current !== 1) {
                          e.currentTarget.style.borderColor = '#d9d9d9';
                          e.currentTarget.style.color = '#595959';
                          e.currentTarget.style.backgroundColor = '#fff';
                        }
                      }}
                    >
                      ‹
                    </button>
                  );
                }
                if (type === 'next') {
                  const totalPages = Math.ceil(_pagination.total / _pagination.pageSize);
                  return (
                    <button
                      style={{
                        width: '32px',
                        height: '32px',
                        border: '1px solid #d9d9d9',
                        borderRadius: '6px',
                        backgroundColor: '#fff',
                        color: _pagination.current === totalPages ? '#bfbfbf' : '#595959',
                        cursor: _pagination.current === totalPages ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                        fontWeight: '500',
                        transition: 'all 0.2s',
                        outline: 'none',
                        boxShadow: 'none'
                      }}
                      disabled={_pagination.current === totalPages}
                      onMouseEnter={(e) => {
                        if (_pagination.current !== totalPages) {
                          e.currentTarget.style.borderColor = '#1890ff';
                          e.currentTarget.style.color = '#1890ff';
                          e.currentTarget.style.backgroundColor = '#f0f8ff';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (_pagination.current !== totalPages) {
                          e.currentTarget.style.borderColor = '#d9d9d9';
                          e.currentTarget.style.color = '#595959';
                          e.currentTarget.style.backgroundColor = '#fff';
                        }
                      }}
                    >
                      ›
                    </button>
                  );
                }
                if (type === 'page') {
                  const isActive = page === _pagination.current;
                  return (
                    <button
                      style={{
                        width: '32px',
                        height: '32px',
                        border: isActive ? '1px solid #1890ff' : '1px solid #d9d9d9',
                        borderRadius: '6px',
                        backgroundColor: isActive ? '#1890ff' : '#fff',
                        color: isActive ? '#fff' : '#595959',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                        fontWeight: isActive ? '600' : '500',
                        transition: 'all 0.2s',
                        outline: 'none',
                        boxShadow: 'none'
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.borderColor = '#1890ff';
                          e.currentTarget.style.color = '#1890ff';
                          e.currentTarget.style.backgroundColor = '#f0f8ff';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.borderColor = '#d9d9d9';
                          e.currentTarget.style.color = '#595959';
                          e.currentTarget.style.backgroundColor = '#fff';
                        }
                      }}
                    >
                      {page}
                    </button>
                  );
                }
                if (type === 'jump-prev' || type === 'jump-next') {
                  return (
                    <span style={{
                      width: '32px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#8c8c8c',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}>
                      ...
                    </span>
                  );
                }
                return originalElement;
              }}
            />
          </div>
          
          {/* Fixed Right Section - Items per page */}
          <div style={{
            display: 'flex',
            alignItems: 'center'
          }}>
            <TypographyText style={{ 
              fontSize: '14px', 
              color: '#8c8c8c'
            }}>
              {_pagination.pageSize} / page
            </TypographyText>
          </div>
        </div>
      )}

      {/* Modals */}
      <ColumnSettingsModal
        visible={columnSettingsVisible}
        onClose={() => setColumnSettingsVisible(false)}
      />
      
      <TableSettingsModal
        visible={tableSettingsVisible}
        onClose={() => setTableSettingsVisible(false)}
        settings={tableSettings}
        onSave={handleTableSettingsSave}
      />
      
      <SubmissionDetailModal
        visible={submissionDetailVisible}
        submission={selectedSubmission}
        columns={columns}
        onClose={() => setSubmissionDetailVisible(false)}
        onDelete={handleDeleteSubmission}
      />

      {/* Delete Confirmation */}
      <DeleteConfirmationModal
        visible={deleteConfirmVisible}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirmVisible(false)}
        title="Delete Submission"
        content="Are you sure you want to delete this submission?"
        itemId={submissionToDelete?.id}
        itemType="submission"
      />

      {/* Column Manager Modal */}
      <ColumnManagerModal
        visible={columnManagerVisible}
        onClose={() => setColumnManagerVisible(false)}
        onSave={handleColumnSave}
        formFields={formFields}
        currentColumns={columns}
      />

      {/* Bulk Delete Confirmation Modal */}
      <DeleteConfirmationModal
        visible={bulkDeleteVisible}
        onConfirm={handleBulkDelete}
        onCancel={() => setBulkDeleteVisible(false)}
        title="Delete Multiple Submissions"
        content={`Are you sure you want to delete ${selectedRowKeys.length} selected submission(s)?`}
        itemType="submissions"
        loading={bulkDeleting}
      />
    </div>
    </ConfigProvider>
  );
};

export default SubmissionsTable;
