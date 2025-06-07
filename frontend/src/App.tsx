import './App.css'
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { FileUpload } from './components/FileUpload';
import { GraficosComparativos } from './components/Graficos';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<FileUpload />} />
        <Route path="/graficos-comparativos" element={<GraficosComparativos />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;