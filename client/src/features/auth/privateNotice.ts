/** What a stranger who follows the link is told on the sign-in page. Plain and calm: it never accuses anyone. */
export function privateNotice(registrationOpen: boolean | null): { lead: string; body: string } {
  const lead = "This is a private app.";
  const base = "PawLedger is one person's personal ledger. It isn't a public service, and nobody else's data is kept here.";
  if (registrationOpen === false) {
    return {
      lead,
      body: `${base} New accounts can't be created here. If you followed a link by mistake, nothing is wrong and nothing is needed from you: you can simply close this page.`,
    };
  }
  // Open (the owner is setting up) or not known yet: don't tell the owner to leave.
  return { lead, body: base };
}
