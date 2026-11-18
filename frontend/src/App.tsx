import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import AppShell from '@/layouts/AppShell';
import Welcome from '@/pages/Welcome';
import Login from '@/pages/Login';
import Signup from '@/pages/Signup';
import SetupFarm from '@/pages/SetupFarm';
import AddPlot from '@/pages/AddPlot';
import Home from '@/pages/Home';
import Schemes from '@/pages/Schemes';
import Account from '@/pages/Account';
import PricePrediction from '@/pages/PricePrediction';
import MyField from '@/pages/MyField';
import CropAdvisory from '@/pages/CropAdvisory';
import AIRecommendation from '@/pages/AIRecommendation';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import Splash from '@/components/Splash';

function Private({ children }: { children: JSX.Element }) {
  const { session, ready } = useAuth();
  if (!ready) return <Splash />;
  return session ? children : <Navigate to="/welcome" replace />;
}

export default function App() {
  const { session, ready } = useAuth();
  if (!ready) return <Splash />;

  return (
    <Routes>
      <Route path="/welcome" element={session ? <Navigate to="/today" replace /> : <Welcome />} />
      <Route path="/login"   element={session ? <Navigate to="/today" replace /> : <Login />} />
      <Route path="/signup"  element={session ? <Navigate to="/today" replace /> : <Signup />} />

      {/* Reachable signed out (reset link) and signed in (change password). */}
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password"  element={<ResetPassword />} />

      <Route path="/setup/farm" element={<Private><SetupFarm /></Private>} />
      <Route path="/setup/plot" element={<Private><AddPlot /></Private>} />

      <Route element={<Private><AppShell /></Private>}>
        {/* bottom nav */}
        <Route path="/today"   element={<Home />} />
        <Route path="/prices"  element={<PricePrediction />} />
        <Route path="/schemes" element={<Schemes />} />
        <Route path="/account" element={<Account />} />

        {/* secondary destinations, reached from cards rather than the nav */}
        <Route path="/field"          element={<MyField />} />
        <Route path="/field/:plotId"  element={<MyField />} />
        <Route path="/market"         element={<Navigate to="/prices" replace />} />
        <Route path="/ask"            element={<Navigate to="/prices" replace />} />
        <Route path="/crop"           element={<CropAdvisory />} />
        <Route path="/advisory"       element={<CropAdvisory />} />
        <Route path="/advisory/:advisoryId" element={<AIRecommendation />} />
      </Route>

      <Route path="*" element={<Navigate to={session ? '/today' : '/welcome'} replace />} />
    </Routes>
  );
}
