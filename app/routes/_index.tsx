import type { V2_MetaFunction } from "@remix-run/node";
import { useNavigate } from "@remix-run/react";
import { useEffect } from "react";

export const meta: V2_MetaFunction = () => [{ title: "Profiler" }];

export default function Index() {
  const redirect = useNavigate();
  useEffect(() => {
    redirect("/profiler/accept");
  }, [redirect]);

  return <div>Redirecting...</div>;
}
