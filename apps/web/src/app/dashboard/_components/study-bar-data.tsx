import { StudyBar } from "@/components/daily/study-bar";
import { getCurrentUser, isDemoUser } from "@/lib/auth";
import { getActiveFocus } from "@/lib/daily-data";

/** The floating study bar, with the running session (if any) loaded on the server. */
export async function StudyBarWithData() {
  const user = await getCurrentUser();
  if (isDemoUser(user)) return null;
  return <StudyBar active={await getActiveFocus(user.id)} />;
}

// DsaKaro
