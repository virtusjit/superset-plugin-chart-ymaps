import React from 'react';

export const MapLoader: React.FC<{ isLoading: boolean }> = ({ isLoading }) => {
  if (!isLoading) return null;
  
  return (
    <div className="map-loader">
      <div className="spinner" />
      <div className="loader-text">Загрузка карты...</div>
    </div>
  );
};
