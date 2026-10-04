const ROOT="https://raw.githubusercontent.com/Hidencod/tge-assets/main/packs";
export const ASSETS={
  root:ROOT,
  road:(name)=>`${ROOT}/city-kit-roads/${name}.glb`,
  building:(name)=>`${ROOT}/city-kit-suburban/${name}.glb`,
  commercial:(name)=>`${ROOT}/city-kit-commercial/${name}.glb`,
  tree:(name)=>`${ROOT}/nature-kit/${name}.glb`,
  car:(name)=>`${ROOT}/car-kit/${name}.glb`
};
export const CITY_ROADS=["road-straight","road-crossroad","road-intersection","road-curve","road-bend","road-roundabout"];
export const CITY_BUILDINGS=Array.from({length:21},(_,i)=>String.fromCharCode(97+i)).map(x=>"building-type-"+x);