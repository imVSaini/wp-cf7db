import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Layout, Select, Button, Input, DatePicker, Space, Modal, Form, Switch, Select as AntSelect, Divider, Typography, message } from 'antd';
import { DownloadOutlined, SearchOutlined, UnorderedListOutlined, AppstoreOutlined, LoadingOutlined, SettingOutlined, DatabaseOutlined, CloseOutlined } from '@ant-design/icons';
import SubmissionsTable from './SubmissionsTable';
import MigrationModal from '../modals/MigrationModal';
import { toast } from '../ui/shared';
import { useApi, useFormData, useSubmissions } from '../../hooks/useApi';
import { TableSettings } from '../../types';
import dayjs, { Dayjs } from 'dayjs';

const { Header, Content } = Layout;
const { RangePicker } = DatePicker;

const ContactForm7Database: React.FC = () => {
  const [forms, setForms] = useState<Array<{id: string, title: string}>>([]);
  const [selectedForm, setSelectedForm] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 15,
    total: 0
  });
  const [showMigrationModal, setShowMigrationModal] = useState(false);

  // Memoize date range conversion to prevent infinite re-renders
  const dateRangeString = useMemo((): [string, string] | null => {
    return dateRange ? [dateRange[0].format('YYYY-MM-DD'), dateRange[1].format('YYYY-MM-DD')] : null;
  }, [dateRange]);

  // Search loading state
  const [isSearching, setIsSearching] = useState(false);
  
  // Debounced search query state
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  // API hooks
  const { getForms, getSettings, saveSettings, exportCSV, error: apiError, getTableSettings, saveTableSettings } = useApi();
  const { formFields, loading: fieldsLoading, error: fieldsError } = useFormData(selectedForm);
  const { submissions, total, loadSubmissions, loading: submissionsLoading, error: submissionsError } = useSubmissions(
    selectedForm,
    pagination,
    debouncedSearchQuery,
    dateRangeString
  );

  // Show error messages
  useEffect(() => {
    if (apiError) {
      message.error(`API Error: ${apiError}`);
    }
    if (fieldsError) {
      message.error(`Form Fields Error: ${fieldsError}`);
    }
    if (submissionsError) {
      message.error(`Submissions Error: ${submissionsError}`);
    }
  }, [apiError, fieldsError, submissionsError]);


  // Fetch available forms from API
  const fetchForms = useCallback(async () => {
    const formsData = await getForms();
    if (formsData) {
      setForms(formsData);
      // Auto-select first form if available and no form is selected
      if (formsData.length > 0) {
        const firstFormId = formsData[0].id;
        setSelectedForm(prev => prev || firstFormId);
      }
    }
  }, [getForms]);

  // Settings modal state
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [settingsForm] = Form.useForm();

  // Table settings state (persists across form switches)
  // Initialize with empty object - will be populated from backend
  const [tableSettings, setTableSettings] = useState<TableSettings>({
    bordered: true,
    title: true,
    columnHeader: true,
    expandable: false,
    fixedHeader: true,
    ellipsis: true,
    footer: true,
    checkbox: true,
    size: 'small',
    tableScroll: 'fixed',
    pagination: 'Right'
  } as TableSettings);

  // Fetch available forms on component mount
  useEffect(() => {
    fetchForms();
  }, [fetchForms]);

  // Load table settings once (global)
  useEffect(() => {
    const loadSettings = async () => {
      const settings = await getTableSettings();
      if (settings) {
        setTableSettings(prev => ({ ...prev, ...(settings as any) }));
      }
    };
    loadSettings();
  }, [getTableSettings]);

  // Update pagination total when submissions change
  useEffect(() => {
    setPagination(prev => ({
      ...prev,
      total: total
    }));
  }, [total]);

  // Immediate effect for form selection and date range changes
  useEffect(() => {
    if (!selectedForm) return;
    
    // Reset search loading state when form or date range changes
    setIsSearching(false);
    // Submissions will be loaded automatically by the useSubmissions hook
  }, [selectedForm, dateRange]);

  // Debounced search effect - properly debounce search queries
  useEffect(() => {
    if (!selectedForm) return;

    // Set loading state when search query changes
    if (searchQuery !== debouncedSearchQuery) {
      setIsSearching(true);
    }

    // Debounce the search query update
    const timeoutId = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, selectedForm, debouncedSearchQuery]);

  // Reset pagination when search changes
  useEffect(() => {
    if (debouncedSearchQuery !== searchQuery) return; // Only when debounced value changes
    
    setPagination(prev => ({ ...prev, current: 1 }));
  }, [debouncedSearchQuery, searchQuery]);

  // handleFilter removed - search is now handled automatically via debouncing


  const handleQuickDateRange = useCallback((range: string) => {
    const now = dayjs();
    let startDate: Dayjs;
    let endDate: Dayjs;

    switch (range) {
      case 'today':
        startDate = now.startOf('day');
        endDate = now.endOf('day');
        break;
      case 'week':
        startDate = now.startOf('week');
        endDate = now.endOf('week');
        break;
      case 'month':
        startDate = now.startOf('month');
        endDate = now.endOf('month');
        break;
      case '30days':
        startDate = now.subtract(30, 'day');
        endDate = now;
        break;
      case 'year':
        startDate = now.startOf('year');
        endDate = now.endOf('year');
        break;
      default:
        return;
    }

    setDateRange([startDate, endDate]);
  }, []);

  // Settings handlers
  const handleSettingsOpen = useCallback(async () => {
    setSettingsVisible(true);
    // Load settings from backend
    const settings = await getSettings();
    if (settings) {
      settingsForm.setFieldsValue(settings);
    }
  }, [settingsForm, getSettings]);

  const handleSettingsClose = useCallback(() => {
    setSettingsVisible(false);
    settingsForm.resetFields();
  }, [settingsForm]);

  const handleSettingsSave = useCallback(async (values: any) => {
    try {
      // Filter out undefined values and Advanced Settings fields
      const filteredValues = Object.fromEntries(
        Object.entries(values).filter(([key, value]) => 
          value !== undefined && 
          !['monthlyCsvLeads', 'selectedFormsForCsv'].includes(key)
        )
      );

      await saveSettings(filteredValues);
      toast.success('Settings saved successfully');
      setSettingsVisible(false);
    } catch (error) {
      // Failed to save settings
      message.error('Failed to save settings');
    }
  }, [saveSettings]);

  // Handle access control changes and reset permissions
  const handleAccessChange = useCallback((fieldName: string, checked: boolean) => {
    if (!checked) {
      // Reset all permissions for this role when access is disabled
      const permissionFields: { [key: string]: string[] } = {
        editorAccess: ['editorAllowEdit', 'editorAllowDelete', 'editorAllowExport'],
        authorAccess: ['authorAllowEdit', 'authorAllowDelete', 'authorAllowExport']
      };

      const fieldsToReset = permissionFields[fieldName] || [];
      const resetValues: { [key: string]: boolean } = {};
      fieldsToReset.forEach(field => {
        resetValues[field] = false;
      });

      settingsForm.setFieldsValue(resetValues);
    }
  }, [settingsForm]);

  // Handle monthly CSV leads toggle
  const handleMonthlyCsvChange = useCallback((checked: boolean) => {
    if (checked) {
      toast.info('Monthly CSV Leads via Mail coming soon');
    }
  }, []);

  // Persist table settings to backend
  const handleTableSettingsChange = useCallback(async (newSettings: TableSettings) => {
    setTableSettings(newSettings);
    try {
      await saveTableSettings(newSettings as any);
      toast.success('Table settings saved successfully');
    } catch (e) {
      message.error('Failed to save table settings');
    }
  }, [saveTableSettings]);

  // Memoized styles
  const headerStyles = useMemo(() => ({
    container: { 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between', 
      width: '100%', 
      height: '100%',
      padding: '0 16px'
    },
    title: { 
      margin: 0, 
      fontSize: '20px', 
      fontWeight: 600, 
      color: '#262626' 
    },
    controls: { 
      display: 'flex', 
      alignItems: 'center', 
      gap: '12px',
      flexWrap: 'wrap' as const
    },
    formSelect: { 
      minWidth: '180px',
      height: '40px'
    }
  }), []);

  // Memoized form options
  const formOptions = useMemo(() => 
    forms.map(form => ({
      value: form.id,
      label: form.title
    })), [forms]);

  // Export functionality
  const handleExport = useCallback(async () => {
    if (!selectedForm) {
      toast.warning('Please select a form to export');
      return;
    }

    try {
      const csvData = await exportCSV({
        form_id: selectedForm,
        start_date: dateRange?.[0]?.format('YYYY-MM-DD') || '',
        end_date: dateRange?.[1]?.format('YYYY-MM-DD') || ''
      });

      if (csvData) {
        // Generate filename with form name and date range
        const selectedFormData = formOptions.find(f => f.value === selectedForm);
        const formNameForFile = selectedFormData?.label || `form_${selectedForm}`;
        const dateStr = dateRange?.[0] ? `_${dateRange[0].format('YYYY-MM-DD')}` : '';
        const endDateStr = dateRange?.[1] ? `_to_${dateRange[1].format('YYYY-MM-DD')}` : '';
        const filename = `cf7_${formNameForFile.replace(/[^a-zA-Z0-9]/g, '_')}${dateStr}${endDateStr}.csv`;
        
        // Create and download CSV file
        const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
        
        // Use a more compatible download method
        if (window.navigator && (window.navigator as any).msSaveOrOpenBlob) {
          // For IE/Edge
          (window.navigator as any).msSaveOrOpenBlob(blob, filename);
        } else {
          // For modern browsers
          const link = document.createElement('a');
          const url = URL.createObjectURL(blob);
          link.href = url;
          link.download = filename;
          link.style.display = 'none';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          // Clean up the URL object after a short delay
          setTimeout(() => {
            URL.revokeObjectURL(url);
          }, 100);
        }
        
        // Generate concise success message
        const formName = formOptions.find(f => f.value === selectedForm)?.label || 'form';
        const dateInfo = dateRange?.[0] ? 
          ` (${dateRange[0].format('MM/DD')} to ${dateRange[1]?.format('MM/DD') || 'now'})` : 
          ' (all data)';
        toast.success(`CSV exported: ${formName}${dateInfo}`);
      }
    } catch (error) {
      // Export error
      const errorMessage = error instanceof Error ? error.message : 'Failed to export data';
      if (errorMessage.includes('permission') || errorMessage.includes('Permission')) {
        toast.warning('You do not have permission to export data');
      } else {
        message.error(errorMessage);
      }
    }
  }, [selectedForm, dateRange, formOptions, exportCSV]);


  // Check if WordPress globals are available
  if (!window.cf7dba_ajax) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Plugin Configuration Error</h2>
        <p>The WordPress AJAX configuration is not available. Please ensure the plugin is properly activated.</p>
        <p>If this issue persists, please contact the plugin developer.</p>
        <div style={{ marginTop: '20px', textAlign: 'left', backgroundColor: '#f5f5f5', padding: '10px', borderRadius: '4px' }}>
          <h4>Debug Information:</h4>
          <p><strong>Window object:</strong> {typeof window}</p>
          <p><strong>cf7dba_ajax:</strong> {window.cf7dba_ajax ? 'Available' : 'Not available'}</p>
          <p><strong>Current URL:</strong> {window.location.href}</p>
          <p><strong>User Agent:</strong> {navigator.userAgent}</p>
        </div>
      </div>
    );
  }

  return (
    <Layout className="cf7db-layout">
      <Header className="cf7db-header">
        <div style={headerStyles.container}>
          {/* Title */}
           <h1 style={headerStyles.title}>
             LeadSync
           </h1>
          
          
          {/* Controls */}
          <div style={headerStyles.controls}>
          {/* Form Selector */}
          <Select
            value={selectedForm}
            onChange={(value) => {
              setSelectedForm(value);
              setPagination(prev => ({ ...prev, current: 1 }));
              setSearchQuery('');
              setDateRange(null);
            }}
            style={headerStyles.formSelect}
            placeholder={forms.length === 0 ? "No forms available" : "Choose Form"}
            disabled={forms.length === 0}
            options={formOptions}
          />
          
          {/* Export Button */}
          <Button
            icon={<DownloadOutlined />}
            onClick={handleExport}
            style={{ 
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #d9d9d9',
              borderRadius: '6px',
              backgroundColor: 'white'
            }}
            title="Export to CSV"
          />
          
          {/* Migration Button */}
          <Button
            icon={<DatabaseOutlined />}
            onClick={() => setShowMigrationModal(true)}
            style={{ 
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #d9d9d9',
              borderRadius: '6px',
              backgroundColor: 'white'
            }}
            title="Migrate from CFDB7"
          />
          
          {/* Search Input */}
          <Input
            placeholder="Search submissions..."
            prefix={isSearching ? <LoadingOutlined style={{ color: '#1890ff' }} /> : <SearchOutlined style={{ color: '#8c8c8c' }} />}
            suffix={searchQuery ? (
              <Button
                type="text"
                size="small"
                icon={<CloseOutlined />}
                onClick={() => {
                  setSearchQuery('');
                  setDebouncedSearchQuery('');
                  setIsSearching(false);
                }}
                style={{ 
                  border: 'none',
                  boxShadow: 'none',
                  color: '#8c8c8c',
                  padding: '5px',
                  height: 'auto'
                }}
              />
            ) : null}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onPressEnter={() => {
              // Immediately apply search on Enter
              setDebouncedSearchQuery(searchQuery);
              setPagination(prev => ({ ...prev, current: 1 }));
            }}
            allowClear={false} // We handle clear with custom button
            style={{ 
              width: '280px',
              height: '40px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center'
            }}
          />
          
          {/* Date Range Picker */}
          <RangePicker
            value={dateRange}
            onChange={(dates) => {
              if (dates && dates[0] && dates[1]) {
                setDateRange([dates[0], dates[1]]);
              } else {
                setDateRange(null);
              }
            }}
            placeholder={['Start date', 'End date']}
            format="YYYY-MM-DD"
            separator="~"
            style={{ 
              width: '240px',
              height: '40px',
              borderRadius: '6px'
            }}
            allowClear={true}
            renderExtraFooter={() => (
              <div style={{ padding: '8px 0', borderTop: '1px solid #f0f0f0' }}>
                <Space size="small" style={{ width: '100%', justifyContent: 'center' }}>
                  <Button
                    size="small"
                    type="text"
                    onClick={() => handleQuickDateRange('today')}
                    style={{ 
                      color: '#1890ff',
                      border: '1px solid #1890ff',
                      borderRadius: '4px',
                      backgroundColor: 'transparent',
                      fontSize: '12px',
                      height: '28px',
                      padding: '0 8px'
                    }}
                  >
                    Today
                  </Button>
                  <Button
                    size="small"
                    type="text"
                    onClick={() => handleQuickDateRange('week')}
                    style={{ 
                      color: '#1890ff',
                      border: '1px solid #1890ff',
                      borderRadius: '4px',
                      backgroundColor: 'transparent',
                      fontSize: '12px',
                      height: '28px',
                      padding: '0 8px'
                    }}
                  >
                    This Week
                  </Button>
                  <Button
                    size="small"
                    type="text"
                    onClick={() => handleQuickDateRange('month')}
                    style={{ 
                      color: '#1890ff',
                      border: '1px solid #1890ff',
                      borderRadius: '4px',
                      backgroundColor: 'transparent',
                      fontSize: '12px',
                      height: '28px',
                      padding: '0 8px'
                    }}
                  >
                    This Month
                  </Button>
                  <Button
                    size="small"
                    type="text"
                    onClick={() => handleQuickDateRange('30days')}
                    style={{ 
                      color: '#1890ff',
                      border: '1px solid #1890ff',
                      borderRadius: '4px',
                      backgroundColor: 'transparent',
                      fontSize: '12px',
                      height: '28px',
                      padding: '0 8px'
                    }}
                  >
                    Last 30 days
                  </Button>
                  <Button
                    size="small"
                    type="text"
                    onClick={() => handleQuickDateRange('year')}
                    style={{ 
                      color: '#1890ff',
                      border: '1px solid #1890ff',
                      borderRadius: '4px',
                      backgroundColor: 'transparent',
                      fontSize: '12px',
                      height: '28px',
                      padding: '0 8px'
                    }}
                  >
                    This Year
                  </Button>
                </Space>
              </div>
            )}
          />
          
          {/* Settings Button */}
          <Button 
            icon={<SettingOutlined />}
            onClick={handleSettingsOpen}
            style={{ 
              height: '40px',
              width: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #d9d9d9',
              borderRadius: '6px',
              backgroundColor: 'white'
            }}
            title="Settings & Access Control"
          />
          
          {/* View Toggle Buttons */}
          <Space size="small">
            <Button
              type={viewMode === 'list' ? 'primary' : 'default'}
              icon={<UnorderedListOutlined />}
              onClick={() => {
                if (viewMode !== 'list') {
                  toast.info('View Mode Switching functionality coming soon');
                }
                setViewMode('list');
              }}
              style={{ 
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '6px'
              }}
            />
            <Button
              type={viewMode === 'grid' ? 'primary' : 'default'}
              icon={<AppstoreOutlined />}
              onClick={() => {
                if (viewMode !== 'grid') {
                  toast.info('View Mode Switching functionality coming soon');
                }
                setViewMode('grid');
              }}
              style={{ 
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '6px'
              }}
            />
          </Space>
          </div>
        </div>
      </Header>

      <Content className="cf7db-content">
        {/* Table Section */}
        <div className="cf7db-main-panel">
          {!selectedForm ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '60px 20px',
              color: '#8c8c8c'
            }}>
              <p>Please select a form to view submissions</p>
            </div>
          ) : (
            <SubmissionsTable
              key={selectedForm} // Force re-render when form changes
              submissions={submissions}
              loading={submissionsLoading || fieldsLoading}
              pagination={pagination}
              formFields={formFields}
              onPaginationChange={(newPagination) => {
                setPagination(newPagination);
                // Data will be fetched automatically via useEffect
              }}
              onRefresh={loadSubmissions}
              formId={selectedForm}
              tableSettings={tableSettings}
              onTableSettingsChange={handleTableSettingsChange}
            />
          )}
        </div>
      </Content>

      {/* Settings Modal */}
      <Modal
        title="Settings & Access Control"
        open={settingsVisible}
        onCancel={handleSettingsClose}
        onOk={() => settingsForm.submit()}
        okText="Save Settings"
        cancelText="Cancel"
        width={600}
        style={{ borderRadius: '8px' }}
      >
        <Form
          form={settingsForm}
          layout="vertical"
          onFinish={handleSettingsSave}
          initialValues={{
            // Access Control
            editorAccess: false,
            authorAccess: false,
            // Editor Permissions
            editorAllowEdit: false,
            editorAllowDelete: false,
            editorAllowExport: false,
            // Author Permissions
            authorAllowEdit: false,
            authorAllowDelete: false,
            authorAllowExport: false
          }}
        >
          <Typography.Title level={5}>Access Control</Typography.Title>
          
          <Form.Item
            name="editorAccess"
            label="Editors"
            tooltip="Allow editors to access this plugin"
            valuePropName="checked"
          >
            <Switch onChange={(checked) => handleAccessChange('editorAccess', checked)} />
          </Form.Item>

          <Form.Item
            name="authorAccess"
            label="Authors"
            tooltip="Allow authors to access this plugin"
            valuePropName="checked"
          >
            <Switch onChange={(checked) => handleAccessChange('authorAccess', checked)} />
          </Form.Item>

          <Divider />

          <Form.Item shouldUpdate={(prevValues, currentValues) => prevValues.editorAccess !== currentValues.editorAccess} noStyle>
            {({ getFieldValue }) => (
              <>
                <Typography.Title level={5} style={{ opacity: getFieldValue('editorAccess') ? 1 : 0.5 }}>
                  Editor Permissions
                </Typography.Title>

                <Form.Item
                  name="editorAllowEdit"
                  label="Allow editing submissions"
                  valuePropName="checked"
                >
                  <Switch disabled={!getFieldValue('editorAccess')} />
                </Form.Item>

                <Form.Item
                  name="editorAllowDelete"
                  label="Allow deleting submissions"
                  valuePropName="checked"
                >
                  <Switch disabled={!getFieldValue('editorAccess')} />
                </Form.Item>

                <Form.Item
                  name="editorAllowExport"
                  label="Allow exporting data"
                  valuePropName="checked"
                >
                  <Switch disabled={!getFieldValue('editorAccess')} />
                </Form.Item>
              </>
            )}
          </Form.Item>

          <Divider />

          <Form.Item shouldUpdate={(prevValues, currentValues) => prevValues.authorAccess !== currentValues.authorAccess} noStyle>
            {({ getFieldValue }) => (
              <>
                <Typography.Title level={5} style={{ opacity: getFieldValue('authorAccess') ? 1 : 0.5 }}>
                  Author Permissions
                </Typography.Title>

                <Form.Item
                  name="authorAllowEdit"
                  label="Allow editing submissions"
                  valuePropName="checked"
                >
                  <Switch disabled={!getFieldValue('authorAccess')} />
                </Form.Item>

                <Form.Item
                  name="authorAllowDelete"
                  label="Allow deleting submissions"
                  valuePropName="checked"
                >
                  <Switch disabled={!getFieldValue('authorAccess')} />
                </Form.Item>

                <Form.Item
                  name="authorAllowExport"
                  label="Allow exporting data"
                  valuePropName="checked"
                >
                  <Switch disabled={!getFieldValue('authorAccess')} />
                </Form.Item>
              </>
            )}
          </Form.Item>

          <Divider />

          <Typography.Title level={5}>Advanced Settings</Typography.Title>

          <Form.Item
            name="monthlyCsvLeads"
            label="Monthly CSV Leads via Mail"
            tooltip="Automatically send CSV export of leads via email every month"
            valuePropName="checked"
          >
            <Switch onChange={handleMonthlyCsvChange} />
          </Form.Item>

          <Form.Item
            name="selectedFormsForCsv"
            label="Select Forms for CSV Leads via Mail"
            tooltip="Choose which forms to include in monthly CSV reports"
            dependencies={['monthlyCsvLeads']}
          >
            <Form.Item shouldUpdate={(prevValues, currentValues) => prevValues.monthlyCsvLeads !== currentValues.monthlyCsvLeads} noStyle>
              {({ getFieldValue }) => (
                <AntSelect
                  mode="multiple"
                  placeholder="Select forms..."
                  disabled={!getFieldValue('monthlyCsvLeads')}
                  options={formOptions}
                  style={{ width: '100%' }}
                />
              )}
            </Form.Item>
          </Form.Item>
        </Form>
      </Modal>
      
      {/* Migration Modal */}
      <MigrationModal
        visible={showMigrationModal}
        onClose={() => setShowMigrationModal(false)}
      />
    </Layout>
  );
};

export default ContactForm7Database;
