import React from 'react';
import { Row, Col, Space, Typography } from 'antd';

const { Text: TypographyText } = Typography;

interface LayoutWrapperProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

const LayoutWrapper: React.FC<LayoutWrapperProps> = ({
  children,
  title,
  subtitle,
  actions,
  className,
  style
}) => {
  return (
    <div className={className} style={style}>
      {(title || subtitle || actions) && (
        <Row justify="space-between" align="middle" style={{ marginBottom: '16px' }}>
          <Col>
            <Space direction="vertical" size={0}>
              {title && (
                <TypographyText strong style={{ fontSize: '18px', color: '#262626' }}>
                  {title}
                </TypographyText>
              )}
              {subtitle && (
                <TypographyText style={{ fontSize: '14px', color: '#8c8c8c' }}>
                  {subtitle}
                </TypographyText>
              )}
            </Space>
          </Col>
          {actions && (
            <Col>
              <Space size="middle">
                {actions}
              </Space>
            </Col>
          )}
        </Row>
      )}
      {children}
    </div>
  );
};

export default LayoutWrapper;
