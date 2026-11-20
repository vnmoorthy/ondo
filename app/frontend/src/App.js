import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import Landing from "@/pages/Landing";
import Prescription from "@/pages/Prescription";
import Pass from "@/pages/Pass";
import Staff from "@/pages/Staff";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/prescription/:id" element={<Prescription />} />
        <Route path="/pass/:code" element={<Pass />} />
        <Route path="/staff" element={<Staff />} />
      </Routes>
      <Toaster position="top-center" richColors />
    </BrowserRouter>
  );
}

export default App;
