"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

// Temporary chat, shared between the header and the conversation.
//
// The control sits in the app header, where the profile avatar used to be, and
// the state it controls belongs to the chat screen underneath. Neither can own
// it alone, so it lives here.
//
// Flipping the mode has to start a clean thread either way: carrying a saved
// conversation into a private one, or the reverse, would quietly do the
// opposite of what the switch promises. The header cannot clear the chat's
// messages itself, so it bumps a token and the chat clears when it changes.

type TemporaryChat = {
  /** True while nothing about this conversation is being stored. */
  temporary: boolean;
  /** Flips the mode and asks the conversation to start fresh. */
  toggle: () => void;
  /** Changes on every flip. The chat watches it and clears. */
  resetToken: number;
};

const Ctx = createContext<TemporaryChat | null>(null);

export function TemporaryChatProvider({ children }: { children: React.ReactNode }) {
  const [temporary, setTemporary] = useState(false);
  const [resetToken, setResetToken] = useState(0);

  const toggle = useCallback(() => {
    setTemporary((v) => !v);
    setResetToken((n) => n + 1);
  }, []);

  const value = useMemo(
    () => ({ temporary, toggle, resetToken }),
    [temporary, toggle, resetToken],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/**
 * Reads the temporary-chat state.
 *
 * Returns a harmless default outside the provider rather than throwing: the
 * header renders on screens that have no conversation at all, and a missing
 * provider there should not take the page down.
 */
export function useTemporaryChat(): TemporaryChat {
  return (
    useContext(Ctx) ?? {
      temporary: false,
      toggle: () => {},
      resetToken: 0,
    }
  );
}
