import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import AppShell from "@/components/AppShell";
import Home from "@/pages/Home";
import Level1 from "@/pages/Level1";
import Level2 from "@/pages/Level2";
import Ingest from "@/pages/Ingest";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<Home />} />
          <Route path="/level-1" element={<Level1 />} />
          <Route path="/level-2" element={<Level2 />} />
          <Route path="/ingest" element={<Ingest />} />
        </Route>
      </Routes>
    </Router>
  );
}
