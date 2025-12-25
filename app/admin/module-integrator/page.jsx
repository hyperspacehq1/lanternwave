import ModuleIntegratorClient from "./ModuleIntegratorClient";

export default function ModuleIntegratorPage() {
  // Auth is already enforced by middleware or higher-level layout
  return <ModuleIntegratorClient />;
}
