import { lazy as reactLazy,createElement } from "react";
import OtaRouteReady from "./components/OtaRouteReady";
const lazy=(load)=>reactLazy(async()=>{const m=await load();return {...m,default:(props)=>createElement(OtaRouteReady,null,createElement(m.default,props))};});
import { Navigate, createBrowserRouter } from "react-router-dom";
import TabShell from "./components/layout/TabShell";
import DetailShell, { ChatShell } from "./components/layout/DetailShell";
import RouteError from "./components/RouteError";
import ProtectedRoute from "./components/ProtectedRoute";

const Dashboard = lazy(() => import("./pages/Dashboard/Dashboard"));

const Exercises = lazy(() => import("./pages/Exercises/Exercises"));
const Stats = lazy(() => import("./pages/Stats/Stats"));
const Profile = lazy(() => import("./pages/Profile/Profile"));
const ExerciseDetail = lazy(() => import("./pages/ExerciseDetail/ExerciseDetail"));
const Measurements = lazy(() => import("./pages/Measurements/Measurements"));
const Achievements = lazy(() => import("./pages/Achievements/Achievements"));
const Photos = lazy(() => import("./pages/Photos/Photos"));
const Programs = lazy(() => import("./pages/Programs/Programs"));
const History = lazy(() => import("./pages/History/History"));
const AiCoach = lazy(() => import("./pages/AiCoach/AiCoach"));

const AuthShell = lazy(() => import("./pages/Auth/AuthShell"));
const Login = lazy(() => import("./pages/Auth/Login"));
const Register = lazy(() => import("./pages/Auth/Register"));
const ForgotPassword = lazy(() => import("./pages/Auth/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/Auth/ResetPassword"));
const Account = lazy(() => import("./pages/Auth/Account"));
const OwnerPanel = lazy(() => import("./pages/Owner/OwnerPanel"));
import Food from "./pages/Food/Food";
import TourPage from "./pages/TourPage";
const Warmup = lazy(() => import("./pages/Help/Warmup"));
const Notifications = lazy(() => import("./pages/Profile/Notifications"));
const Admin = lazy(() => import("./pages/Admin/Admin"));
const Backups = lazy(() => import("./pages/Profile/Backups"));
const Strength = lazy(() => import("./pages/Stats/Strength"));
const Supplements = lazy(() => import("./pages/Help/Supplements"));
const Help = lazy(() => import("./pages/Help/Help"));
const Contact = lazy(() => import("./pages/Contact/Contact"));
const MealPlan = lazy(() => import("./pages/Food/MealPlan"));
const PrivateChat = lazy(() => import("./pages/PrivateChat/PrivateChat"));
const Professionals = lazy(() => import("./pages/Professionals/Professionals"));
const Coach = lazy(() => import("./pages/Coach/Coach"));

export const router = createBrowserRouter([
  {
    element: <TabShell />,
    errorElement: <RouteError />,
    children: [
      { path: "/", element: <Dashboard /> },
      { path: "/training", element: <Navigate to="/exercises" replace /> },
      { path: "/exercises", element: <Exercises /> },
      { path: "/stats", element: <Stats /> },
      { path: "/profile", element: <Profile /> },
      { path: "/food", element: <Food /> },
      { path: "/messages", element: <ProtectedRoute><PrivateChat /></ProtectedRoute> },
      { path: "/professionals", element: <Professionals /> },
      { path: "/tour", element: <TourPage /> },
      { path: "/contact", element: <Contact /> },
      { path: "/help", element: <Help /> },
      { path: "/backups", element: <Backups /> },
      { path: "/notifications", element: <Notifications /> },
      { path: "/strength", element: <Strength /> },
      { path: "/supplements", element: <Supplements /> },
      { path: "/warmup", element: <Warmup /> },
      { path: "/meal-plan", element: <MealPlan /> },
      { path: "/history", element: <History /> },
      { path: "/measurements", element: <Measurements /> },
      { path: "/achievements", element: <Achievements /> },
      { path: "/photos", element: <Photos /> },
      { path: "/programs", element: <Programs /> },
    ],
  },
  {
    element: <DetailShell />,
    errorElement: <RouteError />,
    children: [
      { path: "/exercise/:id", element: <ExerciseDetail /> },
      { path: "/account", element: <ProtectedRoute><Account /></ProtectedRoute> },
      { path: "/coach", element: <ProtectedRoute><Coach /></ProtectedRoute> },
      { path: "/messages/:threadId", element: <ProtectedRoute><PrivateChat /></ProtectedRoute> },
      { path: "/admin", element: <ProtectedRoute><Admin /></ProtectedRoute> },
      { path: "/owner", element: <ProtectedRoute><OwnerPanel /></ProtectedRoute> },
    ],
  },
  {
    element: <ChatShell />,
    errorElement: <RouteError />,
    children: [
      { path: "/ai-coach", element: <AiCoach /> },
    ],
  },
  {
    element: <AuthShell />,
    errorElement: <RouteError />,
    children: [
      { path: "/auth/login", element: <Login /> },
      { path: "/auth/register", element: <Register /> },
      { path: "/auth/forgot-password", element: <ForgotPassword /> },
      { path: "/auth/reset-password", element: <ResetPassword /> },
    ],
  },
]);
