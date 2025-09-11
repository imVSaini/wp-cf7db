import React from 'react';
import { Modal, Space } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';

interface DeleteConfirmationModalProps {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
  content?: string;
  itemId?: string | number;
  itemType?: string;
  loading?: boolean;
}

const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  visible,
  onConfirm,
  onCancel,
  title = 'Delete Item',
  content = 'Are you sure you want to delete this item?',
  itemId,
  itemType = 'item',
  loading = false
}) => {
  return (
    <Modal
      title={
        <Space style={{ alignItems: 'center' }}>
          <ExclamationCircleOutlined 
            style={{ 
              color: '#ff4d4f', 
              fontSize: '20px',
              marginRight: '8px'
            }} 
          />
          <span style={{ 
            fontSize: '18px', 
            fontWeight: '600',
            color: '#262626'
          }}>
            {title}
          </span>
        </Space>
      }
      open={visible}
      onOk={onConfirm}
      onCancel={onCancel}
      okText="Yes, Delete"
      cancelText="Cancel"
      okButtonProps={{ 
        type: 'primary',
        danger: true,
        loading: loading,
        style: {
          backgroundColor: '#ff4d4f',
          borderColor: '#ff4d4f',
          borderRadius: '6px',
          height: '36px',
          fontWeight: '500'
        }
      }}
      cancelButtonProps={{
        style: {
          borderRadius: '6px',
          height: '36px',
          fontWeight: '500'
        }
      }}
      width={420}
      centered
      style={{
        borderRadius: '8px'
      }}
      bodyStyle={{
        padding: '24px',
        fontSize: '14px',
        lineHeight: '1.5'
      }}
    >
      <div style={{ 
        textAlign: 'center',
        padding: '16px 0'
      }}>
        <div style={{
          fontSize: '16px',
          color: '#595959',
          marginBottom: '8px',
          fontWeight: '500'
        }}>
          {content}
        </div>
        <div style={{
          fontSize: '13px',
          color: '#8c8c8c',
          marginBottom: '16px'
        }}>
          This action cannot be undone and will permanently remove the {itemType} data.
        </div>
        {itemId && (
          <div style={{
            backgroundColor: '#f5f5f5',
            padding: '12px',
            borderRadius: '6px',
            border: '1px solid #e8e8e8',
            fontSize: '13px',
            color: '#595959'
          }}>
            <strong>{itemType.charAt(0).toUpperCase() + itemType.slice(1)} ID:</strong> {itemId}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default DeleteConfirmationModal;
