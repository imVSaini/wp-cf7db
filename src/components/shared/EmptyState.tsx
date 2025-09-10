import React from 'react';
import { Empty, Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';

interface EmptyStateProps {
  title?: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
  style?: React.CSSProperties;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No data available',
  description = 'There are no items to display at the moment.',
  actionText,
  onAction,
  icon,
  style
}) => {
  return (
    <Empty
      image={icon || Empty.PRESENTED_IMAGE_SIMPLE}
      description={
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            fontSize: '16px', 
            fontWeight: '500', 
            color: '#262626',
            marginBottom: '8px'
          }}>
            {title}
          </div>
          <div style={{ 
            fontSize: '14px', 
            color: '#8c8c8c',
            marginBottom: actionText ? '16px' : '0'
          }}>
            {description}
          </div>
          {actionText && onAction && (
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={onAction}
              style={{
                borderRadius: '6px',
                height: '36px',
                fontWeight: '500'
              }}
            >
              {actionText}
            </Button>
          )}
        </div>
      }
      style={{
        padding: '40px 20px',
        ...style
      }}
    />
  );
};

export default EmptyState;
