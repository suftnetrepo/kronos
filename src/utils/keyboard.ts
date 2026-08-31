import { Keyboard } from "react-native";

// A real iOS device (not the Simulator — its keyboard is synchronous and
// in-process, so this never reproduces there) can render a transparent
// Modal/Popup blank if it's presented while the system keyboard is still
// up: the keyboard's async, separate-process show/hide negotiates a native
// window resize outside RN's render cycle, and a Modal opening mid-negotiation
// can end up composed against a frame it never saw update. Dismissing first
// and waiting for that dismiss to actually finish — rather than opening the
// Popup right out from under a field the user hasn't tapped away from —
// keeps the two transitions from ever overlapping.
//
// Use this for any "open a Popup/Modal" handler that a field with
// `autoFocus` (so the keyboard may still be up) sits above.
export function dismissKeyboardThenOpen(open: () => void) {
  Keyboard.dismiss();
  setTimeout(open, 250);
}
