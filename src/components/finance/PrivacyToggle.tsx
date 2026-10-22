import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePrivacy } from "@/lib/privacy";

export function PrivacyToggle() {
  const { hidden, toggle } = usePrivacy();
  const label = hidden ? "Mostrar valores" : "Ocultar valores";
  return (
    <Button variant="outline" size="icon" onClick={toggle} aria-label={label} title={label}>
      {hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </Button>
  );
}
