import { redirect } from "next/navigation";

/** Today is the home page now; old links land there. */
export default function TodayRedirect() {
  redirect("/dashboard");
}
