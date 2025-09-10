import React from 'react';
import { Layout, Space, Button, Typography, Divider } from 'antd';

const { Header, Content } = Layout;
const { Text: TypographyText } = Typography;

interface AppLayoutProps {
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  showHeader?: boolean;
  className?: string;
}

interface ActionButtonProps {
  icon: React.ReactNode;
  onClick: () => void;
  text: string;
  type?: 'primary' | 'default' | 'dashed' | 'link' | 'text';
  danger?: boolean;
  disabled?: boolean;
  loading?: boolean;
  style?: React.CSSProperties;
}

export const ActionButton: React.FC<ActionButtonProps> = ({
  icon,
  onClick,
  text,
  type = 'default',
  danger = false,
  disabled = false,
  loading = false,
  style = {}
}) => (
  <Button
    icon={icon}
    onClick={onClick}
    type={type}
    danger={danger}
    disabled={disabled}
    loading={loading}
    style={{
      height: '40px',
      borderRadius: '6px',
      fontSize: '14px',
      fontWeight: '500',
      ...style
    }}
  >
    {text}
  </Button>
);

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  showDivider?: boolean;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  actions,
  showDivider = true
}) => (
  <div>
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '16px'
    }}>
      <div>
        <TypographyText style={{
          fontSize: '20px',
          fontWeight: '600',
          color: '#262626',
          margin: 0
        }}>
          {title}
        </TypographyText>
        {subtitle && (
          <TypographyText style={{
            fontSize: '14px',
            color: '#8c8c8c',
            marginTop: '4px',
            display: 'block'
          }}>
            {subtitle}
          </TypographyText>
        )}
      </div>
      {actions && (
        <Space size="middle">
          {actions}
        </Space>
      )}
    </div>
    {showDivider && <Divider style={{ margin: '0 0 24px 0' }} />}
  </div>
);

interface CardContainerProps {
  children: React.ReactNode;
  title?: string;
  actions?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const CardContainer: React.FC<CardContainerProps> = ({
  children,
  title,
  actions,
  className = '',
  style = {}
}) => (
  <div
    className={`cf7db-card ${className}`}
    style={{
      background: 'white',
      borderRadius: '8px',
      border: '1px solid #e8e8e8',
      padding: '24px',
      minHeight: '400px',
      ...style
    }}
  >
    {(title || actions) && (
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px'
      }}>
        {title && (
          <TypographyText style={{
            fontSize: '16px',
            fontWeight: '600',
            color: '#262626'
          }}>
            {title}
          </TypographyText>
        )}
        {actions && (
          <Space size="middle">
            {actions}
          </Space>
        )}
      </div>
    )}
    {children}
  </div>
);

const AppLayout: React.FC<AppLayoutProps> = ({
  title,
  children,
  actions,
  showHeader = true,
  className = ''
}) => (
  <Layout className={`cf7db-layout ${className}`}>
    {showHeader && (
      <Header className="cf7db-header" style={{
        background: '#f5f5f5 !important',
        padding: '0 24px !important',
        borderBottom: '1px solid #e8e8e8',
        height: '64px !important',
        lineHeight: '64px !important',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <TypographyText style={{
          fontSize: '20px',
          fontWeight: '600',
          color: '#262626',
          margin: 0
        }}>
          {title}
        </TypographyText>
        {actions && (
          <Space size="middle">
            {actions}
          </Space>
        )}
      </Header>
    )}
    <Content className="cf7db-content" style={{
      padding: '24px',
      background: '#f5f5f5',
      minHeight: 'calc(100vh - 64px)'
    }}>
      {children}
    </Content>
  </Layout>
);

export default AppLayout;
