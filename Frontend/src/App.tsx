import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  MapPin, Coffee, Search, BrainCircuit,
  SlidersHorizontal, BarChart3,
  Utensils, Dumbbell, Sparkles, Croissant, Beer, ShoppingBasket,
  X
} from 'lucide-react';

// Import MapLibre
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

// --- INTERFEJSY ---
interface Weights {
  pop: number;
  density: number;
  income: number;
  traffic: number;
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
}

interface BusinessTemplate {
  id: string;
  name: string;
  icon: React.ReactNode;
  weights: Weights;
}

// --- DANE ---
const businessTemplates: BusinessTemplate[] = [
  { id: 'cafe', name: 'Kawiarnia', icon: <Coffee className="w-4 h-4" />, weights: { pop: 30, density: 20, income: 20, traffic: 30 } },
  { id: 'restaurant', name: 'Restauracja', icon: <Utensils className="w-4 h-4" />, weights: { pop: 20, density: 10, income: 40, traffic: 30 } },
  { id: 'grocery', name: 'Delikatesy', icon: <ShoppingBasket className="w-4 h-4" />, weights: { pop: 50, density: 30, income: 10, traffic: 10 } },
  { id: 'gym', name: 'Siłownia', icon: <Dumbbell className="w-4 h-4" />, weights: { pop: 40, density: 40, income: 10, traffic: 10 } },
  { id: 'beauty', name: 'Salon Beauty', icon: <Sparkles className="w-4 h-4" />, weights: { pop: 20, density: 20, income: 50, traffic: 10 } },
  { id: 'bakery', name: 'Piekarnia', icon: <Croissant className="w-4 h-4" />, weights: { pop: 40, density: 40, income: 10, traffic: 10 } },
  { id: 'pub', name: 'Bar/Pub', icon: <Beer className="w-4 h-4" />, weights: { pop: 10, density: 20, income: 30, traffic: 40 } },
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

async function sendLocation(lon_from_map: number, lat_from_map: number) {
  const res = await fetch("http://127.0.0.1:8000/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lat: lat_from_map, lon: lon_from_map})
  });

  const data = await res.json();
  console.log(data); // działa
}


