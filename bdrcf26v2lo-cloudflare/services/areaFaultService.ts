export interface AreaFaultPreset {
  id: string;
  areaName: string;
  faults: string[];
  updatedAt?: string;
  updatedBy?: string;
}

export const DEFAULT_AREA_FAULTS: Record<string, string[]> = {
  'GG': [
    'Drive motor tripped on overload',
    'Pull key / Emergency trip activated',
    'Belt slipping under load',
    'Belt misaligned / tracking off-center',
    'Weightometer calibration error',
    'Blocked chute electronic sensor fault',
    'Spillage build-up under belt',
    'Structural guard-rails loose'
  ],
  'IPC': [
    'Primary crusher feeder stalled',
    'Hydraulic toggle lubrication low',
    'Grizzly feeder rock jam',
    'Rock breaker hydraulic line leak',
    'Discharge conveyor chute blocked',
    'Crusher motor high temperature trip'
  ],
  'Matimba': [
    'Power plant feed conveyor belt torn',
    'Transfer tower dribble chute full',
    'Tensioning winch counterweight jam',
    'Magnetic separator trip',
    'Belt scale zero shift error',
    'Drive gearbox excessive vibration'
  ],
  'Process': [
    'Slurry pump gland seal packing blown',
    'Cyclone inlet manifold blocked',
    'Screen deck rubber panel detached',
    'Thickener underflow pump trip',
    'Density gauge readout anomaly',
    'Spiral feed distributor surge'
  ],
  'Services': [
    'High-pressure water pump cavitation',
    'Air compressor high discharge temp trip',
    'Fire hydrant water ring depressurised',
    'Main MCC breaker protection trip',
    'Substation ventilation fan failed',
    'Sump de-watering pump motor burnt'
  ],
  'Infrastructure': [
    'Civil sump level sensor failed',
    'Substation feeder tripping on earth fault',
    'Overhead lighting string de-energised',
    'Drainage culvert blockage causing flooding',
    'Building HVAC cooling plant down'
  ],
  'Plant 1': [
    'Dense medium drum drive trip',
    'Magnetite recovery circuit underflow blocked',
    'Primary screen vibrating motor bearing noise',
    'Centrifuge basket coal build-up',
    'Desliming spray bar nozzles choked'
  ],
  'Plant 2': [
    'Secondary DMS cyclone inlet pressure low',
    'Flotation cell agitator trip',
    'Filter press hydraulic cylinder leak',
    'Tailings slurry booster pump trip',
    'Flocculant dosing pump diaphragm failure'
  ],
  'SMC': [
    'Bagging plant auto-stitcher jam',
    'Small coal sizing screen cloth torn',
    'Packing scale loadcell error',
    'Palletizer conveyor sensor misaligned',
    'Dust extraction baghouse differential high'
  ],
  'Logistics': [
    'Rapid train loadout gate hydraulic seal leak',
    'Weighbridge weigh-in sensor offline',
    'Silo discharge vibrator failed',
    'Sampler automatic cutter arm jammed',
    'Rail wagon indexer positioner fault'
  ],
  'Mining': [
    'Pit pontoon pump dry-run trip',
    'Booster skid engine high coolant temp',
    'Diesel dewatering pump airlock',
    'Flexible discharge pipe burst',
    'Haul road sump overflow warning'
  ],
  'Workshop': [
    'Overhead gantry crane hoist limit trip',
    'Heavy vehicle washbay pressure pump down',
    'Mobile compressor engine service warning',
    'Welding bay exhaust fan motor trip'
  ]
};

export const GENERIC_DEFAULT_FAULTS = [
  'Drive motor tripped on overload',
  'Emergency stop / Pull wire pulled',
  'Conveyor belt tracking off-center',
  'Chute blocked / material jam',
  'Gearbox / Bearing overheating',
  'Hydraulic line leak / low pressure',
  'Sensor / Proximity switch faulty',
  'High vibration / abnormal noise'
];

export const getDefaultFaultsForArea = (areaName: string): string[] => {
  if (!areaName) return GENERIC_DEFAULT_FAULTS;
  
  if (DEFAULT_AREA_FAULTS[areaName]) {
    return [...DEFAULT_AREA_FAULTS[areaName]];
  }

  const foundKey = Object.keys(DEFAULT_AREA_FAULTS).find(
    k => k.toLowerCase() === areaName.toLowerCase()
  );
  if (foundKey) {
    return [...DEFAULT_AREA_FAULTS[foundKey]];
  }

  return [...GENERIC_DEFAULT_FAULTS];
};

const CACHE_KEY = 'cache_area_fault_presets';

export const getCachedAreaFaultPresets = (): Record<string, string[]> => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {}
  return { ...DEFAULT_AREA_FAULTS };
};

export const subscribeAreaFaultPresets = (
  callback: (presets: Record<string, string[]>) => void
): (() => void) => {
  callback(getCachedAreaFaultPresets());
  return () => {};
};

export const saveAreaFaultPresets = async (
  areaName: string,
  faults: string[],
  updatedBy: string
): Promise<void> => {
  const cleanArea = areaName.trim();
  if (!cleanArea) throw new Error('Area name is required');
  
  const cleanFaults = faults
    .map(f => f.trim())
    .filter(f => f.length > 0);

  const cached = getCachedAreaFaultPresets();
  cached[cleanArea] = cleanFaults;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cached));
  } catch {}
};
