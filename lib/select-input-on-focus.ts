import type { FocusEvent } from "react";

/** Select the whole value on focus so the next key replaces it (avoids e.g. "05" after "0"). */
export function selectInputValueOnFocus(
  event: FocusEvent<HTMLInputElement>,
): void {
  event.currentTarget.select();
}
