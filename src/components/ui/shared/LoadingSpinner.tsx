import React from 'react';
import { Spin, Typography } from 'antd';

const { Text: TypographyText } = Typography;

interface LoadingSpinnerProps {
  size?: 'small' | 'default' | 'large';
  text?: string;
  centered?: boolean;
  style?: React.CSSProperties;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'default',
  text = 'Loading...',
  centered = true,
  style
}) => {
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
    ...(centered && {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      zIndex: 1000
    }),
    ...style
  };

  return (
    <div style={containerStyle}>
      <Spin size={size} />
      {text && (
        <TypographyText 
          style={{ 
            marginTop: '16px', 
            color: '#8c8c8c',
            fontSize: '14px'
          }}
        >
          {text}
        </TypographyText>
      )}
    </div>
  );
};

export default LoadingSpinner;
