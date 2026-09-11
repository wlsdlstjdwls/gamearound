import { SignIn } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { AUTH_DISABLED } from "@/lib/auth-flag";

export default function Page() {
  if (AUTH_DISABLED) redirect("/");
  return <div className="flex justify-center py-10"><SignIn /></div>;
}
