import React, { useState, useEffect } from 'react';
import { Modal, Button, Input, Switch, Space, Typography } from 'antd';
import { DragOutlined, EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons';
import { ColumnConfig, FormField } from '../types';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

const { Text: TypographyText } = Typography;

interface ColumnManagerModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (_columns: ColumnConfig[]) => void;
  formFields: FormField[];
  currentColumns: ColumnConfig[];
}

interface DraggableColumnItemProps {
  column: ColumnConfig;
  index: number;
  moveColumn: (_dragIndex: number, _hoverIndex: number) => void;
  onToggleVisibility: (_key: string) => void;
  onUpdateTitle: (_key: string, _title: string) => void;
}

const DraggableColumnItem: React.FC<DraggableColumnItemProps> = ({
  column,
  index,
  moveColumn,
  onToggleVisibility,
  onUpdateTitle
}) => {
  const ref = React.useRef<HTMLDivElement>(null);

  const [{ handlerId }, drop] = useDrop({
    accept: 'column',
    collect(monitor) {
      return {
        handlerId: monitor.getHandlerId(),
      };
    },
    hover(item: any, monitor) {
      if (!ref.current) {
        return;
      }
      const dragIndex = item.index;
      const hoverIndex = index;

      if (dragIndex === hoverIndex) {
        return;
      }

      const hoverBoundingRect = ref.current?.getBoundingClientRect();
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      const hoverClientY = clientOffset!.y - hoverBoundingRect.top;

      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return;
      }
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return;
      }

      moveColumn(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
  });

  const [{ isDragging }, drag] = useDrag({
    type: 'column',
    item: () => {
      return { key: column.key, index };
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  drag(drop(ref));

  return (
    <div
      ref={ref}
      style={{
        opacity: isDragging ? 0.5 : 1,
        padding: '12px',
        margin: '8px 0',
        border: '1px solid #d9d9d9',
        borderRadius: '6px',
        backgroundColor: '#fafafa',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}
      data-handler-id={handlerId}
    >
      <DragOutlined style={{ color: '#8c8c8c', cursor: 'move' }} />
      
      <TypographyText strong style={{ minWidth: '30px' }}>
        {index + 1}
      </TypographyText>

      <div style={{ flex: 1 }}>
        <Input
          value={column.title}
          onChange={(e) => onUpdateTitle(column.key, e.target.value)}
          placeholder="Column title"
          style={{ marginBottom: '4px' }}
        />
        <TypographyText type="secondary" style={{ fontSize: '12px' }}>
          {column.key}
        </TypographyText>
      </div>

      <Space>
        <Switch
          checked={column.visible}
          onChange={() => onToggleVisibility(column.key)}
          checkedChildren={<EyeOutlined />}
          unCheckedChildren={<EyeInvisibleOutlined />}
        />
        
      </Space>
    </div>
  );
};

const ColumnManagerModal: React.FC<ColumnManagerModalProps> = ({
  visible,
  onClose,
  onSave,
  formFields,
  currentColumns
}) => {
  const [columns, setColumns] = useState<ColumnConfig[]>([]);

  useEffect(() => {
    if (visible) {
      setColumns(currentColumns);
    }
  }, [visible, currentColumns]);

  const moveColumn = (dragIndex: number, hoverIndex: number) => {
    const draggedColumn = columns[dragIndex];
    const newColumns = [...columns];
    newColumns.splice(dragIndex, 1);
    newColumns.splice(hoverIndex, 0, draggedColumn);
    
    // Update order numbers
    const updatedColumns = newColumns.map((col, index) => ({
      ...col,
      order: index
    }));
    
    setColumns(updatedColumns);
  };

  const onToggleVisibility = (key: string) => {
    setColumns(prev => prev.map(col => 
      col.key === key ? { ...col, visible: !col.visible } : col
    ));
  };

  const onUpdateTitle = (key: string, title: string) => {
    setColumns(prev => prev.map(col => 
      col.key === key ? { ...col, title } : col
    ));
  };



  const handleSave = () => {
    onSave(columns);
    onClose();
  };

  const resetToDefault = () => {
    const defaultColumns = generateDefaultColumns(formFields);
    setColumns(defaultColumns);
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <Modal
        title="Column Manager"
        open={visible}
        onCancel={onClose}
        width={600}
        footer={[
          <Button key="reset" onClick={resetToDefault}>
            Reset to Default
          </Button>,
          <Button key="cancel" onClick={onClose}>
            Cancel
          </Button>,
          <Button key="save" type="primary" onClick={handleSave}>
            Save Changes
          </Button>
        ]}
      >
        <div style={{ marginBottom: '16px' }}>
          <TypographyText strong>Drag to reorder columns, toggle visibility, and customize titles</TypographyText>
        </div>

        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {columns
            .sort((a, b) => a.order - b.order)
            .map((column, index) => (
              <DraggableColumnItem
                key={column.key}
                column={column}
                index={index}
                moveColumn={moveColumn}
                onToggleVisibility={onToggleVisibility}
                onUpdateTitle={onUpdateTitle}
              />
            ))}
        </div>

      </Modal>
    </DndProvider>
  );
};

// Helper function to generate default columns
const generateDefaultColumns = (_formFields: FormField[]): ColumnConfig[] => {
  const columns: ColumnConfig[] = [
    {
      key: 'id',
      title: 'ID',
      visible: true,
      order: 0,
      width: 100,
      isMetadata: true
    }
  ];

  // Add form fields
  _formFields.forEach((field, index) => {
    columns.push({
      key: field.name,
      title: field.label || field.name.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      visible: true,
      order: index + 1,
      width: 150
    });
  });

  // Add essential metadata
  columns.push(
    {
      key: 'submit_ip',
      title: 'Submit IP',
      visible: true,
      order: columns.length,
      width: 120,
      isMetadata: true
    },
    {
      key: 'submit_datetime',
      title: 'Submit Time',
      visible: true,
      order: columns.length + 1,
      width: 150,
      isMetadata: true
    },
    {
      key: 'submit_user_id',
      title: 'User ID',
      visible: true,
      order: columns.length + 2,
      width: 100,
      isMetadata: true
    }
  );

  return columns;
};

export default ColumnManagerModal;
