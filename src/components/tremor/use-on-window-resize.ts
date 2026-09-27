// Tremor useOnWindowResize [v0.0.2]
// Modified for vosk.dev: none (copied verbatim; file renamed to kebab-case)

import * as React from "react";

export const useOnWindowResize = (handler: () => void) => {
  React.useEffect(() => {
    const handleResize = () => {
      handler();
    };
    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, [handler]);
};
