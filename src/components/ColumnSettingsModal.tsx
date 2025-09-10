import React, { useState } from 'react';
import { Modal, List, Switch, Button } from 'antd';
import { DragOutlined, EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons';
import { ColumnSetting } from '../types';

interface ColumnSettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

const ColumnSettingsModal: React.FC<ColumnSettingsModalProps> = ({
  visible,
  onClose
}) => {
  const [columns, setColumns] = useState<ColumnSetting[]>([
    { key: 'tel', displayName: 'Contact number', visible: true },
    { key: 'your-name', displayName: 'Name', visible: true },
    { key: 'submit_user_id', displayName: 'User ID', visible: true },
    { key: 'your-email', displayName: 'Email Address', visible: false },
    { key: 'submit_ip', displayName: 'IP', visible: true },
    { key: 'submit', displayName: 'Address', visible: true },
    { key: 'your-message', displayName: '1', visible: true },
    { key: '_wpcf7_contain...', displayName: '2', visible: true },
    { key: 'your-subject', displayName: '3', visible: true },
    { key: 'submit_time', displayName: 'Time', visible: true }
  ]);

  const handleToggleVisibility = (key: string) => {
    setColumns(prev => 
      prev.map(col => 
        col.key === key ? { ...col, visible: !col.visible } : col
      )
    );
  };

  const handleSave = () => {
    // Implement save logic
    console.log('Saving column settings:', columns);
    onClose();
  };

  return (
    <Modal
      title="Sort Column"
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button key="save" type="primary" onClick={handleSave}>
          Save Changes
        </Button>
      ]}
      width={600}
    >
      <List
        dataSource={columns}
        renderItem={(column) => (
          <List.Item
            actions={[
              <Switch
                key="visibility"
                checked={column.visible}
                onChange={() => handleToggleVisibility(column.key)}
                checkedChildren={<EyeOutlined />}
                unCheckedChildren={<EyeInvisibleOutlined />}
              />
            ]}
          >
            <List.Item.Meta
              avatar={<DragOutlined style={{ color: '#999', cursor: 'move' }} />}
              title={column.displayName}
              description={column.key}
            />
          </List.Item>
        )}
      />
    </Modal>
  );
};

export default ColumnSettingsModal;
