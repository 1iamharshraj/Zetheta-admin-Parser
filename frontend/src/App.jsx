import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Jobs from './pages/Jobs';
import Calls from './pages/Calls';
import Candidates from './pages/Candidates';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="jobs" element={<Jobs />} />
          <Route path="calls" element={<Calls />} />
          <Route path="candidates" element={<Candidates />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
