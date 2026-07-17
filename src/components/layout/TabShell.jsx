import { Outlet } from "react-router-dom";
import BottomNav from "./BottomNav";

export default function TabShell() {
  return (
    <>
      <div className="bg-ambient" />
      <div className="app">
        <Outlet />
      </div>
      <BottomNav />
    </>
  );
}
