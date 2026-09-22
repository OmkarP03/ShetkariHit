import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useFarm } from '@/context/FarmContext';
import AppShell from '@/layouts/AppShell';
import Welcome from '@/pages/Welcome';
import Login from '@/pages/Login';
import Signup from '@/pages/Signup';
import SetupFarm from '@/pages/SetupFarm';
import AddPlot from '@/pages/AddPlot';
import Home from '@/pages/Home';
import Ask from '@/pages/Ask';
import Schemes from '@/pages/Schemes';
import Account from '@/pages/Account';
import MyField from '@/pages/MyField';
import MarketPrices from '@/pages/MarketPrices';
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

/**
 * Signed in but with no farm yet: every private route funnels into setup until
 * the farmer → farm → plot → crop chain exists, because every screen past this
 * point is meaningless without a plot to be about.
 */
function RequiresFarm({ children }: { children: JSX.Element }) {
  const { farm, plots, loading } = useFarm();
  if (loading) return <Splash />;
  if (!farm) return <Navigate to="/setup/farm" replace />;
  if (plots.length === 0) return <Navigate to="/setup/plot" replace />;
  return children;
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

      <Route element={<Private><RequiresFarm><AppShell /></RequiresFarm></Private>}>
        {/* bottom nav */}
        <Route path="/today"   element={<Home />} />
        <Route path="/ask"     element={<Ask />} />
        <Route path="/schemes" element={<Schemes />} />
        <Route path="/account" element={<Account />} />

        {/* secondary destinations, reached from cards rather than the nav */}
        <Route path="/field"          element={<MyField />} />
        <Route path="/field/:plotId"  element={<MyField />} />
        <Route path="/market"         element={<MarketPrices />} />
        <Route path="/crop"           element={<CropAdvisory />} />
        <Route path="/advisory"       element={<CropAdvisory />} />
        <Route path="/advisory/:advisoryId" element={<AIRecommendation />} />
      </Route>

      <Route path="*" element={<Navigate to={session ? '/today' : '/welcome'} replace />} />
    </Routes>
  );
}
