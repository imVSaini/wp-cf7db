import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider, message } from 'antd';
import { ContactForm7Database } from './components';
import './styles/admin.css';

// Configure message component globally
message.config({
  top: 100,
  duration: 3,
  maxCount: 3,
});

// Mount the React app
const container = document.getElementById('cf7db-admin-app');
if (container) {
  const root = ReactDOM.createRoot(container);
  root.render(
        <React.StrictMode>
          <ConfigProvider>
            <ContactForm7Database />
          </ConfigProvider>
        </React.StrictMode>
  );
} else {
  console.error('CF7DBA: React app container not found! Looking for #cf7db-admin-app');
}
