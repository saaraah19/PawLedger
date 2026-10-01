import { useEffect } from "react";

/** Sets the browser tab title, so history entries and tabs say where you are. */
export function useTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} \u00b7 PawLedger` : "PawLedger";
  }, [title]);
}
