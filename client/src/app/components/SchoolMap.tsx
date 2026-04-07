import React, { useCallback, useState } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { MapPin, Navigation, ExternalLink } from 'lucide-react';
import { Button } from './ui/Button';

// Replace with your actual Google Maps API key
const GOOGLE_MAPS_API_KEY = 'YOUR_GOOGLE_MAPS_API_KEY';

// MMPNS coordinates — Multinational Village, Parañaque City
const SCHOOL_POSITION = { lat: 14.4793, lng: 121.0198 };

const containerStyle = {
  width: '100%',
  height: '100%',
};

// Custom dark green map styling to match the school brand
const mapStyles = [
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c9d7cb' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#f0f0e8' }] },
  { featureType: 'road', elementType: 'geometry.fill', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#d6d6d6' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#c5e3c8' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#185C20' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#e0e0d8' }] },
  { featureType: 'administrative', elementType: 'labels.text.fill', stylers: [{ color: '#444444' }] },
];

const openDirections = () => {
  window.open(
    `https://www.google.com/maps/dir/?api=1&destination=${SCHOOL_POSITION.lat},${SCHOOL_POSITION.lng}&destination_place_id=ChIJ_____MMPNS_Paranaque`,
    '_blank'
  );
};

interface SchoolMapProps {
  height?: string;
  showInfoCard?: boolean;
}

/* ─── Inner component that actually loads Google Maps (only rendered with a real key) ─── */
const LiveMap: React.FC<SchoolMapProps> = ({ height = '450px', showInfoCard = true }) => {
  const [infoOpen, setInfoOpen] = useState(false);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
  });

  const onMarkerClick = useCallback(() => {
    setInfoOpen(true);
  }, []);

  if (loadError) {
    return <FallbackMap height={height} />;
  }

  if (!isLoaded) {
    return (
      <div className="w-full flex items-center justify-center bg-gray-50" style={{ height }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#185C20] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-gray-400 tracking-widest uppercase">Loading map...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full" style={{ height }}>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={SCHOOL_POSITION}
        zoom={16}
        options={{
          styles: mapStyles,
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: true,
          fullscreenControl: true,
        }}
      >
        <Marker
          position={SCHOOL_POSITION}
          onClick={onMarkerClick}
          title="Madre Maria Pia Notari School"
        />

        {infoOpen && (
          <InfoWindow
            position={SCHOOL_POSITION}
            onCloseClick={() => setInfoOpen(false)}
          >
            <div className="p-2 max-w-[220px]">
              <h4 className="font-bold text-[#185C20] text-sm mb-1">
                Madre Maria Pia Notari School
              </h4>
              <p className="text-xs text-gray-600 leading-relaxed mb-2">
                #70 Timothy St., Multinational Village, Parañaque City, Metro Manila
              </p>
              <button
                onClick={openDirections}
                className="text-xs text-[#185C20] font-bold hover:underline flex items-center gap-1"
              >
                <Navigation size={12} /> Get Directions
              </button>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>

      {/* Overlay info card */}
      {showInfoCard && (
        <div className="absolute bottom-6 left-6 md:bottom-8 md:left-8 z-10">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-100 p-5 md:p-6 max-w-xs">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 shrink-0 bg-[#EDCD1F] rounded-xl flex items-center justify-center shadow-sm">
                <MapPin size={18} className="text-[#185C20]" />
              </div>
              <div>
                <h4 className="font-bold text-[#185C20] text-sm mb-1">Visit Our Campus</h4>
                <p className="text-[11px] text-gray-500 leading-relaxed mb-3">
                  #70 Timothy St., Multinational Village, Parañaque City
                </p>
                <button
                  onClick={openDirections}
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#185C20] hover:text-[#EDCD1F] transition-colors"
                >
                  <Navigation size={12} />
                  Get Directions
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ─── Fallback UI shown when no API key is configured ─── */
const FallbackMap: React.FC<{ height?: string }> = ({ height = '450px' }) => (
  <div className="relative w-full overflow-hidden bg-[#185C20]" style={{ height }}>
    {/* Decorative grid background */}
    <div className="absolute inset-0 opacity-[0.04]">
      <div className="absolute inset-0 bg-[radial-gradient(#EDCD1F_1.5px,transparent_1.5px)] [background-size:32px_32px]" />
    </div>

    {/* Decorative corner accents */}
    <div className="absolute top-4 left-4 w-10 h-10 border-t-2 border-l-2 border-[#EDCD1F]/30" />
    <div className="absolute top-4 right-4 w-10 h-10 border-t-2 border-r-2 border-[#EDCD1F]/30" />
    <div className="absolute bottom-4 left-4 w-10 h-10 border-b-2 border-l-2 border-[#EDCD1F]/30" />
    <div className="absolute bottom-4 right-4 w-10 h-10 border-b-2 border-r-2 border-[#EDCD1F]/30" />

    <div className="absolute inset-0 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        {/* Animated pin */}
        <div className="relative mx-auto mb-6 w-20 h-20">
          <div className="absolute inset-0 bg-[#EDCD1F]/20 rounded-full animate-ping" />
          <div className="relative w-20 h-20 bg-[#EDCD1F] rounded-full flex items-center justify-center shadow-lg shadow-[#EDCD1F]/20">
            <MapPin className="w-9 h-9 text-[#185C20]" />
          </div>
        </div>

        <h4 className="text-xl md:text-2xl font-serif font-bold text-white mb-2">
          Madre Maria Pia Notari School
        </h4>
        <p className="text-white/50 text-xs md:text-sm leading-relaxed mb-1">
          #70 Timothy St., Multinational Village
        </p>
        <p className="text-white/50 text-xs md:text-sm leading-relaxed mb-6">
          Parañaque City, Metro Manila, Philippines
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            size="sm"
            className="bg-[#EDCD1F] text-[#185C20] hover:bg-[#EDCD1F]/90 rounded-xl px-6 font-bold"
            onClick={openDirections}
          >
            <Navigation size={14} className="mr-2" />
            Get Directions
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-white/20 text-white hover:bg-white/5 rounded-xl px-6 whitespace-nowrap text-xs font-semibold"
            onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${SCHOOL_POSITION.lat},${SCHOOL_POSITION.lng}`, '_blank')}
          >
            <ExternalLink size={14} className="mr-2" />
            Open in Google Maps
          </Button>
        </div>
      </div>
    </div>
  </div>
);

/* ─── Main export: checks for valid API key before loading Google Maps ─── */
export const SchoolMap: React.FC<SchoolMapProps> = (props) => {
  const hasValidKey = GOOGLE_MAPS_API_KEY && GOOGLE_MAPS_API_KEY !== 'YOUR_GOOGLE_MAPS_API_KEY';

  if (!hasValidKey) {
    return <FallbackMap height={props.height} />;
  }

  return <LiveMap {...props} />;
};
