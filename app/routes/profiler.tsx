import { Outlet } from "@remix-run/react";
import "react-toastify/dist/ReactToastify.css";

export default function Profiler() {
  return (
    <div className="h-full w-full">
      <Outlet />
    </div>
  );
}
