import ProtectedClientProviders from "@/components/ProtectedClientProviders";

export const dynamic = "force-dynamic";

export default function ProtectedLayout({ children }) {
  return <ProtectedClientProviders>{children}</ProtectedClientProviders>;
}