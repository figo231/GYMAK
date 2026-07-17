import { lazy } from "react";
import { createBrowserRouter } from "react-router-dom";
import TabShell from "./components/layout/TabShell";
import DetailShell, { ChatShell } from "./components/layout/DetailShell";
import RouteError from "./components/RouteError";
import ProtectedRoute from "./components/ProtectedRoute";

const Dashboard = lazy(() => import("./pages/Dashboard/Dashboard"));
const Exercises = lazy(() => import("./pages/Exercises/Exercises"));
const Stats = lazy(() => import("./pages/Stats/Stats"));
const Profile = lazy(() => import("./pages/Profile/Profile"));
const ExerciseDetail = lazy(() => import("./pages/ExerciseDetail/ExerciseDetail"));
const Programs = lazy(() => import("./pages/Programs/Programs"));
const AiCoach = lazy(() => import("./pages/AiCoach/AiCoach"));

const AuthShell = lazy(() => import("./pages/Auth/AuthShell"));
const Login = lazy(() => import("./pages/Auth/Login"));
const Register = lazy(() => import("./pages/Auth/Register"));
const ForgotPassword = lazy(() => import("./pages/Auth/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/Auth/ResetPassword"));
const Account = lazy(() => import("./pages/Auth/Account"));

export const router = createBrowserRouter([
  {
    element: <TabShell />,
    errorElement: <RouteError />,
    children: [
      { path: "/", element: <Dashboard /> },
      { path: "/exercises", element: <Exercises /> },
      { path: "/stats", element: <Stats /> },
      { path: "/profile", element: <Profile /> },
    ],
  },
  {
    element: <DetailShell />,
    errorElement: <RouteError />,
    children: [
      { path: "/exercise/:id", element: <ExerciseDetail /> },
      { path: "/programs", element: <Programs /> },
      { path: "/account", element: <ProtectedRoute><Account /></ProtectedRoute> },
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
