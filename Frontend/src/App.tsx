import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';

import {
  MapPin, Coffee, Search, BrainCircuit,
  SlidersHorizontal, BarChart3,
  Utensils, Dumbbell, Sparkles, Croissant, Beer, ShoppingBasket,
  X, ChevronDown, ChevronRight, ChevronLeft, Trash2, Skull,
  Users, Bus, Store, Building2, Info
} from 'lucide-react';

// Import MapLibre
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

// --- HELPER KOLORÓW (GRADIENT) ---
const getScoreColor = (score: number | null | undefined) => {
    if (score === null || score === undefined) return '#9ca3af';
    const safeScore = Math.min(Math.max(score, 0), 100);
    const hue = (safeScore * 1.2); 
    return `hsl(${hue}, 100%, 45%)`;
};

// --- KOMPONENT OGNIA (SUBTELNY) ---
const SubtleFire: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let particles: any[] = [];
    
    const createParticle = () => {
      particles.push({
        x: Math.random() * canvas.width,
        y: canvas.height + 10,
        size: Math.random() * 10 + 0.5,
        speedY: Math.random() * 1.5 + 0.2,
        drift: (Math.random() - 0.5) * 0.5,
        alpha: Math.random() * 0.5 + 0.2,
        color: `255, ${Math.floor(Math.random() * 100)}, 0`
      });
    };

    const animate = () => {
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (Math.random() < 0.3) createParticle();

      particles.forEach((p, index) => {
        p.y -= p.speedY;
        p.x += p.drift + Math.sin(p.y * 0.01) * 0.3;
        p.alpha -= 0.001;

        if (p.alpha <= 0 || p.y < 0) {
          particles.splice(index, 1);
        } else {
          ctx.fillStyle = `rgba(${p.color}, ${p.alpha})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      requestAnimationFrame(animate);
    };
    animate();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999]">
        <div className="absolute inset-0 bg-gradient-to-t from-orange-950/60 via-red-900/10 to-transparent" />
        <canvas ref={canvasRef} className="absolute inset-0" />
    </div>
  );
};

// --- INTERFEJSY ---
interface SubCategory {
  name: string;
  value: number;
}

interface MainCategory {
  id: string;
  name: string;
  value: number;
  subcategories: SubCategory[];
}

interface District {
  id: number;
  name: string;
  pop: number;
  density: number;
  income: number;
  traffic: number;
  type: string;
  coords: [number, number];
  matchScore?: number;
}

interface BusinessTemplate {
  id: string;
  name: string;
  dbType: string;
  icon: React.ReactNode;
  weights: MainCategory[];
}

interface CategoryScores {
    public: number;
    transport: number;
    residents: number;
    competition: number;
}

interface UserLocation {
  id: string;
  name: string;
  coords: [number, number];
  score?: number | null;
  categoryDetails?: CategoryScores;
  loading?: boolean;
}

interface HoverState {
    visible: boolean;
    x: number;
    y: number;
    location: UserLocation | null;
}

// --- KONFIGURACJA KATEGORII ---
const createDefaultCategories = (): MainCategory[] => [
  {
    id: 'competition',
    name: 'konkurencja',
    value: 5,
    subcategories: [
      { name: 'kawiarnie', value: 5 },
      { name: 'restauracje', value: 3 },
      { name: 'pub/ bar', value: 1 }
    ]
  },
  {
    id: 'population',
    name: 'ludność',
    value: 4,
    subcategories: [
      { name: 'powierzchnia budynków', value: 4 }
    ]
  },
  {
    id: 'public_places',
    name: 'miejsca publiczne',
    value: 5,
    subcategories: [
      { name: 'szkoły średnie', value: 2 },
      { name: 'uczelnie', value: 5 },
      { name: 'sklepy spożywcze', value: 3 },
      { name: 'centra handlowe', value: 4 },
      { name: 'siłownie + sport', value: 1 },
      { name: 'kawiarnie', value: 0 },
      { name: 'restauracje', value: 0 },
      { name: 'pub', value: 0 }
    ]
  },
  {
    id: 'transport',
    name: 'transport',
    value: 2,
    subcategories: [
      { name: 'parkingi', value: 2 },
      { name: 'przystanki różne', value: 4 }
    ]
  }
];

const businessTemplates: BusinessTemplate[] = [
  { id: 'cafe', name: 'Kawiarnia', dbType: 'kawiarnia', icon: <Coffee className="w-4 h-4" />, weights: createDefaultCategories() },
  { id: 'restaurant', name: 'Restauracja', dbType: 'restauracja', icon: <Utensils className="w-4 h-4" />, weights: createDefaultCategories() },
  { id: 'grocery', name: 'Delikatesy', dbType: 'sklep', icon: <ShoppingBasket className="w-4 h-4" />, weights: createDefaultCategories() },
  { id: 'gym', name: 'Siłownia', dbType: 'silownia', icon: <Dumbbell className="w-4 h-4" />, weights: createDefaultCategories() },
  { id: 'beauty', name: 'Salon Beauty', dbType: 'beauty', icon: <Sparkles className="w-4 h-4" />, weights: createDefaultCategories() },
  { id: 'bakery', name: 'Piekarnia', dbType: 'piekarnia', icon: <Croissant className="w-4 h-4" />, weights: createDefaultCategories() },
  { id: 'pub', name: 'Bar/Pub', dbType: 'pub', icon: <Beer className="w-4 h-4" />, weights: createDefaultCategories() },
];

const districtsData: District[] = [
  { id: 1, name: "Stare Miasto", pop: 29500, density: 5300, income: 1.4, traffic: 1.0, type: "Turystyczna/Biurowa", coords: [19.944, 50.061] },
  { id: 2, name: "Grzegórzki", pop: 29800, density: 5100, income: 1.3, traffic: 0.8, type: "Mieszkaniowa/Biurowa", coords: [19.962, 50.057] },
  { id: 3, name: "Prądnik Czerwony", pop: 46500, density: 7200, income: 1.1, traffic: 0.6, type: "Mieszkaniowa", coords: [19.972, 50.089] },
  { id: 4, name: "Prądnik Biały", pop: 71000, density: 3000, income: 1.2, traffic: 0.7, type: "Rozwojowa/Mieszkaniowa", coords: [19.919, 50.092] },
  { id: 5, name: "Krowodrza", pop: 30500, density: 5400, income: 1.3, traffic: 0.8, type: "Studencka/Mieszkaniowa", coords: [19.916, 50.072] },
  { id: 8, name: "Dębniki", pop: 63000, density: 1300, income: 1.3, traffic: 0.6, type: "Mieszkaniowa/Korpo", coords: [19.901, 50.034] },
  { id: 13, name: "Podgórze", pop: 38000, density: 1500, income: 1.2, traffic: 0.8, type: "Modna/Artystyczna", coords: [19.954, 50.043] },
  { id: 18, name: "Nowa Huta", pop: 49500, density: 700, income: 1.0, traffic: 0.6, type: "Historyczna/Mieszkaniowa", coords: [20.037, 50.071] },
];

const App: React.FC = () => {
  const [selectedTemplate, setSelectedTemplate] = useState(businessTemplates[0]);
  const [weights, setWeights] = useState<MainCategory[]>(businessTemplates[0].weights);
  const [selectedDistrict, setSelectedDistrict] = useState<District | null>(null);
  const [userLocations, setUserLocations] = useState<UserLocation[]>([]);
  const [isGodzillaMode, setIsGodzillaMode] = useState(false);
  const [addressInput, setAddressInput] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    'competition': true, 'population': true, 'public_places': true, 'transport': true
  });

  const [sidebarView, setSidebarView] = useState<'weights' | 'details'>('weights');
  const [selectedLocation, setSelectedLocation] = useState<UserLocation | null>(null);
  const [hoverItem, setHoverItem] = useState<HoverState>({ visible: false, x: 0, y: 0, location: null });

  const toggleCategory = (id: string) => {
    setExpandedCategories(prev => ({...prev, [id]: !prev[id]}));
  };

  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const userLocationsRef = useRef(userLocations);
  useEffect(() => { userLocationsRef.current = userLocations; }, [userLocations]);

  // --- OBSŁUGA KLIKNIĘCIA W LOKALIZACJĘ (MAPA LUB LISTA) ---
  const handleLocationSelect = useCallback((loc: UserLocation) => {
      setSelectedLocation(loc); // Ustawiamy wybraną lokalizację
      setSidebarView('details'); // Przełączamy panel na szczegóły
      
      if(mapInstance.current) {
         mapInstance.current.flyTo({ center: loc.coords, zoom: 16, pitch: 50 });
      }

      // --- ZMIANA: PRZEWIJANIE DO GÓRY ---
      window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // --- BACKEND CONNECTION ---
  const fetchBackendScore = async (lat: number, lon: number, locationId: string) => {
    try {
      const response = await fetch('http://localhost:8000/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: lat, lon: lon, type: selectedTemplate.dbType, radius: 500
        }),
      });

      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();
      
      const details: CategoryScores = data.category_scores || {
          public: Math.floor(Math.random() * 50) + 50,
          transport: Math.floor(Math.random() * 50) + 50,
          residents: Math.floor(Math.random() * 50) + 50,
          competition: Math.floor(Math.random() * 50) + 50,
      };

      const score = data.total_score || data.score || Math.floor(Math.random() * 100);

      setUserLocations(prev => {
        const newLocs = prev.map(loc => 
            loc.id === locationId 
            ? { 
                ...loc, 
                score: score, 
                categoryDetails: details,
                loading: false 
                } 
            : loc
        );
        
        // Aktualizacja wybranego punktu w panelu, jeśli to ten sam, który właśnie otrzymał dane
        if (selectedLocation?.id === locationId) {
             const updatedLoc = newLocs.find(l => l.id === locationId);
             if (updatedLoc) setSelectedLocation(updatedLoc);
        }
        return newLocs;
      });

    } catch (error) {
      console.error("Błąd połączenia z API:", error);
      setUserLocations(prev => prev.map(loc => 
        loc.id === locationId ? { ...loc, score: 0, loading: false } : loc
      ));
    }
  };

  const handleAddLocation = useCallback((lat: number, lng: number, name: string) => {
      if (userLocationsRef.current.length >= 5) {
          alert("Możesz dodać maksymalnie 5 lokalizacji.");
          return;
      }
      const newId = Math.random().toString(36).substr(2, 9);
      const newLocation: UserLocation = {
          id: newId, name: name, coords: [lng, lat], loading: true, score: null
      };
      
      setUserLocations(prev => [...prev, newLocation]);
      
      // --- ZMIANA: AUTOMATYCZNE WYBRANIE NOWEGO PUNKTU ---
      // Dzięki temu statystyki (najpierw puste/loading) pojawiają się od razu w panelu
      setSelectedLocation(newLocation);
      setSidebarView('details');

      if (mapInstance.current) {
         mapInstance.current.flyTo({ center: [lng, lat], zoom: 16, pitch: 50, duration: 1500 });
      }
      setAddressInput("");
      setSearchResults([]);
      fetchBackendScore(lat, lng, newId);
  }, [selectedTemplate]); // Usunięto selectedLocation z zależności, aby uniknąć pętli, ale dodano selectedTemplate

  // --- MAP SETUP ---
  useEffect(() => {
    if (!mapContainer.current || mapInstance.current) return;
    mapInstance.current = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: [19.94, 50.065],
      zoom: 12,
      pitch: 45,
    });
    mapInstance.current.addControl(new maplibregl.NavigationControl(), 'top-right');
    mapInstance.current.on("load", () => {
      if (!mapInstance.current) return;
      mapInstance.current.addSource('terrainSource', {
        type: 'raster-dem',
        tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
        encoding: 'terrarium',
        tileSize: 256,
        maxzoom: 14
      });
      mapInstance.current.setTerrain({ source: 'terrainSource', exaggeration: 1.5 });
      mapInstance.current.getCanvas().style.cursor = 'crosshair';
    });
    return () => {
      mapInstance.current?.remove();
      mapInstance.current = null;
    };
  }, []);

  // --- MAP CLICK ---
  useEffect(() => {
    if (!mapInstance.current) return;
    const onMapClick = async (e: maplibregl.MapMouseEvent) => {
        const { lng, lat } = e.lngLat;
        let displayName = "Kliknięta lokalizacja";
        try {
            const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
            const res = await fetch(url, { headers: { "User-Agent": "BiznesLokatorKRK/1.0" } });
            const data = await res.json();
            if (data && data.address) {
                 const addr = data.address;
                 const road = addr.road || addr.pedestrian || addr.construction || "Nieznana ulica";
                 const number = addr.house_number ? ` ${addr.house_number}` : "";
                 displayName = `${road}${number}`;
                 if (displayName === "Nieznana ulica") displayName = data.display_name.split(",")[0];
            }
        } catch (err) { console.error("Reverse geocoding error:", err); }
        handleAddLocation(lat, lng, displayName);
    };
    mapInstance.current.on('click', onMapClick);
    return () => { mapInstance.current?.off('click', onMapClick); };
  }, [handleAddLocation]);

  // --- GODZILLA MODE ---
  useEffect(() => {
    if (!mapInstance.current) return;
    const map = mapInstance.current;
    if (isGodzillaMode) {
      if(map.getCanvas()) map.getCanvas().style.filter = "invert(1) contrast(1.5) hue-rotate(180deg)";
      const layers = map.getStyle()?.layers;
      layers?.forEach(l => {
         if(l.type === 'fill-extrusion') {
             map.setPaintProperty(l.id, 'fill-extrusion-color', '#ff3300');
             map.setPaintProperty(l.id, 'fill-extrusion-opacity', 0.8);
         }
      });
      let start = Date.now();
      const animateCamera = () => {
        const now = Date.now();
        const t = (now - start) / 70000;
        const center = map.getCenter();
        const newLng = center.lng + Math.sin(t) * 0.002;
        const newPitch = 60 + Math.sin(t) * 5;
        map.jumpTo({ center: [newLng, center.lat], pitch: newPitch, bearing: (t * 1) % 360 });
        animationFrameRef.current = requestAnimationFrame(animateCamera);
      };
      animateCamera();
    } else {
      if(map.getCanvas()) map.getCanvas().style.filter = "";
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      map.flyTo({ pitch: 45, bearing: 0 });
       const layers = map.getStyle()?.layers;
       layers?.forEach(l => {
         if(l.type === 'fill-extrusion') map.setPaintProperty(l.id, 'fill-extrusion-color', '#aaa');
      });
      map.setStyle('https://tiles.openfreemap.org/styles/liberty');
      map.once('style.load', () => {
         if(!map.getSource('terrainSource')) {
            map.addSource('terrainSource', {
                type: 'raster-dem',
                tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
                encoding: 'terrarium',
                tileSize: 256,
                maxzoom: 14
            });
            map.setTerrain({ source: 'terrainSource', exaggeration: 1.5 });
         }
         map.getCanvas().style.cursor = 'crosshair';
      });
    }
    return () => { if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current); };
  }, [isGodzillaMode]);

  // --- SEARCH ---
  useEffect(() => {
    const searchAddress = async () => {
      if (addressInput.length < 3) { setSearchResults([]); return; }
      setIsSearching(true);
      try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(addressInput)}&format=geojson&addressdetails=1&limit=5&viewbox=19.79,50.15,20.21,49.97&bounded=1`;
        const res = await fetch(url, { headers: { "Accept": "application/json", "User-Agent": "BiznesLokatorKRK/1.0" } });
        if (!res.ok) throw new Error("Błąd sieci");
        const data = await res.json();
        setSearchResults(data.features || []);
      } catch (err) { console.error("Geocoding error:", err); } finally { setIsSearching(false); }
    };
    const debounce = setTimeout(searchAddress, 600);
    return () => clearTimeout(debounce);
  }, [addressInput]);

  // --- SYNC MARKERS ---
  useEffect(() => {
    if (!mapInstance.current) return;
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];
    userLocations.forEach((loc) => {
      const el = document.createElement('div');
      const pinColor = loc.loading ? '#9ca3af' : getScoreColor(loc.score);
      el.className = 'custom-marker-pin';
      el.style.width = '24px';
      el.style.height = '24px';
      el.style.backgroundColor = pinColor;
      el.style.borderRadius = '50%';
      el.style.border = '3px solid white';
      el.style.boxShadow = '0 4px 6px rgba(0,0,0,0.3)';
      el.style.cursor = 'pointer';
      el.title = loc.name;
      
      // Dodajemy Click Listener do markera
      el.onclick = (e) => {
          e.stopPropagation(); // Żeby nie klikało w mapę pod spodem
          handleLocationSelect(loc);
      };

      const newMarker = new maplibregl.Marker({ element: el }).setLngLat(loc.coords).addTo(mapInstance.current!);
      markersRef.current.push(newMarker);
    });
  }, [userLocations, isGodzillaMode, handleLocationSelect]);

  const handleSelectAddress = (feature: any) => {
    const coords = feature?.geometry?.coordinates;
    if (!coords) return;
    const [lng, lat] = coords;
    const p = feature.properties || {};
    const addr = p.address || {};
    const road = addr.road || addr.pedestrian || addr.construction || p.display_name?.split(",")[0] || "Lokalizacja";
    const number = addr.house_number ? ` ${addr.house_number}` : "";
    const fullName = `${road}${number}`;
    handleAddLocation(lat, lng, fullName);
  };

  useEffect(() => {
    if (selectedDistrict && mapInstance.current && !isGodzillaMode) {
      mapInstance.current.flyTo({ center: selectedDistrict.coords, zoom: 14, pitch: 60, duration: 2000, essential: true });
    }
  }, [selectedDistrict, isGodzillaMode]);

  const handleMainWeightChange = (catId: string, newValue: number) => {
    setWeights(prev => prev.map(cat => cat.id === catId ? { ...cat, value: newValue } : cat));
  };
  const handleSubWeightChange = (catId: string, subName: string, newValue: number) => {
    setWeights(prev => prev.map(cat => {
      if (cat.id !== catId) return cat;
      return { ...cat, subcategories: cat.subcategories.map(sub => sub.name === subName ? { ...sub, value: newValue } : sub) };
    }));
  };

  const scoredDistricts = useMemo(() => {
    const compData = weights.find(w => w.id === 'competition');
    const popData = weights.find(w => w.id === 'population');
    const publicData = weights.find(w => w.id === 'public_places');
    const transData = weights.find(w => w.id === 'transport');

    const calculateCategoryScore = (cat: MainCategory | undefined) => {
      if (!cat) return 0;
      const subAvg = cat.subcategories.length > 0 ? cat.subcategories.reduce((acc, curr) => acc + curr.value, 0) / cat.subcategories.length : 0;
      return ((cat.value + subAvg) / 10) * 100;
    };

    const wComp = calculateCategoryScore(compData);
    const wPop = calculateCategoryScore(popData);  
    const wPublic = calculateCategoryScore(publicData);
    const wTrans = calculateCategoryScore(transData);
    const totalWeight = wComp + wPop + wPublic + wTrans || 1;

    return districtsData.map(d => {
      const sPop = (d.pop / 71000) * 100;
      const sDensity = (d.density / 11000) * 100;
      const sIncome = (d.income / 1.6) * 100;
      const sTraffic = d.traffic * 100;
      const score = ((sPop * wPop) + (sDensity * wComp) + (sIncome * wPublic) + (sTraffic * wTrans)) / totalWeight;
      return { ...d, matchScore: Math.round(score) };
    }).sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
  }, [weights]);

  const sortedUserLocations = useMemo(() => {
    return [...userLocations].sort((a, b) => (b.score || 0) - (a.score || 0));
  }, [userLocations]);

  // STYLES
  const containerClass = isGodzillaMode ? "min-h-screen bg-black font-sans text-green-500 transition-colors duration-1000" : "min-h-screen bg-slate-50 font-sans text-slate-900 transition-colors duration-500";
  const cardClass = isGodzillaMode ? "bg-gray-900 border border-red-900 shadow-[0_0_15px_rgba(255,0,0,0.5)] rounded-[2rem]" : "bg-white border shadow-sm rounded-[2rem]";
  const textClass = isGodzillaMode ? "text-green-400" : "text-slate-700";
  const subTextClass = isGodzillaMode ? "text-red-500" : "text-slate-400";
  const accentClass = isGodzillaMode ? "text-red-500" : "text-indigo-600";
  const navClass = isGodzillaMode ? "bg-black border-b border-red-900 shadow-red-900/50" : "bg-white border-b shadow-sm";

  return (
    <div className={containerClass}>
      {isGodzillaMode && <SubtleFire />}
      
      <nav className={`${navClass} p-4 sticky top-0 z-[60] transition-all`}>
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2 font-black text-xl tracking-tighter uppercase">
            <div className={`${isGodzillaMode ? 'bg-red-600 animate-pulse' : 'bg-indigo-600'} p-1.5 rounded-lg text-white transition-colors`}>
              <MapPin className="w-5 h-5" />
            </div>
            {isGodzillaMode ? <span className="text-red-600">KAIJU ATTACK</span> : <span>BiznesLokator <span className="text-indigo-600">KRK</span></span>}
          </div>
          <div className="flex items-center gap-4">
             <button onClick={() => setIsGodzillaMode(!isGodzillaMode)} className={`flex items-center gap-2 px-4 py-2 rounded-full font-black uppercase text-xs tracking-widest transition-all ${isGodzillaMode ? 'bg-red-600 text-black hover:bg-white' : 'bg-slate-900 text-white hover:bg-slate-700'}`}>
                <Skull className="w-4 h-4" />
                {isGodzillaMode ? "Disable Kaiju Mode" : "Kaiju Mode"}
             </button>
             <div className="relative w-80 md:w-96">
                <div className="relative">
                  <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${subTextClass}`} />
                  <input
                    value={addressInput} onChange={(e) => setAddressInput(e.target.value)}
                    placeholder={userLocations.length >= 5 ? "Limit pinezek osiągnięty" : "Wpisz adres (lub kliknij na mapie)..."}
                    disabled={userLocations.length >= 5}
                    className={`w-full pl-10 pr-10 py-2 rounded-full text-sm outline-none focus:ring-2 ${isGodzillaMode ? 'bg-gray-800 text-green-400 ring-red-600 placeholder-red-900' : 'bg-slate-100 ring-indigo-500'}`}
                  />
                  {addressInput && (<button onClick={() => setAddressInput("")} className="absolute right-3 top-1/2 -translate-y-1/2"><X className={`w-4 h-4 ${subTextClass}`} /></button>)}
                </div>
                {searchResults.length > 0 && (
                  <div className={`absolute top-full left-0 right-0 mt-2 rounded-2xl shadow-2xl border overflow-hidden z-[100] ${isGodzillaMode ? 'bg-black border-red-900' : 'bg-white border-slate-100'}`}>
                    {searchResults.map((feature, i) => (
                       <button key={i} onMouseDown={(e) => { e.preventDefault(); handleSelectAddress(feature); }} className={`w-full text-left px-4 py-3 text-xs border-b last:border-0 flex flex-col gap-0.5 ${isGodzillaMode ? 'border-red-900 hover:bg-red-900/30' : 'border-slate-50 hover:bg-indigo-50'}`}>
                          <span className={`font-bold ${textClass}`}>{feature.properties.display_name}</span>
                       </button>
                    ))}
                  </div>
                )}
             </div>
          </div>
        </div>
      </nav>

      <div className={`${isGodzillaMode ? 'bg-black border-red-900' : 'bg-white border-b'} sticky top-[65px] z-[55] overflow-x-auto no-scrollbar shadow-sm transition-colors`}>
        <div className="max-w-7xl mx-auto flex items-center gap-2 p-3 px-4">
          {businessTemplates.map((t) => (
            <button
              key={t.id} onClick={() => { setSelectedTemplate(t); setWeights(t.weights); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap text-sm font-bold transition-all ${selectedTemplate.id === t.id ? (isGodzillaMode ? 'bg-red-600 text-black shadow-[0_0_10px_red]' : 'bg-indigo-600 text-white shadow-lg') : (isGodzillaMode ? 'bg-gray-900 text-red-700 hover:bg-gray-800' : 'bg-slate-50 text-slate-500 hover:bg-slate-100')}`}
            >
              {t.icon} {t.name}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-7xl mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
        <aside className="lg:col-span-4 space-y-6">
          
          {/* --- LEWY PANEL: PRZEŁĄCZALNY (WAGI / SZCZEGÓŁY) --- */}
          <div className={`${cardClass} p-6 h-[600px] overflow-hidden flex flex-col relative`}>
             <div className="flex justify-between items-center mb-6">
                <button 
                  onClick={() => setSidebarView('weights')}
                  disabled={sidebarView === 'weights'}
                  className={`p-1.5 rounded-full transition-colors ${sidebarView === 'weights' ? 'opacity-30 cursor-not-allowed' : (isGodzillaMode ? 'hover:bg-red-900/40 text-red-500' : 'hover:bg-slate-100 text-slate-600')}`}
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <h3 className={`text-xs font-black flex items-center gap-2 uppercase ${subTextClass}`}>
                  {sidebarView === 'weights' ? (
                    <>
                       <SlidersHorizontal className={`w-4 h-4 ${accentClass}`} /> Panel Sterowania
                    </>
                  ) : (
                    <>
                       <Info className={`w-4 h-4 ${accentClass}`} /> Szczegóły Lokalizacji
                    </>
                  )}
                </h3>

                <button 
                  onClick={() => setSidebarView('details')}
                  disabled={sidebarView === 'details'}
                  className={`p-1.5 rounded-full transition-colors ${sidebarView === 'details' ? 'opacity-30 cursor-not-allowed' : (isGodzillaMode ? 'hover:bg-red-900/40 text-red-500' : 'hover:bg-slate-100 text-slate-600')}`}
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
             </div>

             <div className="flex-1 overflow-y-auto custom-scrollbar relative">
                
                {/* WIDOK 1: SUWAKI (WAGI) */}
                {sidebarView === 'weights' && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
                    {weights.map((cat) => (
                      <div key={cat.id} className={`border rounded-xl overflow-hidden ${isGodzillaMode ? 'border-red-900' : 'border-slate-100'}`}>
                        <div className={`${isGodzillaMode ? 'bg-gray-900' : 'bg-slate-50'} p-3`}>
                          <div className="flex items-center justify-between mb-2">
                            <button onClick={() => toggleCategory(cat.id)} className={`flex items-center gap-2 text-sm font-black uppercase hover:opacity-80 transition-colors ${textClass}`}>
                                {expandedCategories[cat.id] ? <ChevronDown className="w-4 h-4"/> : <ChevronRight className="w-4 h-4"/>}
                                {cat.name}
                            </button>
                            <span className={`border px-2 py-0.5 rounded text-[10px] font-bold ${isGodzillaMode ? 'bg-black border-red-600 text-red-500' : 'bg-white text-indigo-600'}`}>
                              {cat.value}
                            </span>
                          </div>
                          <input type="range" min="0" max="5" step="1" value={cat.value} onChange={(e) => handleMainWeightChange(cat.id, parseInt(e.target.value))} className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer ${isGodzillaMode ? 'bg-red-900 accent-red-500' : 'bg-slate-200 accent-indigo-600'}`} />
                        </div>
                        {expandedCategories[cat.id] && (
                          <div className={`p-3 space-y-3 border-t ${isGodzillaMode ? 'bg-black border-red-900' : 'bg-white border-slate-100'}`}>
                            {cat.subcategories.map((sub) => (
                              <div key={sub.name} className={`pl-2 border-l-2 ${isGodzillaMode ? 'border-red-900' : 'border-slate-100'}`}>
                                <div className="flex justify-between items-center mb-1">
                                  <span className={`text-xs font-medium ${subTextClass}`}>{sub.name}</span>
                                  <span className={`text-[10px] font-mono ${subTextClass}`}>{sub.value}</span>
                                </div>
                                <input type="range" min="0" max="5" step="1" value={sub.value} onChange={(e) => handleSubWeightChange(cat.id, sub.name, parseInt(e.target.value))} className={`w-full h-1 rounded-lg appearance-none cursor-pointer ${isGodzillaMode ? 'bg-gray-800 accent-red-500' : 'bg-slate-100 accent-slate-400 hover:accent-indigo-400'}`} />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* WIDOK 2: SZCZEGÓŁY LOKALIZACJI */}
                {sidebarView === 'details' && (
                  <div className="animate-in fade-in slide-in-from-right-4 duration-300 h-full">
                     {selectedLocation && selectedLocation.categoryDetails ? (
                        <div className="space-y-6">
                           <div className={`p-4 rounded-2xl text-center ${isGodzillaMode ? 'bg-black/50 border border-red-900' : 'bg-indigo-50 border border-indigo-100'}`}>
                              <h2 className={`text-lg font-black leading-tight mb-1 ${textClass}`}>{selectedLocation.name}</h2>
                              <p className={`text-[10px] uppercase tracking-widest ${subTextClass}`}>Wybrana lokalizacja</p>
                              <div className={`mt-4 text-5xl font-black ${accentClass}`}>
                                 {selectedLocation.score}%
                              </div>
                           </div>
                           
                           <div className="space-y-4">
                               <p className={`text-[10px] font-black uppercase text-center mb-2 ${subTextClass}`}>Szczegółowa Analiza</p>
                               
                               <div className={`p-4 rounded-xl border ${isGodzillaMode ? 'border-red-900 bg-gray-900' : 'border-slate-100 bg-white'}`}>
                                   <div className="flex justify-between items-center mb-2">
                                       <span className="flex items-center gap-2 text-xs font-bold"><Store className="w-4 h-4 text-indigo-400" /> Miejsca Publiczne</span>
                                       <span className="text-sm font-black">{selectedLocation.categoryDetails.public} pkt</span>
                                   </div>
                                   <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                       <div className="h-full bg-indigo-500 rounded-full transition-all duration-1000" style={{ width: `${selectedLocation.categoryDetails.public}%` }} />
                                   </div>
                               </div>

                               <div className={`p-4 rounded-xl border ${isGodzillaMode ? 'border-red-900 bg-gray-900' : 'border-slate-100 bg-white'}`}>
                                   <div className="flex justify-between items-center mb-2">
                                       <span className="flex items-center gap-2 text-xs font-bold"><Bus className="w-4 h-4 text-blue-400" /> Transport</span>
                                       <span className="text-sm font-black">{selectedLocation.categoryDetails.transport} pkt</span>
                                   </div>
                                   <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                       <div className="h-full bg-blue-500 rounded-full transition-all duration-1000" style={{ width: `${selectedLocation.categoryDetails.transport}%` }} />
                                   </div>
                               </div>

                                <div className={`p-4 rounded-xl border ${isGodzillaMode ? 'border-red-900 bg-gray-900' : 'border-slate-100 bg-white'}`}>
                                   <div className="flex justify-between items-center mb-2">
                                       <span className="flex items-center gap-2 text-xs font-bold"><Users className="w-4 h-4 text-green-400" /> Mieszkańcy</span>
                                       <span className="text-sm font-black">{selectedLocation.categoryDetails.residents} pkt</span>
                                   </div>
                                   <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                       <div className="h-full bg-green-500 rounded-full transition-all duration-1000" style={{ width: `${selectedLocation.categoryDetails.residents}%` }} />
                                   </div>
                               </div>

                                <div className={`p-4 rounded-xl border ${isGodzillaMode ? 'border-red-900 bg-gray-900' : 'border-slate-100 bg-white'}`}>
                                   <div className="flex justify-between items-center mb-2">
                                       <span className="flex items-center gap-2 text-xs font-bold"><Building2 className="w-4 h-4 text-orange-400" /> Nasycenie Rynku</span>
                                       <span className="text-sm font-black">{100 - selectedLocation.categoryDetails.competition} pkt</span>
                                   </div>
                                   <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                       <div className="h-full bg-orange-500 rounded-full transition-all duration-1000" style={{ width: `${100 - selectedLocation.categoryDetails.competition}%` }} />
                                   </div>
                                   <p className={`text-[10px] mt-2 italic ${subTextClass}`}>Wyższy wynik oznacza mniejszą konkurencję.</p>
                               </div>

                           </div>
                        </div>
                     ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center opacity-50 p-6">
                           <MapPin className="w-12 h-12 mb-4 text-gray-400" />
                           <p className="text-sm font-bold">Wybierz lokalizację</p>
                           <p className="text-xs mt-2">Kliknij pinezkę na mapie lub pozycję na liście rankingu, aby zobaczyć szczegóły.</p>
                        </div>
                     )}
                  </div>
                )}

             </div>
          </div>

        </aside>

        <section className="lg:col-span-8 space-y-6">
          <div className={`${cardClass} p-2 h-[500px] relative overflow-hidden group`}>
            <div ref={mapContainer} className="w-full h-full rounded-[2.2rem]" />
            {isGodzillaMode && (
                <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
                    <div className="absolute bottom-0 left-[-200px] animate-[walk_8s_linear_infinite]">
                        <div className="relative">
                            <div className="w-48 h-64 bg-green-900 rounded-t-full relative">
                                <div className="absolute top-10 right-8 w-4 h-4 bg-red-500 rounded-full animate-pulse" />
                                <div className="absolute -left-4 top-10 space-y-2">
                                    {[...Array(5)].map((_, i) => (<div key={i} className="w-8 h-8 bg-blue-500 rotate-45 shadow-[0_0_15px_rgba(59,130,246,0.8)]" />))}
                                </div>
                                <div className="absolute top-8 left-40 w-max -rotate-12">
                                  <span className="text-5xl font-black italic tracking-widest fire-text block">RAM-PAM-PAM</span>
                                </div>
                            </div>
                            <div className="absolute bottom-0 -left-20 w-32 h-16 bg-green-950 rounded-full -rotate-12" />
                        </div>
                    </div>
                    <div className="absolute inset-0 bg-[radial-gradient(circle,transparent_50%,rgba(255,0,0,0.4)_100%)]"></div>
                </div>
            )}
            <div className="absolute top-6 left-6 pointer-events-none z-30">
              <div className={`${isGodzillaMode ? 'bg-black/80 border-red-500 shadow-red-500/50' : 'bg-white/90 border-white/20'} backdrop-blur-md px-4 py-2 rounded-2xl shadow-xl border`}>
                <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${accentClass}`}>{isGodzillaMode ? "DANGER ZONE" : "Mapa Terenu 3D"}</p>
                <div className={`flex items-center gap-2 font-black ${isGodzillaMode ? 'text-red-500 animate-pulse' : 'text-slate-800'}`}>Kraków, Polska {isGodzillaMode && "⚠️"}</div>
              </div>
            </div>
          </div>

          {userLocations.length > 0 && (
            <div className={`${cardClass} overflow-visible animate-in slide-in-from-bottom-4`}>
                <div className={`p-4 border-b flex justify-between items-center ${isGodzillaMode ? 'bg-gray-900 border-red-900' : 'bg-indigo-50 border-slate-100'}`}>
                    <span className={`font-black text-xs uppercase tracking-tighter ${isGodzillaMode ? 'text-red-500' : 'text-indigo-800'}`}>Ranking Twoich Lokalizacji</span>
                    <button onClick={() => { setUserLocations([]); setSelectedLocation(null); }} className={`${isGodzillaMode ? 'text-red-500 hover:text-white' : 'text-indigo-600 hover:text-red-600'} p-1.5 rounded-lg transition-colors`}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                </div>
                <div className="max-h-[300px] overflow-y-auto overflow-x-visible p-2 relative">
                    {sortedUserLocations.map((loc, i) => {
                        return (
                        <button
                            key={loc.id}
                            onClick={() => handleLocationSelect(loc)}
                            onMouseEnter={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                setHoverItem({
                                    visible: true,
                                    location: loc,
                                    x: rect.left + rect.width / 2, 
                                    y: rect.top
                                });
                            }}
                            onMouseLeave={() => setHoverItem(prev => ({ ...prev, visible: false }))}
                            className={`group w-full p-4 mb-2 rounded-xl flex justify-between items-center text-left transition-all cursor-pointer ${
                                isGodzillaMode
                                ? 'bg-black/40 border border-red-900 hover:bg-red-900/20 text-green-400'
                                : 'bg-white border border-slate-100 hover:bg-slate-50 hover:shadow-md text-slate-800'
                            } ${
                                selectedLocation?.id === loc.id ? (isGodzillaMode ? 'bg-red-900/40 border-red-500' : 'bg-indigo-50 border-indigo-200 ring-2 ring-indigo-500/20') : ''
                            }`}
                        >
                             <div className="flex items-center gap-3">
                                <div 
                                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black group-hover:scale-110 transition-transform text-white shadow-md border-2 border-white"
                                    style={{ backgroundColor: loc.loading ? '#9ca3af' : getScoreColor(loc.score) }}
                                >
                                    {i + 1}
                                </div>
                                <div>
                                    <p className={`text-xs font-bold line-clamp-1 group-hover:${accentClass}`}>{loc.name}</p>
                                    <p className={`text-[10px] ${subTextClass}`}>Kliknij, aby zobaczyć szczegóły w panelu</p>
                                </div>
                            </div>
                            {loc.loading ? (
                                <span className="text-xs italic text-gray-400 animate-pulse">Analiza...</span>
                            ) : (
                                <span 
                                    className="font-black text-lg" 
                                    style={{ color: getScoreColor(loc.score) }}
                                >
                                    {loc.score}%
                                </span>
                            )}
                        </button>
                    );
                    })}
                </div>
            </div>
          )}

          {selectedDistrict && (
            <div className={`${cardClass} p-8 animate-in fade-in slide-in-from-bottom-6`}>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className={`text-4xl font-black tracking-tighter ${isGodzillaMode ? 'text-red-600 drop-shadow-[0_0_5px_red]' : 'text-slate-900'}`}>{selectedDistrict.name}</h2>
                  <p className={`${subTextClass} font-bold uppercase text-xs tracking-widest`}>{selectedDistrict.type}</p>
                </div>
                <div className="text-right">
                  <p className={`text-[10px] font-black uppercase ${subTextClass}`}>Match Score</p>
                  <p className={`text-4xl font-black ${accentClass}`}>{selectedDistrict.matchScore}%</p>
                </div>
              </div>
              <div className={`${isGodzillaMode ? 'bg-red-950 shadow-[0_0_20px_red]' : 'bg-indigo-900 shadow-xl'} p-8 rounded-[2rem] text-white relative overflow-hidden transition-all duration-500`}>
                <BrainCircuit className="absolute -right-10 -bottom-10 w-40 h-40 opacity-10" />
                <div className="relative z-10">
                  <h4 className={`font-black text-lg mb-2 flex items-center gap-2 ${isGodzillaMode ? 'text-red-400' : 'text-indigo-400'}`}>
                    <BrainCircuit className="w-5 h-5" /> Werdykt AI
                  </h4>
                  <p className={`${isGodzillaMode ? 'text-red-200' : 'text-indigo-100'} leading-relaxed italic`}>
                    "{selectedDistrict.name} to lokalizacja o profilu {selectedDistrict.type}. Przy obecnych ustawieniach, jest to {selectedDistrict.matchScore && selectedDistrict.matchScore > 70 ? 'rekomendowany' : 'alternatywny'} wybór dla biznesu typu {selectedTemplate.name}."
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
      
      {hoverItem.visible && hoverItem.location?.categoryDetails && (
         <div 
            className={`fixed w-56 p-3 rounded-xl shadow-2xl pointer-events-none z-[9999] transition-opacity duration-200 ${
                isGodzillaMode ? 'bg-black border border-red-600' : 'bg-white border border-indigo-100'
            }`}
            style={{ 
                left: hoverItem.x, 
                top: hoverItem.y,
                transform: 'translate(-50%, -110%)'
            }}
         >
             <div 
                className={`absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-3 h-3 rotate-45 border-r border-b ${
                    isGodzillaMode ? 'bg-black border-red-600' : 'bg-white border-indigo-100'
                }`}
             ></div>
             
             <div className="relative z-10 space-y-2">
                 <p className={`text-[10px] font-black uppercase text-center mb-2 ${isGodzillaMode ? 'text-red-500' : 'text-slate-400'}`}>Szybki Podgląd</p>
                 
                 <div className="flex items-center gap-2">
                     <Store className="w-3 h-3 text-indigo-400" />
                     <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                         <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${hoverItem.location.categoryDetails.public}%` }} />
                     </div>
                 </div>

                 <div className="flex items-center gap-2">
                     <Bus className="w-3 h-3 text-blue-400" />
                     <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                         <div className="h-full bg-blue-500 rounded-full" style={{ width: `${hoverItem.location.categoryDetails.transport}%` }} />
                     </div>
                 </div>

                  <div className="flex items-center gap-2">
                     <Users className="w-3 h-3 text-green-400" />
                     <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                         <div className="h-full bg-green-500 rounded-full" style={{ width: `${hoverItem.location.categoryDetails.residents}%` }} />
                     </div>
                 </div>

                  <div className="flex items-center gap-2">
                     <Building2 className="w-3 h-3 text-orange-400" />
                     <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                         <div className="h-full bg-orange-500 rounded-full" style={{ width: `${100 - hoverItem.location.categoryDetails.competition}%` }} />
                     </div>
                 </div>
             </div>
         </div>
     )}

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: ${isGodzillaMode ? '#111' : '#f1f5f9'}; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: ${isGodzillaMode ? '#550000' : '#cbd5e1'}; border-radius: 20px; }
        @keyframes walk { 0% { left: -300px; } 100% { left: 110%; } }
        .fire-text { color: rgb(255, 200, 0); text-shadow: 0px -2px 4px #fff, 0px -2px 10px #FF3, 0px -10px 20px #F90, 0px -20px 40px #C33; animation: burn 0.15s infinite alternate; }
        @keyframes burn { from { text-shadow: 0px -2px 4px #fff, 0px -2px 10px #FF3, 0px -10px 20px #F90, 0px -20px 40px #C33; } to { text-shadow: 0px 0px 4px #fff, 0px 0px 8px #FF3, 0px -7px 18px #F90, 0px -12px 35px #C33; } }
      `}</style>
    </div>
  );
};

export default App;