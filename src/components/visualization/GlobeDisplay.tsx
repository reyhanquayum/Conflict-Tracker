import React, { useEffect, useState, useRef } from 'react';
import Globe from 'react-globe.gl'; // Renamed from Globe to avoid confusion with the library

// We'll need to source a GeoJSON file for country polygons
// For example, from: https://github.com/vasturiano/react-globe.gl/blob/master/example/datasets/ne_110m_admin_0_countries.geojson
// And place it in public/data/geodata/countries.geojson
const GEOJSON_FILE_URL = '/data/geodata/countries.geojson'; 

const GlobeDisplay: React.FC = () => {
  const [countries, setCountries] = useState({ features: [] });
  const globeEl = useRef<any>(null); // For accessing globe instance methods

  useEffect(() => {
    // Load country polygons
    fetch(GEOJSON_FILE_URL)
      .then(res => res.json())
      .then(data => {
        setCountries(data);
      })
      .catch(err => console.error("Error loading GeoJSON:", err));
  }, []);

  useEffect(() => {
    // Auto-rotate globe
    if (globeEl.current) {
      globeEl.current.controls().autoRotate = true;
      globeEl.current.controls().autoRotateSpeed = 0.2;
      // Set a dark background for the globe
      // Access Three.js instance from react-globe.gl
      const threeGlobe = globeEl.current;
      if (threeGlobe && threeGlobe.scene) {
         threeGlobe.scene().background = new (threeGlobe.Three()).Color(0x111111); // Dark grey
      }
    }
  }, [countries]); // Re-apply if countries data changes, or on initial load

  return (
    <div style={{ height: '100vh', width: '100%', backgroundColor: '#000010' /* Dark blue-ish background for the page */ }}>
      <Globe
        ref={globeEl}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg" // Placeholder dark texture
        // For a truly minimalist dark mode, we might use a very dark or black globeImageUrl,
        // or even a solid color if the library supports it and rely on polygon colors.
        // globeImageUrl={null} // Or try with no image and color polygons
        // backgroundColor="rgba(0,0,0,0)" // Transparent background for the globe canvas itself
        
        polygonsData={countries.features}
        polygonCapColor={() => 'rgba(50, 50, 50, 0.7)'} // Dark grey for countries
        polygonSideColor={() => 'rgba(30, 30, 30, 0.3)'}
        polygonStrokeColor={() => '#666'} // Slightly lighter border for countries
        polygonLabel={({ properties }: any) => `
          <b>${properties.ADMIN}</b> <br />
          Population: <i>${properties.POP_EST}</i>
        `}
        // onPolygonHover={hoverD => globeEl.current?.pointOfView({ lat: hoverD.lat, lng: hoverD.lng, altitude: 1 }, 1000)}
        // onPolygonClick={...}

        // Example for custom event markers (Task 2.4) - to be implemented later
        // objectsData={[{ lat: 0, lng: 0, alt: 0, radius: 10, color: 'red', data: {} }]}
        // objectThreeObjectExtend={true}
        // objectThreeObject={obj => {
        //   const geometry = new THREE.SphereGeometry(obj.radius, 16, 16);
        //   const material = new THREE.MeshStandardMaterial({ color: obj.color });
        //   return new THREE.Mesh(geometry, material);
        // }}
      />
    </div>
  );
};

export default GlobeDisplay;
