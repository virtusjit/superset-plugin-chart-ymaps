import React from 'react';
import { styled } from '@superset-ui/core';

export interface LegendItem {
  name: string;
  color: string;
  value?: number;
}

export interface LegendProps {
  items: LegendItem[];
  position?: 'top' | 'bottom' | 'left' | 'right';
  visible?: boolean;
  title?: string;
  totalRegions?: number;
}

const LegendWrapper = styled.div<{ position: string }>`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  
  ${({ position } : any) => (position === 'left' || position === 'right') && `
    align-items: center;
  `}
  
  ${({ position } : any) => (position === 'top' || position === 'bottom') && `
    justify-content: center;
  `}
`;

const LegendContainer = styled.div<{ position: string; visible: boolean }>`
  background: rgba(255, 255, 255, 0.95);
  height: 100%;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(8px);
  z-index: 1000;
  display: ${({ visible } : any) => (visible ? 'block' : 'none')};
  max-height: 100%;
  overflow-y: auto;
  width: 100%;
`;

const LegendTitle = styled.h4`
  margin: 0 0 8px 0;
  font-size: 14px;
  font-weight: 600;
  color: #2d3748;
  text-align: center;
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 6px;
`;

const LegendList = styled.ul<{ position: string }>`
  list-style: none;
  margin: 0;
  padding: 0;
  
  ${({ position } : any) => (position === 'left' || position === 'right') && `
    display: flex;
    flex-direction: column;
    gap: 4px;
  `}
  
  ${({ position } : any) => (position === 'top' || position === 'bottom') && `
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: center;
  `}
`;

const LegendItem = styled.li<{ position: string }>`
  display: flex;
  align-items: center;
  padding: 4px;
  border-radius: 4px;
  transition: background-color 0.2s;
  min-width: 100%;

  &:hover {
    background-color: #f7fafc;
  }

  ${({ position } : any) => (position === 'top' || position === 'bottom') && `
    flex: 0 0 auto;
  `}
`;

const RegionCounter = styled.div`
  font-size: 12px;
  color: #4a5568;
  text-align: center;
  margin-bottom: 8px;
  padding: 4px 8px;
  background-color: #f7fafc;
  border-radius: 4px;
  font-weight: 500;
`;

const ColorBox = styled.div<{ color: string }>`
  width: 16px;
  height: 16px;
  background-color: ${({ color } : any) => color};
  border: 1px solid #cbd5e0;
  border-radius: 3px;
  margin-right: 8px;
  flex-shrink: 0;
`;

const ItemName = styled.span`
  font-size: 12px;
  color: #4a5568;
  flex-grow: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const Legend: React.FC<LegendProps> = ({
  items,
  position = 'top',
  visible = true,
  title = 'Легенда',
  totalRegions,
}) => {
  if (!items || items.length === 0 || !visible) {
    return null;
  }

  return (
    <LegendWrapper position={position}>
      <LegendContainer position={position} visible={visible}>
        {title && <LegendTitle>{title}</LegendTitle>}
        <LegendList position={position}>
          {items.map((item, index) => (
            <LegendItem key={`${item.name}-${index}`} position={position}>
              <ColorBox color={item.color} />
              <ItemName>{item.name}</ItemName>
            </LegendItem>
          ))}
        </LegendList>
        <RegionCounter>
          Всего регионов: {totalRegions}
        </RegionCounter>
      </LegendContainer>
    </LegendWrapper>
  );
};