const App: React.FC = () => {
  const [selectedTemplate, setSelectedTemplate] = useState(businessTemplates[0]);
  const [weights, setWeights] = useState(businessTemplates[0].weights);
  const [selectedDistrict, setSelectedDistrict] = useState<any>(null);

  // --- STANY WYSZUKIWARKI ---
  const [addressInput, setAddressInput] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);

  // --- INICJALIZACJA MAPY ---
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
      mapInstance.current!.addSource('terrainSource', {
        type: 'raster-dem',
        tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
        encoding: 'terrarium',
        tileSize: 256,
        maxzoom: 14
      });
      mapInstance.current!.setTerrain({ source: 'terrainSource', exaggeration: 1.5 });
    });

    // --- KLIKNIĘCIE NA MAPIE ---
    mapInstance.current.on('click', async (e) => {
      const { lng, lat } = e.lngLat;
      sendLocation(lng, lat);

      // Usuń starą pinezkę
      // if (markerRef.current) markerRef.current.remove();

      // Dodaj nową pinezkę
      markerRef.current = new maplibregl.Marker({ color: '#f43f5e' })
        .setLngLat([lng, lat])
        .addTo(mapInstance.current!);

      // Przesuń mapę
      mapInstance.current!.flyTo({ center: [lng, lat], zoom: 16, pitch: 60, duration: 1000 });

      // Reverse geocoding (Photon)
      try {
        const res = await fetch(`https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}&lang=pl`);
        const data = await res.json();
        const name = data.features?.[0]?.properties?.name || `Wybrano współrzędne: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        setAddressInput(name);
      } catch {
        setAddressInput(`Wybrano współrzędne: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      }

      setSearchResults([]);
    });

    return () => {
      mapInstance.current?.remove();
      mapInstance.current = null;
    };
  }, []);

  // --- LOGIKA WYSZUKIWANIA (Photon API) ---
  useEffect(() => {
    const searchAddress = async () => {
      if (addressInput.length < 3) {
        setSearchResults([]);
        return;
      }
      setIsSearching(true);
      try {
        const res = await fetch(
          `https://photon.komoot.io/api/?q=${encodeURIComponent(addressInput)}&lat=50.061&lon=19.937&limit=5&lang=pl`
        );
        const data = await res.json();
        setSearchResults(data.features || []);
      } catch (err) {
        console.error("Geocoding error:", err);
      } finally {
        setIsSearching(false);
      }
    };

    const debounce = setTimeout(searchAddress, 300);
    return () => clearTimeout(debounce);
  }, [addressInput]);

  // --- WYBÓR ADRESU Z LISTY ---
  const handleSelectAddress = (feature: any) => {
    if (!mapInstance.current) return;
    const [lng, lat] = feature.geometry.coordinates;
    if (markerRef.current) markerRef.current.remove();

    markerRef.current = new maplibregl.Marker({ color: '#4f46e5', scale: 1.2 })
      .setLngLat([lng, lat])
      .addTo(mapInstance.current);

    mapInstance.current.flyTo({ center: [lng, lat], zoom: 16, pitch: 60, duration: 2000 });

    const p = feature.properties;
    const name = p.name || p.street || "Wybrany punkt";
    const number = p.housenumber ? ` ${p.housenumber}` : "";

    setAddressInput(`${name}${number}`);
    setSearchResults([]);
  };

  // --- LOT DO DZIELNICY ---
  useEffect(() => {
    if (selectedDistrict && mapInstance.current) {
      mapInstance.current.flyTo({
        center: selectedDistrict.coords,
        zoom: 14,
        pitch: 60,
        duration: 2000,
        essential: true
      });
    }
  }, [selectedDistrict]);

  // --- OBLICZANIE WYNIKÓW ---
  const scoredDistricts = useMemo(() => {
    const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0) || 1;
    return districtsData.map(d => {
      const sPop = (d.pop / 71000) * 100;
      const sDensity = (d.density / 11000) * 100;
      const sIncome = (d.income / 1.6) * 100;
      const sTraffic = d.traffic * 100;
      const score = ((sPop * weights.pop) + (sDensity * weights.density) + (sIncome * weights.income) + (sTraffic * weights.traffic)) / totalWeight;
      return { ...d, matchScore: Math.round(score) };
    })
    .sort((a, b) => b.matchScore - a.matchScore);
  }, [weights]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* NAVBAR */}
      <nav className="bg-white border-b p-4 sticky top-0 z-[60] shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2 font-black text-xl tracking-tighter uppercase">
            <div className="bg-indigo-600 p-1.5 rounded-lg text-white">
              <MapPin className="w-5 h-5" />
            </div>
            BiznesLokator <span className="text-indigo-600">KRK</span>
          </div>
         
          <div className="relative w-80 md:w-96">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={addressInput}
                onChange={(e) => setAddressInput(e.target.value)}
                placeholder="Wpisz adres (np. Floriańska)..."
                className="w-full pl-10 pr-10 py-2 bg-slate-100 rounded-full text-sm outline-none focus:ring-2 ring-indigo-500"
              />
              {addressInput && (
                <button onClick={() => setAddressInput("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              )}
            </div>

            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-[100]">
                {searchResults.map((feature, i) => {
                  const p = feature.properties;
                  const mainLabel = (p.name || p.street || "Punkt") + (p.housenumber ? ` ${p.housenumber}` : "");
                  const subLabel = [p.postcode, p.city, p.country].filter(Boolean).join(", ");

                  return (
                    <button
                      key={i}
                      onMouseDown={(e) => { e.preventDefault(); handleSelectAddress(feature); }}
                      className="w-full text-left px-4 py-3 text-xs hover:bg-indigo-50 border-b last:border-0 border-slate-50 flex flex-col gap-0.5"
                    >
                      <span className="font-bold text-slate-700">{mainLabel}</span>
                      <span className="text-slate-400 truncate">{subLabel}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* PASEK KATEGORII */}
      <div className="bg-white border-b sticky top-[65px] z-[55] overflow-x-auto no-scrollbar shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center gap-2 p-3 px-4">
          {businessTemplates.map((t) => (
            <button
              key={t.id}
              onClick={() => { setSelectedTemplate(t); setWeights(t.weights); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap text-sm font-bold transition-all ${
                selectedTemplate.id === t.id ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
              }`}
            >
              {t.icon} {t.name}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-7xl mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        <aside className="lg:col-span-4 space-y-6">
          <div className="bg-white p-6 rounded-[2rem] border shadow-sm">
            <h3 className="text-xs font-black text-slate-400 mb-6 flex items-center gap-2 uppercase">
              <SlidersHorizontal className="w-4 h-4 text-indigo-600" /> Priorytety: {selectedTemplate.name}
            </h3>
            <div className="space-y-5">
              {(Object.keys(weights) as Array<keyof Weights>).map(key => (
                <div key={key}>
                  <div className="flex justify-between text-[11px] font-black mb-2 uppercase text-slate-600">
                    <span>{key}</span>
                    <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{weights[key]}%</span>
                  </div>
                  <input
                    type="range" min="0" max="100"
                    value={weights[key]}
                    onChange={(e) => setWeights(prev => ({...prev, [key]: parseInt(e.target.value)}))}
                    className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-[2rem] border shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
              <span className="font-black text-xs uppercase text-slate-500 tracking-tighter">Ranking Dzielnic</span>
              <BarChart3 className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="max-h-[400px] overflow-y-auto">
              {scoredDistricts.map((d, i) => (
                <button
                  key={d.id}
                  onClick={() => setSelectedDistrict(d)}
                  className={`w-full p-4 flex justify-between items-center hover:bg-indigo-50 transition-all border-b border-slate-50 last:border-0 ${selectedDistrict?.id === d.id ? 'bg-indigo-50 font-bold' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black ${i < 3 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                      {i + 1}
                    </div>
                    <span className="text-sm">{d.name}</span>
                  </div>
                  <span className="font-black text-indigo-600">{d.matchScore}%</span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        <section className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-[2rem] border shadow-sm overflow-hidden">
            <div ref={mapContainer} className="h-[600px] w-full" />
          </div>
        </section>
      </main>
    </div>
  );
};

export default App;
