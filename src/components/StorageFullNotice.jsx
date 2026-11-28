import { useEffect } from "react";
import { useToast } from "../hooks/useToast";
import { tx } from "../lib/i18n/tx";

// Tells the person when the device refused to save (usually: storage is full).
// Shows at most once per minute so a retry loop cannot spam the screen.
export default function StorageFullNotice() {
  const toast = useToast();
  useEffect(() => {
    let last = 0;
    const onFail = () => {
      if (Date.now() - last < 60000) return;
      last = Date.now();
      toast(tx("مش قادر يحفظ على الجهاز. المساحة ممكن تكون مليانة. صدّر نسخة احتياطية وفضّي مساحة."));
    };
    window.addEventListener("gymak-save-failed", onFail);
    return () => window.removeEventListener("gymak-save-failed", onFail);
  }, [toast]);
  return null;
}
