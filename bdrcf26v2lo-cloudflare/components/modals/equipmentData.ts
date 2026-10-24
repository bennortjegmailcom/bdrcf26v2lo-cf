export interface FaultRelation {
  discipline: 'Electrical' | 'Mechanical' | 'Instrumentation' | 'Other';
  commonFaults: string[];
}

export interface EquipmentItem {
  id: string;
  name: string;
  fgNumber: string;
  faultRelations: FaultRelation[];
}

export interface AreaEquipmentMapping {
  areaName: string;
  equipmentList: EquipmentItem[];
}

export const AREA_EQUIPMENT_DATA: AreaEquipmentMapping[] = [
  {
    areaName: 'GG',
    equipmentList: [
      {
        id: 'gg-cv-101',
        name: 'Conveyor Belt A',
        fgNumber: 'CV-101',
        faultRelations: [
          {
            discipline: 'Electrical',
            commonFaults: [
              'Drive motor tripped on overload',
              'Pull key / Emergency trip activated',
              'VSD controller failure',
              'Power supply fault / no power',
              'Under-speed switch sensor faulty',
              'Solenoid coil burned out'
            ]
          },
          {
            discipline: 'Mechanical',
            commonFaults: [
              'Belt slipping under load',
              'Belt misaligned / tracking off-center',
              'Torn belt / splice damaged',
              'Drive pulley bearing hot',
              'Gearbox leaking oil',
              'Seized tail pulley / scraper defect'
            ]
          },
          {
            discipline: 'Instrumentation',
            commonFaults: [
              'Weightometer calibration error',
              'Blocked chute electronic sensor fault',
              'Misalignment switch loop failure',
              'Control room PLC communication lag',
              'RTD temperature transmitter failure'
            ]
          },
          {
            discipline: 'Other',
            commonFaults: [
              'Spillage build-up under belt',
              'Structural guard-rails loose',
              'Excessive dust emission in tunnel'
            ]
          }
        ]
      },
      {
        id: 'gg-cv-102',
        name: 'Conveyor Belt B',
        fgNumber: 'CV-102',
        faultRelations: [
          {
            discipline: 'Electrical',
            commonFaults: [
              'Drive motor tripped on overload',
              'Pull key / Emergency trip activated',
              'VSD controller failure',
              'Power supply fault / no power',
              'Under-speed switch sensor faulty'
            ]
          },
          {
            discipline: 'Mechanical',
            commonFaults: [
              'Belt slipping under load',
              'Belt misaligned / tracking off-center',
              'Torn belt / splice damaged',
              'Bearing temperature high',
              'Gearbox noisy / vibrative'
            ]
          },
          {
            discipline: 'Instrumentation',
            commonFaults: [
              'Weightometer calibration error',
              'Blocked chute electronic sensor fault',
              'Misalignment switch loop failure'
            ]
          },
          {
            discipline: 'Other',
            commonFaults: [
              'Spillage build-up under belt',
              'Severe damage to structure'
            ]
          }
        ]
      },
      {
        id: 'gg-cr-01',
        name: 'Primary Crusher',
        fgNumber: 'CR-01',
        faultRelations: [
          {
            discipline: 'Electrical',
            commonFaults: [
              'Main drive motor starter tripped',
              'Auxiliary lube system pump electrical failure',
              'Interlock sequence trip',
              'High motor current trip'
            ]
          },
          {
            discipline: 'Mechanical',
            commonFaults: [
              'Crusher jammed / block in mantle',
              'V-belts slipping / broken',
              'Discharge chute blocked',
              'Excessive frame vibration',
              'Lube oil pressure too low / oil path blocked',
              'Eccentric shaft bearing hot'
            ]
          },
          {
            discipline: 'Instrumentation',
            commonFaults: [
              'Tramp metal detector tripped falsely',
              'Crusher CSS (Closed-Side Setting) sensor fault',
              'Lube flow transmitter loop broken',
              'Vibration sensor faulty readings'
            ]
          },
          {
            discipline: 'Other',
            commonFaults: [
              'Severe wear on liner plate',
              'Crusher deck safety doors loose'
            ]
          }
        ]
      },
      {
        id: 'gg-cr-02',
        name: 'Secondary Crusher',
        fgNumber: 'CR-02',
        faultRelations: [
          {
            discipline: 'Electrical',
            commonFaults: [
              'Main drive motor starter tripped',
              'Auxiliary lube system pump electrical failure',
              'Interlock sequence trip'
            ]
          },
          {
            discipline: 'Mechanical',
            commonFaults: [
              'Crusher jammed / material bridging',
              'Hydroset pump high pressure',
              'Discharge chute blocked',
              'Main bearing temperature high',
              'Internal grinding noise'
            ]
          },
          {
            discipline: 'Instrumentation',
            commonFaults: [
              'Main PLC panel error code',
              'Lube flow transmitter loop broken',
              'Vibration probe failure'
            ]
          },
          {
            discipline: 'Other',
            commonFaults: [
              'Safety guards missing',
              'Liner plates worn thin'
            ]
          }
        ]
      },
      {
        id: 'gg-vs-301',
        name: 'Vibrating Screen A',
        fgNumber: 'VS-301',
        faultRelations: [
          {
            discipline: 'Electrical',
            commonFaults: [
              'Eccentric motor tripped',
              'Power cable feed damaged by vibration'
            ]
          },
          {
            discipline: 'Mechanical',
            commonFaults: [
              'Screen mesh torn or punctured',
              'Coil spring support broken or weak',
              'Exciters overheating',
              'Uneven feed causing screen tilt',
              'Counterweight bolts loose'
            ]
          },
          {
            discipline: 'Instrumentation',
            commonFaults: [
              'Proximity sensor feed error',
              'Vibration telemetry failure'
            ]
          },
          {
            discipline: 'Other',
            commonFaults: [
              'Product contamination / oversize bypass',
              'High structural noise level'
            ]
          }
        ]
      }
    ]
  },
  {
    areaName: 'IPC',
    equipmentList: [
      {
        id: 'ipc-pu-501',
        name: 'Slurry Pump Station 1',
        fgNumber: 'PU-501',
        faultRelations: [
          {
            discipline: 'Electrical',
            commonFaults: [
              'Pump motor winding hot trip',
              'Starter contactor welding or pitted',
              'Float switch electrical circuit open'
            ]
          },
          {
            discipline: 'Mechanical',
            commonFaults: [
              'Impeller blocked with rags / debris',
              'Gland packing leaking excessively',
              'Direct drive coupling broken',
              'Sump high level / pump dry running',
              'Cavitation noise / discharge check valve stuck'
            ]
          },
          {
            discipline: 'Instrumentation',
            commonFaults: [
              'Ultrasonic level sensor false readings',
              'Discharge pressure transmitter out of spec',
              'Flow switch failure'
            ]
          },
          {
            discipline: 'Other',
            commonFaults: [
              'Sump overflowing with foam',
              'Corrosion on discharge pipe bracket'
            ]
          }
        ]
      },
      {
        id: 'ipc-pu-502',
        name: 'Process Water Pump 2',
        fgNumber: 'PU-502',
        faultRelations: [
          {
            discipline: 'Electrical',
            commonFaults: [
              'Main pump motor tripped',
              'Control voltage fuse blown'
            ]
          },
          {
            discipline: 'Mechanical',
            commonFaults: [
              'Mechanical seal leaking water',
              'Pump lost priming / suction line air leak',
              'Suction strainer blocked',
              'Bearing vibration high'
            ]
          },
          {
            discipline: 'Instrumentation',
            commonFaults: [
              'Pressure transducer signal fault',
              'Thermocouple wire broken'
            ]
          },
          {
            discipline: 'Other',
            commonFaults: [
              'Leaking pipe flange',
              'Pump base plate concrete cracked'
            ]
          }
        ]
      },
      {
        id: 'ipc-rl-10',
        name: 'Reclaimer Machine',
        fgNumber: 'RL-10',
        faultRelations: [
          {
            discipline: 'Electrical',
            commonFaults: [
              'Main trailing cable reel fault',
              'Slew motor brake failure',
              'Bucket-wheel drive motor overload trip',
              'Safety slip ring dirty / open circuit'
            ]
          },
          {
            discipline: 'Mechanical',
            commonFaults: [
              'Bucket wheel tooth broken',
              'Slew gearbox high wear or loud clicking',
              'Travel bogie wheels squealing / seized',
              'Boom luffing hydraulic cylinder leaking oil',
              'Chute lining wear plate detached'
            ]
          },
          {
            discipline: 'Instrumentation',
            commonFaults: [
              'Collision radar system error',
              'Slew angle encoder out of calibration',
              'Luffing cylinder pressure sensor loop fault',
              'Anti-collision limit switch bypassed'
            ]
          },
          {
            discipline: 'Other',
            commonFaults: [
              'Extreme dirt build-up in cabin vicinity',
              'Operator step-ladder bent or loose'
            ]
          }
        ]
      },
      {
        id: 'ipc-st-20',
        name: 'Stacker Machine',
        fgNumber: 'ST-20',
        faultRelations: [
          {
            discipline: 'Electrical',
            commonFaults: [
              'Main breaker tripped in machine house',
              'Luffing pump motor electrical failure',
              'Bypass limit switch error'
            ]
          },
          {
            discipline: 'Mechanical',
            commonFaults: [
              'Stacker conveyor belt torn',
              'Boom pivot heavy friction / lack of grease',
              'Hydraulic hose ruptured',
              'Winch rope frayed'
            ]
          },
          {
            discipline: 'Instrumentation',
            commonFaults: [
              'GPS location tracking down',
              'Wind speed anemometer alarm sensor failure',
              'Tilt sensor alarm on boom'
            ]
          },
          {
            discipline: 'Other',
            commonFaults: [
              'Structural frame weld fatigue',
              'Cabin glass cracked / heater down'
            ]
          }
        ]
      }
    ]
  },
  {
    areaName: 'Matimba',
    equipmentList: [
      {
        id: 'mat-olc-10',
        name: 'Overland Conveyor 1',
        fgNumber: 'OLC-10',
        faultRelations: [
          {
            discipline: 'Electrical',
            commonFaults: [
              'Multi-drive motor synchronization failure',
              '3.3kV substation breaker tripped',
              'Emergency perimeter cable line open loop',
              'HT motor cooling fan failure'
            ]
          },
          {
            discipline: 'Mechanical',
            commonFaults: [
              'High structural drift of belt',
              'Gravity take-up carriage pulley jammed',
              'Fluid coupling slipping / low oil',
              'Tail end bearing failed / lock sleeve loose',
              'Excessive idler drop / frame sag'
            ]
          },
          {
            discipline: 'Instrumentation',
            commonFaults: [
              'Fiber-optic pulse coder telemetry down',
              'Belt rip detection sensor tripped or broken',
              'Vibration relay on main reducer failed',
              'Radio frequency key controller dead'
            ]
          },
          {
            discipline: 'Other',
            commonFaults: [
              'Wind-guard plates detached / blown off',
              'Severe coal spillage at transfer transfer point'
            ]
          }
        ]
      },
      {
        id: 'mat-gm-401',
        name: 'Coal Feed Grinding Mill 1',
        fgNumber: 'GM-401',
        faultRelations: [
          {
            discipline: 'Electrical',
            commonFaults: [
              'Ring gear high voltage motor tripped',
              'Mill lubrication motor starter burnt',
              'Inching drive electrical interlock won’t clear'
            ]
          },
          {
            discipline: 'Mechanical',
            commonFaults: [
              'Trunnion bearing high temperature',
              'Mill pinion gear misalignment / high gear lash',
              'Lube oil flow low / filter choked',
              'Internal lining bolts loose / slurry wash',
              'Feed spout worn / holes in liner'
            ]
          },
          {
            discipline: 'Instrumentation',
            commonFaults: [
              'Mill bearing RTD sensor open circuit',
              'Feed rate controller sensor dead band',
              'Sound level acoustic microphone sensor failure'
            ]
          },
          {
            discipline: 'Other',
            commonFaults: [
              'Severe coal dust leakage from mill trunk',
              'Grinding ball charge level depleted'
            ]
          }
        ]
      },
      {
        id: 'mat-ctf-01',
        name: 'Cooling Tower Fan A',
        fgNumber: 'CTF-01',
        faultRelations: [
          {
            discipline: 'Electrical',
            commonFaults: [
              'Fan motor overload trip',
              'Power cable moisture ingress'
            ]
          },
          {
            discipline: 'Mechanical',
            commonFaults: [
              'Fan blade pitch misalignment / imbalance',
              'Gear reducer loud grinding / lack of oil',
              'Flexible coupling split',
              'Excessive vibration on structural deck'
            ]
          },
          {
            discipline: 'Instrumentation',
            commonFaults: [
              'Vibro-switch fail / interlock trip',
              'Water temperature controller failure'
            ]
          },
          {
            discipline: 'Other',
            commonFaults: [
              'Drift eliminators clogged with dirt / algae',
              'Fan stack casing bolts loose'
            ]
          }
        ]
      }
    ]
  },
  {
    areaName: 'Process',
    equipmentList: [
      {
        id: 'proc-gen-01',
        name: 'Process Plant System',
        fgNumber: 'PROC-01',
        faultRelations: [
          {
            discipline: 'Electrical',
            commonFaults: ['Main feed breaker trip', 'Pump motor overload', 'Control panel fault']
          },
          {
            discipline: 'Mechanical',
            commonFaults: ['Slurry pump seal leak', 'Screen deck blinding', 'Cyclones choked']
          }
        ]
      }
    ]
  },
  {
    areaName: 'Services',
    equipmentList: [
      {
        id: 'serv-gen-01',
        name: 'Plant Water & Air Services',
        fgNumber: 'SERV-01',
        faultRelations: [
          {
            discipline: 'Electrical',
            commonFaults: ['Compressor trip', 'Borehole pump fault', 'Substation power drop']
          },
          {
            discipline: 'Mechanical',
            commonFaults: ['Air line pressure drop', 'Water pipe burst', 'Compressor valve failure']
          }
        ]
      }
    ]
  },
  {
    areaName: 'Infrastructure',
    equipmentList: [
      {
        id: 'infra-gen-01',
        name: 'Civil & Substation Infrastructure',
        fgNumber: 'INFRA-01',
        faultRelations: [
          {
            discipline: 'Electrical',
            commonFaults: ['Transformer oil temp high', 'Substation trip', 'Lighting distribution fault']
          },
          {
            discipline: 'Mechanical',
            commonFaults: ['HVAC cooling failure', 'Sump pump failure']
          }
        ]
      }
    ]
  },
  {
    areaName: 'Plant 1',
    equipmentList: [
      {
        id: 'p1-gen-01',
        name: 'Plant 1 Coal Prep',
        fgNumber: 'P1-01',
        faultRelations: [
          {
            discipline: 'Electrical',
            commonFaults: ['Dense medium pump trip', 'Feeder drive fault']
          },
          {
            discipline: 'Mechanical',
            commonFaults: ['Conveyor belt misaligned', 'Chute block']
          }
        ]
      }
    ]
  },
  {
    areaName: 'Plant 2',
    equipmentList: [
      {
        id: 'p2-gen-01',
        name: 'Plant 2 Washing Circuit',
        fgNumber: 'P2-01',
        faultRelations: [
          {
            discipline: 'Electrical',
            commonFaults: ['Centrifuge drive trip', 'Agitator motor fault']
          },
          {
            discipline: 'Mechanical',
            commonFaults: ['Filter press hydraulic leak', 'Vibrating screen spring broken']
          }
        ]
      }
    ]
  },
  {
    areaName: 'SMC',
    equipmentList: [
      {
        id: 'smc-gen-01',
        name: 'Small Coal Circuit (SMC)',
        fgNumber: 'SMC-01',
        faultRelations: [
          {
            discipline: 'Electrical',
            commonFaults: ['Spiral feed pump trip', 'Bagger conveyor fault']
          },
          {
            discipline: 'Mechanical',
            commonFaults: ['Chute blockage', 'Pump gland packing leak']
          }
        ]
      }
    ]
  },
  {
    areaName: 'Logistics',
    equipmentList: [
      {
        id: 'log-gen-01',
        name: 'Train Loading & Rapid Loadout',
        fgNumber: 'LOG-01',
        faultRelations: [
          {
            discipline: 'Electrical',
            commonFaults: ['Silo gate hydraulic power pack trip', 'Weigh feeder drive fault']
          },
          {
            discipline: 'Mechanical',
            commonFaults: ['Silo hydraulic cylinder leak', 'Sampling plant jam']
          }
        ]
      }
    ]
  },
  {
    areaName: 'Mining',
    equipmentList: [
      {
        id: 'mine-gen-01',
        name: 'Pit De-watering & In-Pit Transport',
        fgNumber: 'MINE-01',
        faultRelations: [
          {
            discipline: 'Electrical',
            commonFaults: ['Trailing cable damage', 'Submersible pump trip']
          },
          {
            discipline: 'Mechanical',
            commonFaults: ['De-watering pipe split', 'Pump impeller wear']
          }
        ]
      }
    ]
  },
  {
    areaName: 'Workshop',
    equipmentList: [
      {
        id: 'ws-gen-01',
        name: 'Central Maintenance Workshop',
        fgNumber: 'WS-01',
        faultRelations: [
          {
            discipline: 'Electrical',
            commonFaults: ['Overhead crane trip', 'Welder plug outlet fault']
          },
          {
            discipline: 'Mechanical',
            commonFaults: ['Overhead crane hoist cable kink', 'Hydraulic press seal leak']
          }
        ]
      }
    ]
  }
];
