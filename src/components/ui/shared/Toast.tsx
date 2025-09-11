import { message } from 'antd';

export interface ToastProps {
  type: 'success' | 'info' | 'warning';
  content: string;
  duration?: number;
}

export const showToast = ({ type, content, duration = 3 }: ToastProps) => {
  switch (type) {
    case 'success':
      message.success(content, duration);
      break;
    case 'info':
      message.info(content, duration);
      break;
    case 'warning':
      message.warning(content, duration);
      break;
    default:
      message.info(content, duration);
  }
};

export const toast = {
  success: (content: string, duration?: number) => 
    showToast({ type: 'success', content, duration }),
  info: (content: string, duration?: number) => 
    showToast({ type: 'info', content, duration }),
  warning: (content: string, duration?: number) => 
    showToast({ type: 'warning', content, duration }),
};

export default { showToast, toast };