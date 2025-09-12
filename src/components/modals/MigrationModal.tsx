import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Button, Progress, Alert, Steps, Typography, Space, Divider } from 'antd';
import { DownloadOutlined, DatabaseOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useApi } from '../../hooks/useApi';

const { Title, Text: TypographyText } = Typography;

interface MigrationStatus {
  cfdb7_exists: boolean;
  cfdb7_count: number;
  progress: {
    cfdb7_total: number;
    leadsync_total: number;
    progress_percentage: number;
  };
}

interface MigrationResult {
  success: boolean;
  migrated: number;
  total: number;
  errors: string[];
  has_more: boolean;
  message?: string;
}

const MigrationModal: React.FC<{
  visible: boolean;
  onClose: () => void;
}> = ({ visible, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [migrationStatus, setMigrationStatus] = useState<MigrationStatus | null>(null);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationProgress, setMigrationProgress] = useState(0);
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  // Use the useApi hook for all API calls
  const { checkMigration, migrateData, exportCFDB7Backup, cleanupCFDB7 } = useApi();

  const checkMigrationStatus = useCallback(async () => {
    try {
      const result = await checkMigration();
      if (result) {
        setMigrationStatus(result);
        if (result.cfdb7_exists) {
          setCurrentStep(1);
        } else {
          setCurrentStep(0);
        }
      }
    } catch (error) {
      // Error handling is done in the useApi hook
    }
  }, [checkMigration]);

  // Check migration status when modal opens
  useEffect(() => {
    if (visible) {
      checkMigrationStatus();
    }
  }, [visible, checkMigrationStatus]);

  const handleExportCFDB7Backup = async () => {
    try {
      const result = await exportCFDB7Backup();
      if (result && result.filepath) {
        // Create download link with proper filename from backend
        const link = document.createElement('a');
        // Add cache-busting parameter to force fresh download
        const url = new URL(result.filepath);
        url.searchParams.set('t', Date.now().toString());
        link.href = url.toString();
        const filename = result.filename || `cfdb7-backup-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv`;
        link.download = filename;
        // Force download with proper filename
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      // Error handling is done in the useApi hook
    }
  };

  const startMigration = async () => {
    setIsMigrating(true);
    setCurrentStep(2);
    setMigrationProgress(0);
    setErrors([]);

    let offset = 0;
    const batchSize = 100;
    let totalMigrated = 0;
    let hasMore = true;

    while (hasMore) {
      try {
        const result = await migrateData({
          batch_size: batchSize,
          offset: offset
        });

        if (result && result.success) {
          totalMigrated += result.migrated;
          setMigrationProgress(Math.round((totalMigrated / result.total) * 100));
          setErrors(prev => [...prev, ...result.errors]);
          
          if (!result.has_more) {
            hasMore = false;
            setMigrationResult(result);
            setCurrentStep(3);
          } else {
            offset += batchSize;
          }
        } else {
          setErrors(prev => [...prev, result?.message || 'Migration failed']);
          hasMore = false;
        }
      } catch (error) {
        setErrors(prev => [...prev, `Migration error: ${error}`]);
        hasMore = false;
      }
    }

    setIsMigrating(false);
  };

  const handleCleanupCFDB7 = async () => {
    try {
      await cleanupCFDB7();
      setCurrentStep(4);
    } catch (error) {
      // Error handling is done in the useApi hook
    }
  };

  const steps = [
    {
      title: 'Check Status',
      description: 'Checking for existing CFDB7 data',
      icon: <DatabaseOutlined />
    },
    {
      title: 'Backup Data',
      description: 'Export CFDB7 data as backup',
      icon: <DownloadOutlined />
    },
    {
      title: 'Migrate Data',
      description: 'Transfer data to LeadSync',
      icon: <DatabaseOutlined />
    },
    {
      title: 'Cleanup',
      description: 'Remove old CFDB7 data',
      icon: <CheckCircleOutlined />
    }
  ];

  return (
    <Modal
      title="Migrate from Contact Form CFDB7"
      open={visible}
      onCancel={onClose}
      width={800}
      footer={null}
      closable={!isMigrating}
    >
      <div style={{ padding: '20px 0' }}>
        <Steps current={currentStep} items={steps} />
        
        <Divider />
        
        {currentStep === 0 && (
          <div>
            <Title level={4}>Migration Status</Title>
            {migrationStatus ? (
              migrationStatus.cfdb7_exists ? (
                <Alert
                  message="CFDB7 Data Found"
                  description={`Found ${migrationStatus.cfdb7_count} submissions in CFDB7. You can migrate them to LeadSync.`}
                  type="info"
                  showIcon
                  icon={<ExclamationCircleOutlined />}
                />
              ) : (
                <Alert
                  message="No CFDB7 Data Found"
                  description="No CFDB7 submissions found. Nothing to migrate."
                  type="success"
                  showIcon
                  icon={<CheckCircleOutlined />}
                />
              )
            ) : (
              <div>Checking migration status...</div>
            )}
          </div>
        )}

        {currentStep === 1 && migrationStatus && (
          <div>
            <Title level={4}>Backup CFDB7 Data</Title>
            <TypographyText>
              Before migrating, we recommend creating a backup of your CFDB7 data. 
              This ensures you can restore it if needed.
            </TypographyText>
            <br /><br />
            <Space>
              <Button 
                type="primary" 
                icon={<DownloadOutlined />}
                onClick={handleExportCFDB7Backup}
              >
                Export CFDB7 Backup
              </Button>
              <Button onClick={startMigration}>
                Skip Backup & Migrate
              </Button>
            </Space>
          </div>
        )}

        {currentStep === 2 && (
          <div>
            <Title level={4}>Migrating Data</Title>
            <TypographyText>Transferring submissions from CFDB7 to LeadSync...</TypographyText>
            <br /><br />
            <Progress 
              percent={migrationProgress} 
              status={isMigrating ? 'active' : 'success'}
              format={(percent) => `${percent}% Complete`}
            />
            {migrationResult && (
              <div style={{ marginTop: 16 }}>
                <TypographyText>Migrated: {migrationResult.migrated} of {migrationResult.total} submissions</TypographyText>
              </div>
            )}
          </div>
        )}

        {currentStep === 3 && migrationResult && (
          <div>
            <Title level={4}>Migration Complete</Title>
            <Alert
              message={`Successfully migrated ${migrationResult.migrated} submissions`}
              description={`${migrationResult.total - migrationResult.migrated} submissions were skipped (already migrated or errors)`}
              type="success"
              showIcon
              icon={<CheckCircleOutlined />}
            />
            {errors.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <TypographyText type="danger">Errors encountered:</TypographyText>
                <ul>
                  {errors.slice(0, 5).map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                  {errors.length > 5 && <li>... and {errors.length - 5} more errors</li>}
                </ul>
              </div>
            )}
            <br />
            <Button type="primary" onClick={handleCleanupCFDB7}>
              Cleanup CFDB7 Data
            </Button>
          </div>
        )}

        {currentStep === 4 && (
          <div>
            <Title level={4}>Migration Complete</Title>
            <Alert
              message="Migration Successfully Completed"
              description="All CFDB7 data has been migrated to LeadSync and old data has been cleaned up."
              type="success"
              showIcon
              icon={<CheckCircleOutlined />}
            />
            <br />
            <Button type="primary" onClick={onClose}>
              Close
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default MigrationModal;
