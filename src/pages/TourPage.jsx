import { useNavigate } from "react-router-dom";
import Onboarding from "../components/Onboarding";
export default function TourPage() {
  const nav = useNavigate();
  return <Onboarding onFinish={() => nav("/profile", { replace: true })} />;
}
