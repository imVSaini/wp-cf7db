import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Modal, Typography, Row, Col, Divider, Space, Button } from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { Submission, ColumnConfig } from '../../types';
import { DeleteConfirmationModal, toast } from '../ui/shared';

const { Text: TypographyText } = Typography;

interface SubmissionDetailModalProps {
  visible: boolean;
  submission: Submission | null;
  columns?: ColumnConfig[];
  onClose: () => void;
  onDelete?: (_submission: Submission) => Promise<void>;
}

const SubmissionDetailModal: React.FC<SubmissionDetailModalProps> = ({
  visible,
  submission: _submission,
  columns = [],
  onClose,
  onDelete
}) => {
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const submissionRef = useRef(_submission);

  useEffect(() => {
    submissionRef.current = _submission;
  }, [_submission]);

  const handleEdit = useCallback(() => {
    // Implement edit functionality
    toast.info('Edit functionality coming soon');
    // Edit submission functionality
  }, []);

  const handleDelete = useCallback(() => {
    setDeleteModalVisible(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (onDelete && submissionRef.current) {
      // Close delete confirmation modal immediately
      setDeleteModalVisible(false);
      // Execute delete operation
      await onDelete(submissionRef.current);
      // Close detail modal after successful deletion
      onClose();
    }
  }, [onDelete, onClose]);

  if (!_submission) return null;


  return (
    <Modal
      title="Content Information"
      open={visible}
      onCancel={onClose}
      footer={null}
      width={800}
    >
      <div style={{ padding: '16px 0' }}>
        {/* Dynamic Fields - Based on Column Configuration */}
        {(() => {
          const formData = _submission.form_data || {};
          const displayedFields = new Set();
          
          // Get all visible columns in order
          const visibleColumns = columns
            .filter(col => col.visible)
            .sort((a, b) => a.order - b.order);
          
          // Show columns in configured order
          const columnEntries: [string, any, string][] = [];
          visibleColumns.forEach(column => {
            let value: any = '';
            
            // Get value based on column type
            if (column.isMetadata) {
              // For metadata columns, get from submission properties
              switch (column.key) {
                case 'id':
                  value = _submission.id;
                  break;
                case 'submit_ip':
                  value = _submission.submit_ip || _submission.ip || '';
                  break;
                case 'submit_datetime':
                  value = _submission.submit_datetime || _submission.time || '';
                  break;
                case 'submit_user_id':
                  value = _submission.submit_user_id || _submission.userId || '';
                  break;
                default:
                  value = _submission[column.key as keyof Submission] || '';
              }
            } else {
              // For form fields, get from form_data
              value = formData[column.key];
            }
            
            if (value !== undefined && value !== null && value !== '') {
              columnEntries.push([column.key, value, column.title]);
              displayedFields.add(column.key);
            }
          });
          
          // Show remaining form data fields not in column config
          const remainingEntries: [string, any, string][] = Object.entries(formData)
            .filter(([key]) => !displayedFields.has(key))
            .map(([key, value]) => [key, value, key.replace(/[-_]/g, ' ').toUpperCase()]);
          
          return [...columnEntries, ...remainingEntries].map(([key, value, title]) => (
            <div key={key}>
              <Row>
                <Col span={24}>
                  <TypographyText strong>{title}:</TypographyText>
                  <div style={{ marginTop: '4px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {value || '-'}
                  </div>
                </Col>
              </Row>
              <Divider style={{ margin: '8px 0' }} />
            </div>
          ));
        })()}
        
        {/* Legacy Message Content */}
        {(_submission.message1 || _submission.message2 || _submission.message3) && (
          <>
            <TypographyText strong style={{ fontSize: '16px', marginBottom: '16px', display: 'block' }}>
              Messages:
            </TypographyText>
            {_submission.message1 && (
              <>
                <Row>
                  <Col span={24}>
                    <TypographyText strong>Message 1:</TypographyText>
                    <div style={{ marginTop: '8px', whiteSpace: 'pre-wrap' }}>
                      {_submission.message1}
                    </div>
                  </Col>
                </Row>
                <Divider style={{ margin: '16px 0' }} />
              </>
            )}
            
            {_submission.message2 && (
              <>
                <Row>
                  <Col span={24}>
                    <TypographyText strong>Message 2:</TypographyText>
                    <div style={{ marginTop: '8px', whiteSpace: 'pre-wrap' }}>
                      {_submission.message2}
                    </div>
                  </Col>
                </Row>
                <Divider style={{ margin: '16px 0' }} />
              </>
            )}
            
            {_submission.message3 && (
              <>
                <Row>
                  <Col span={24}>
                    <TypographyText strong>Message 3:</TypographyText>
                    <div style={{ marginTop: '8px', whiteSpace: 'pre-wrap' }}>
                      {_submission.message3}
                    </div>
                  </Col>
                </Row>
                <Divider style={{ margin: '16px 0' }} />
              </>
            )}
          </>
        )}
        
         {/* Action Buttons */}
         <Row style={{ marginTop: '24px' }}>
           <Col span={24}>
             <Space>
               <Button
                 icon={<EditOutlined />}
                 onClick={handleEdit}
                 style={{ 
                   backgroundColor: 'white',
                   borderColor: '#d9d9d9',
                   color: '#000',
                   borderRadius: '6px',
                   height: '36px',
                   fontSize: '14px',
                   fontWeight: '500'
                 }}
               >
                 Edit
               </Button>
               <Button
                 icon={<DeleteOutlined />}
                 danger
                 onClick={handleDelete}
                 style={{ 
                   backgroundColor: 'white',
                   borderColor: '#ff4d4f',
                   color: '#ff4d4f',
                   borderRadius: '6px',
                   height: '36px',
                   fontSize: '14px',
                   fontWeight: '500'
                 }}
               >
                 Delete
               </Button>
             </Space>
           </Col>
         </Row>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        visible={deleteModalVisible}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteModalVisible(false)}
        title="Delete Submission"
        content="Are you sure you want to delete this submission?"
        itemId={_submission.id}
        itemType="submission"
      />
    </Modal>
  );
};

export default SubmissionDetailModal;
