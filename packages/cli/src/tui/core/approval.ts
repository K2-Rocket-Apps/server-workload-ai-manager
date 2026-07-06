/** User typed an approval for a pending destructive/guest-exec action. */
export function isApprovalReply(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (["y", "yes", "yeah", "yep", "approve", "approved", "ok", "okay", "sure", "go", "go ahead", "do it"].includes(t)) {
    return true;
  }
  return /^y+$/i.test(t);
}

/** User typed a denial for a pending action. */
export function isDenialReply(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (["n", "no", "nope", "deny", "denied", "cancel", "reject", "stop", "abort"].includes(t)) {
    return true;
  }
  return /^n+$/i.test(t);
}
