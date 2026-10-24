import { redirect } from "next/navigation";

/** proxy.ts sends `/` to the sign-in or the dashboard; this is the fallback. */
export default function Home() {
  redirect("/super-admin");
}
