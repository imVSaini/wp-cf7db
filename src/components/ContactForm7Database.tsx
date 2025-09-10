import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Layout, Select, Button, Input, DatePicker, Space, Modal, Form, Switch, Select as AntSelect, Divider, Typography, message } from 'antd';
import { DownloadOutlined, SearchOutlined, UnorderedListOutlined, AppstoreOutlined, LoadingOutlined, SettingOutlined } from '@ant-design/icons';
import SubmissionsTable from './SubmissionsTable';
import { Submission, FormField } from '../types';
import { toast } from './shared';
import dayjs, { Dayjs } from 'dayjs';

// Global type declaration for WordPress AJAX

const { Header, Content } = Layout;
const { RangePicker } = DatePicker;

const ContactForm7Database: React.FC = () => {
  const [forms, setForms] = useState<Array<{id: string, title: string}>>([]);
  const [selectedForm, setSelectedForm] = useState<string>('');
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [fieldsLoading, setFieldsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 15,
    total: 0
  });

  // Fetch form fields for the selected form
  const fetchFormFields = useCallback(async () => {
    if (!selectedForm) return;
    
    setFieldsLoading(true);
    try {
      const response = await fetch('/wp-admin/admin-ajax.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          action: 'cf7dba_get_form_fields',
          nonce: window.cf7dba_ajax?.nonce || '',
          form_id: selectedForm
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data.fields) {
          setFormFields(data.data.fields);
        } else {
          console.error('Failed to fetch form fields:', data.data);
          setFormFields([]);
        }
      } else {
        console.error('HTTP error fetching form fields:', response.status);
        setFormFields([]);
      }
    } catch (error) {
      console.error('Error fetching form fields:', error);
      setFormFields([]);
    } finally {
      setFieldsLoading(false);
    }
  }, [selectedForm]);

  // Fetch available forms from API
  const fetchForms = useCallback(async () => {
    try {
      const response = await fetch('/wp-admin/admin-ajax.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          action: 'cf7dba_get_forms',
          nonce: window.cf7dba_ajax?.nonce || ''
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setForms(data.data);
          // Auto-select first form if available and no form is selected
          if (data.data.length > 0) {
            const firstFormId = data.data[0].id;
            setSelectedForm(prev => prev || firstFormId);
          }
        } else {
          console.error('Failed to fetch forms:', data.data);
          setForms([]);
        }
      } else {
        console.error('HTTP error fetching forms:', response.status);
        setForms([]);
      }
    } catch (error) {
      console.error('Error fetching forms:', error);
      setForms([]);
    }
  }, []);

  // Fetch submissions from API
  const fetchSubmissions = useCallback(async () => {
    if (!selectedForm) return;
    
    setLoading(true);
    try {
      const requestParams = {
        action: 'cf7dba_get_submissions',
        nonce: window.cf7dba_ajax?.nonce || '',
        form_id: selectedForm,
        page: pagination.current.toString(),
        per_page: pagination.pageSize.toString(),
        search: searchQuery,
        start_date: dateRange?.[0]?.format('YYYY-MM-DD') || '',
        end_date: dateRange?.[1]?.format('YYYY-MM-DD') || ''
      };

      const response = await fetch('/wp-admin/admin-ajax.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(requestParams)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSubmissions(data.data.submissions || []);
          setPagination(prev => ({
            ...prev,
            total: data.data.total || 0,
            pages: data.data.pages || 1
          }));
        } else {
          // Handle permission errors directly
          const errorMessage = data.data?.message || 'Failed to fetch submissions';
          console.log('Fetch error:', errorMessage);
          if (errorMessage.includes('permission') || errorMessage.includes('Permission')) {
            toast.warning('You do not have permission to view submissions');
          } else {
            console.error('Failed to fetch submissions:', data.data);
          }
          setSubmissions([]);
          setPagination(prev => ({ ...prev, total: 0, pages: 1 }));
        }
      } else {
        console.error('HTTP error:', response.status);
        setSubmissions([]);
        setPagination(prev => ({ ...prev, total: 0, pages: 1 }));
      }
    } catch (error) {
      console.error('Error fetching submissions:', error);
      setSubmissions([]);
      setPagination(prev => ({ ...prev, total: 0, pages: 1 }));
    } finally {
      setLoading(false);
    }
  }, [selectedForm, searchQuery, dateRange, pagination.current, pagination.pageSize]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced search effect
  const debouncedSearch = useMemo(() => {
    let timeoutId: number;
    return (callback: () => void, delay: number) => {
      clearTimeout(timeoutId);
      timeoutId = window.setTimeout(callback, delay);
    };
  }, []);

  // Search loading state
  const [isSearching, setIsSearching] = useState(false);
  
  // Settings modal state
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [settingsForm] = Form.useForm();

  // Fetch available forms on component mount
  useEffect(() => {
    fetchForms();
  }, [fetchForms]);

  // Consolidated effect for form selection, date range, and search changes
  useEffect(() => {
    if (!selectedForm) return;

    // Clear previous form fields when switching forms
    setFormFields([]);
    fetchFormFields();

    // Always debounce search queries for better UX
    setIsSearching(true);
    debouncedSearch(() => {
      fetchSubmissions();
      setIsSearching(false);
    }, 300); // Reduced delay for better responsiveness
  }, [selectedForm, dateRange, searchQuery, fetchFormFields, fetchSubmissions, debouncedSearch]);

  const handleFilter = useCallback(() => {
    // Reset to first page and fetch filtered data
    setPagination(prev => ({ ...prev, current: 1 }));
    setIsSearching(true);
    fetchSubmissions();
    setIsSearching(false);
  }, [fetchSubmissions]);


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
    try {
      const response = await fetch('/wp-admin/admin-ajax.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          action: 'cf7dba_get_settings',
          nonce: window.cf7dba_ajax?.nonce || ''
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          settingsForm.setFieldsValue(data.data.settings);
        }
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }, [settingsForm]);

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

      const formData = new URLSearchParams({
        action: 'cf7dba_save_settings',
        nonce: window.cf7dba_ajax?.nonce || '',
        ...Object.fromEntries(
          Object.entries(filteredValues).map(([key, value]) => [`settings[${key}]`, value])
        )
      });

      const response = await fetch('/wp-admin/admin-ajax.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          toast.success('Settings saved successfully');
          setSettingsVisible(false);
        } else {
          console.error('Failed to save settings:', data.data?.message);
        }
      } else {
        console.error('Failed to save settings - HTTP error:', response.status);
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }, []);

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
      const response = await fetch('/wp-admin/admin-ajax.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          action: 'cf7dba_export_csv',
          nonce: window.cf7dba_ajax?.nonce || '',
          form_id: selectedForm,
          start_date: dateRange?.[0]?.format('YYYY-MM-DD') || '',
          end_date: dateRange?.[1]?.format('YYYY-MM-DD') || ''
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Generate filename with form name and date range
          const selectedFormData = formOptions.find(f => f.value === selectedForm);
          const formNameForFile = selectedFormData?.label || `form_${selectedForm}`;
          const dateStr = dateRange?.[0] ? `_${dateRange[0].format('YYYY-MM-DD')}` : '';
          const endDateStr = dateRange?.[1] ? `_to_${dateRange[1].format('YYYY-MM-DD')}` : '';
          const filename = `cf7_${formNameForFile.replace(/[^a-zA-Z0-9]/g, '_')}${dateStr}${endDateStr}.csv`;
          
          // Create and download CSV file
          const blob = new Blob([data.data.csv_data], { type: 'text/csv;charset=utf-8;' });
          
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
        } else {
          const errorMessage = data.data?.message || 'Failed to export data';
          if (errorMessage.includes('permission') || errorMessage.includes('Permission')) {
            toast.warning('You do not have permission to export data');
          } else {
            message.error(errorMessage);
          }
        }
      } else {
        message.error('Failed to export data - HTTP error: ' + response.status);
      }
    } catch (error) {
      console.error('Export error:', error);
      message.error('Failed to export data');
    }
  }, [selectedForm, dateRange, formOptions]);


  return (
    <Layout className="cf7db-layout">
      <Header className="cf7db-header">
        <div style={headerStyles.container}>
          {/* Title */}
          <h1 style={headerStyles.title}>
            Contact Form 7 Database
          </h1>
          
          {/* Controls */}
          <div style={headerStyles.controls}>
          {/* Form Selector */}
          <Select
            value={selectedForm}
            onChange={(value) => {
              setSelectedForm(value);
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
          
          {/* Search Input */}
          <Input
            placeholder="Type Something..."
            prefix={isSearching ? <LoadingOutlined style={{ color: '#1890ff' }} /> : <SearchOutlined style={{ color: '#8c8c8c' }} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onPressEnter={handleFilter}
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
              onClick={() => setViewMode('list')}
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
              onClick={() => setViewMode('grid')}
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
              submissions={submissions}
              loading={loading || fieldsLoading}
              pagination={pagination}
              formFields={formFields}
              onPaginationChange={(newPagination) => {
                setPagination(newPagination);
                // Data will be fetched automatically via useEffect
              }}
              onRefresh={fetchSubmissions}
              formId={selectedForm}
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
            tooltip="Choose which Contact Form 7 forms to include in monthly CSV reports"
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
    </Layout>
  );
};

export default ContactForm7Database;
