// import { useState } from 'react' // No longer needed
// import reactLogo from './assets/react.svg' // No longer needed
// import viteLogo from '/vite.svg' // No longer needed
// import './App.css' // We'll rely on Tailwind and index.css for now
import GlobeDisplay from './components/visualization/GlobeDisplay'; // Changed import

function App() {
  // const [count, setCount] = useState(0) // No longer needed

  return (
    <GlobeDisplay /> // Changed component
  );
}

export default App;
