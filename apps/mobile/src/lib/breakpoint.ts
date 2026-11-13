/** Width from which the desktop web layouts (W1–W5 designs) replace the phone layouts. */
export const WIDE_BREAKPOINT = 900;

export const isWideWidth = (width: number) => width >= WIDE_BREAKPOINT;
