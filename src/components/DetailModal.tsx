import React from 'react';
import { styled } from '@superset-ui/core';
import { RegionData } from '../types';

interface DetailModalProps {
  visible: boolean;
  region: RegionData | null;
  hasChildren: boolean;
  hasParent: boolean;
  onClose: () => void;
  onNavigateToChildren: () => void;
  onNavigateUp: () => void;
  onNavigateToMinLevel: () => void;
  onCrossFilter: () => void;
  isFilterActive: boolean;
  showReturnToMin: boolean;
  emitCrossFilters?: boolean;
}

// Styled компоненты
const ModalOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 100;
`;

const ModalContainer = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  z-index: 100;
  min-width: 300px;
  max-width: 400px;
  border: 2px solid #4159ba;
`;

const ModalTitle = styled.h3`
  margin: 0 0 15px 0;
  color: #182047;
  text-align: center;
  font-size: 18px;
`;

const ModalContent = styled.div`
  margin-bottom: 20px;
  color: #062155;
  font-size: 14px;
  line-height: 1.5;

  strong {
    font-weight: 600;
  }

  br {
    margin-bottom: 8px;
  }
`;

const FilterBadge = styled.div`
  margin-top: 8px;
  padding: 4px 8px;
  background-color: #e6f7ff;
  border: 1px solid #91d5ff;
  border-radius: 4px;
  font-size: 12px;
  color: #0050b3;
  text-align: center;
`;

const ModalActions = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 10px;
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' | 'warning' }>`
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.2s ease;

  ${({ variant = 'primary' }) => {
    switch (variant) {
      case 'primary':
        return `
          background: #4159ba;
          color: white;
          &:hover {
            background: #3141a0;
          }
        `;
      case 'secondary':
        return `
          background: #f0f0f0;
          color: #333;
          &:hover {
            background: #e0e0e0;
          }
        `;
      case 'warning':
        return `
          background: #fff3cd;
          color: #856404;
          border-color: #ffc107;
          &:hover {
            background: #ffe69c;
          }
        `;
      default:
        return '';
    }
  }}
`;

export const DetailModal: React.FC<DetailModalProps> = ({
  visible,
  region,
  hasChildren,
  hasParent,
  onClose,
  onNavigateToChildren,
  onNavigateUp,
  onNavigateToMinLevel,
  onCrossFilter,
  isFilterActive,
  showReturnToMin,
  emitCrossFilters = false
}) => {
  if (!visible || !region) {
    return null;
  }

  const handleOverlayClick = () => {
    onClose();
  };

  const handleModalClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleNavigateToChildren = () => {
    onNavigateToChildren();
  };

  const handleNavigateUp = () => {
    onNavigateUp();
  };

  const handleNavigateToMinLevel = () => {
    onNavigateToMinLevel();
  };

  const handleCrossFilter = () => {
    onCrossFilter();
  };

  return (
    <>
      <ModalOverlay onClick={handleOverlayClick} />
      <ModalContainer onClick={handleModalClick}>
        <ModalTitle>Детали региона</ModalTitle>
        
        <ModalContent>
          <strong>{region.regionname}</strong>
          <br />
          Уровень: {region.level}
          
          {isFilterActive && (
            <FilterBadge>
              ✓ Применён фильтр
            </FilterBadge>
          )}
        </ModalContent>

        <ModalActions>
          {emitCrossFilters && (
            <Button
              variant={isFilterActive ? 'secondary' : 'primary'}
              onClick={handleCrossFilter}
            >
              {isFilterActive ? 'Снять фильтр' : 'Применить фильтр'}
            </Button>
          )}

          {hasChildren && (
            <Button
              variant="primary"
              onClick={handleNavigateToChildren}
            >
              Показать детали
            </Button>
          )}

          {showReturnToMin && (
            <Button
              variant="warning"
              onClick={handleNavigateToMinLevel}
            >
              Вернуться к началу
            </Button>
          )}

          {hasParent && (
            <Button
              variant="secondary"
              onClick={handleNavigateUp}
            >
              Вернуться назад
            </Button>
          )}

          <Button
            variant="secondary"
            onClick={onClose}
          >
            Закрыть
          </Button>
        </ModalActions>
      </ModalContainer>
    </>
  );
};
