import React, { useState, useEffect } from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup
} from 'react-simple-maps';
import { Country } from '../types';

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

interface WorldMapProps {
  onSelectCountry: (country: Country) => void;
  playerCountryId?: string;
  selectedCountryId?: string;
}

const WorldMap: React.FC<WorldMapProps> = ({ onSelectCountry, playerCountryId, selectedCountryId }) => {
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);

  return (
    <div className="w-full h-[300px] md:h-[400px] bg-slate-900/50 rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative">
      <ComposableMap
        projectionConfig={{
          scale: 140,
        }}
        className="w-full h-full"
      >
        <ZoomableGroup center={[0, 20]} zoom={1}>
          <Geographies geography={geoUrl}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const isPlayer = geo.id === playerCountryId;
                const isSelected = geo.id === selectedCountryId;
                const isHovered = geo.id === hoveredCountry;

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    onMouseEnter={() => setHoveredCountry(geo.id)}
                    onMouseLeave={() => setHoveredCountry(null)}
                    onClick={() => {
                      if (!isPlayer) {
                        onSelectCountry({ id: geo.id, name: geo.properties.name });
                      }
                    }}
                    style={{
                      default: {
                        fill: isPlayer ? "#10b981" : isSelected ? "#3b82f6" : "#1e293b",
                        stroke: "#334155",
                        strokeWidth: 0.5,
                        outline: "none",
                        transition: "all 250ms"
                      },
                      hover: {
                        fill: isPlayer ? "#10b981" : "#475569",
                        stroke: "#64748b",
                        strokeWidth: 1,
                        outline: "none",
                        cursor: isPlayer ? "default" : "pointer"
                      },
                      pressed: {
                        fill: "#3b82f6",
                        outline: "none"
                      }
                    }}
                  />
                );
              })
            }
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>
      
      {/* Tooltip-like indicator */}
      <div className="absolute bottom-4 left-4 pointer-events-none">
        <div className="bg-slate-800/90 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-lg text-xs font-mono text-slate-300">
          {hoveredCountry ? "Targeting..." : "Select a nation"}
        </div>
      </div>
    </div>
  );
};

export default WorldMap;
