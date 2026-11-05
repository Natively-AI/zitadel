"use client";

// NativelyAI fork: lets the design preview turn off autofocus. The real screens put the
// cursor in their first field; the preview renders ~30 screens on one page, and each one
// grabbing focus makes the browser jump down the page.

import { createContext, ReactNode, useContext } from "react";

const AutoFocusContext = createContext(true);

export function useAutoFocus(): boolean {
  return useContext(AutoFocusContext);
}

export function DisableAutoFocus({ children }: { children: ReactNode }) {
  return <AutoFocusContext.Provider value={false}>{children}</AutoFocusContext.Provider>;
}
