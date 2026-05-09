import { Routes, Route } from "react-router-dom";

import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import VerifiedRoute from "./components/VerifiedRoute";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import VerifyOTP from "./pages/VerifyOTP";
import Listings from "./pages/Listings";
import ListingDetail from "./pages/ListingDetail";
import CreateListing from "./pages/CreateListing";
import Dashboard from "./pages/Dashboard";
import Messages from "./pages/Messages";
import Chat from "./pages/Chat";
import Admin from "./pages/Admin";

function App() {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)]">
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -right-20 -top-32 h-72 w-72 rounded-full bg-[var(--accent)] opacity-25 blur-3xl" />
        <div className="absolute left-[-8rem] top-48 h-96 w-96 rounded-full bg-[var(--teal)] opacity-20 blur-3xl" />
        <div className="absolute bottom-[-4rem] left-1/2 h-64 w-[30rem] -translate-x-1/2 rounded-[40%] bg-[var(--sun)] opacity-20 blur-3xl" />
      </div>

      <Navbar />

      <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-6">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-otp" element={<VerifyOTP />} />
          <Route path="/listings" element={<Listings />} />
          <Route path="/listings/:id" element={<ListingDetail />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/messages/chat" element={<Chat />} />
            <Route path="/admin" element={<Admin />} />
          </Route>

          <Route element={<VerifiedRoute />}>
            <Route path="/create" element={<CreateListing />} />
          </Route>
        </Routes>
      </div>
    </div>
  );
}

export default App;
