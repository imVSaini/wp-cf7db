import React, { useState, useEffect } from 'react';
import { Modal, Switch, Radio, Select, Button, Space, Divider } from 'antd';
import { TableSettings } from '../types';

interface TableSettingsModalProps {
  visible: boolean;
  onClose: () => void;
  settings: TableSettings;
  onSave: (_settings: TableSettings) => void;
}

const TableSettingsModal: React.FC<TableSettingsModalProps> = ({
  visible,
  onClose,
  settings: initialSettings,
  onSave
}) => {
  const [settings, setSettings] = useState<TableSettings>(initialSettings);

  useEffect(() => {
    setSettings(initialSettings);
  }, [initialSettings]);

  const handleSwitchChange = (key: keyof TableSettings, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSizeChange = (value: 'small' | 'middle' | 'default') => {
    setSettings(prev => ({ ...prev, size: value }));
  };

  const handleScrollChange = (value: 'scroll' | 'fixed') => {
    setSettings(prev => ({ ...prev, tableScroll: value }));
  };

  const handlePaginationTopChange = (value: string) => {
    setSettings(prev => ({ ...prev, paginationTop: value }));
  };

  const handlePaginationBottomChange = (value: string) => {
    setSettings(prev => ({ ...prev, paginationBottom: value }));
  };

  const handleSave = () => {
    onSave(settings);
    onClose();
  };

  return (
    <Modal
      title="Table Settings"
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="save" type="primary" onClick={handleSave}>
          Save changes
        </Button>
      ]}
      width={500}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* Toggle Switches */}
        <div>
          <Switch
            checked={settings.bordered}
            onChange={(checked) => handleSwitchChange('bordered', checked)}
            style={{ marginRight: 8 }}
          />
          Bordered
        </div>
        
        <div>
          <Switch
            checked={settings.title}
            onChange={(checked) => handleSwitchChange('title', checked)}
            style={{ marginRight: 8 }}
          />
          Title
        </div>
        
        <div>
          <Switch
            checked={settings.columnHeader}
            onChange={(checked) => handleSwitchChange('columnHeader', checked)}
            style={{ marginRight: 8 }}
          />
          Column Header
        </div>
        
        <div>
          <Switch
            checked={settings.expandable}
            onChange={(checked) => handleSwitchChange('expandable', checked)}
            style={{ marginRight: 8 }}
          />
          Expandable
        </div>
        
        <div>
          <Switch
            checked={settings.fixedHeader}
            onChange={(checked) => handleSwitchChange('fixedHeader', checked)}
            style={{ marginRight: 8 }}
          />
          Fixed Header
        </div>
        
        <div>
          <Switch
            checked={settings.ellipsis}
            onChange={(checked) => handleSwitchChange('ellipsis', checked)}
            style={{ marginRight: 8 }}
          />
          Ellipsis
        </div>
        
        <div>
          <Switch
            checked={settings.footer}
            onChange={(checked) => handleSwitchChange('footer', checked)}
            style={{ marginRight: 8 }}
          />
          Footer
        </div>
        
        <div>
          <Switch
            checked={settings.checkbox}
            onChange={(checked) => handleSwitchChange('checkbox', checked)}
            style={{ marginRight: 8 }}
          />
          Checkbox
        </div>

        <Divider />

        {/* Size Selection */}
        <div>
          <div style={{ marginBottom: 8 }}>Size</div>
          <Radio.Group value={settings.size} onChange={(e) => handleSizeChange(e.target.value)}>
            <Radio.Button value="default">Default</Radio.Button>
            <Radio.Button value="middle">Middle</Radio.Button>
            <Radio.Button value="small">Small</Radio.Button>
          </Radio.Group>
        </div>

        {/* Table Scroll Selection */}
        <div>
          <div style={{ marginBottom: 8 }}>Table Scroll</div>
          <Radio.Group value={settings.tableScroll} onChange={(e) => handleScrollChange(e.target.value)}>
            <Radio.Button value="scroll">Scroll</Radio.Button>
            <Radio.Button value="fixed">Fixed Columns</Radio.Button>
          </Radio.Group>
        </div>

        {/* Pagination Top */}
        <div>
          <div style={{ marginBottom: 8 }}>Pagination Top</div>
          <Select
            value={settings.paginationTop}
            onChange={handlePaginationTopChange}
            style={{ width: '100%' }}
            options={[
              { value: 'None', label: 'None' },
              { value: 'Top Left', label: 'Top Left' },
              { value: 'Top Center', label: 'Top Center' },
              { value: 'Top Right', label: 'Top Right' }
            ]}
          />
        </div>

        {/* Pagination Bottom */}
        <div>
          <div style={{ marginBottom: 8 }}>Pagination Bottom</div>
          <Select
            value={settings.paginationBottom}
            onChange={handlePaginationBottomChange}
            style={{ width: '100%' }}
            options={[
              { value: 'None', label: 'None' },
              { value: 'Bottom Left', label: 'Bottom Left' },
              { value: 'Bottom Center', label: 'Bottom Center' },
              { value: 'Bottom Right', label: 'Bottom Right' }
            ]}
          />
        </div>
      </Space>
    </Modal>
  );
};

export default TableSettingsModal;
