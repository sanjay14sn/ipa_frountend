import { redirect } from "next/navigation";

export function createRedirectPage(destination: string) {
  return function RedirectPage() {
    redirect(destination);
  };
}
