# business@acetechlimited.net, at no cost

> **Do not use this setup. Superseded 21 September 2026.**
>
> The sending half depends on Gmail's "Send mail as" for outside addresses, and Google
> is removing it. Their notice (support.google.com/mail/answer/17101213) says it stops
> entirely in January 2027, and that during the transition from Q3 2026 "Gmail may
> restrict new configurations". So new setups may already be refused, and existing ones
> stop in January.
>
> Receiving is unaffected: Google confirms forwarding into Gmail keeps working. But a
> receive-only address means replying from a personal Gmail, which is not acceptable
> for a business address.
>
> What still works after January is a real mailbox with its own sending. The cheapest is
> Zoho Mail Lite at 1 US dollar per user per month billed annually, 5 GB. Google
> Workspace also works and is explicitly unaffected, at about six times the price.
>
> The rest of this document is kept as the record of why the free route was rejected.

This sets up a working business address that both receives and sends, for nothing,
using two free services instead of one paid mailbox.

Receiving and sending are separate problems here, which is the part that surprises
people. Free services will happily take mail addressed to your domain and drop it in
an inbox you already own. None of them will let you send from that address for free,
because sending is what spammers want and it is what costs the provider money. So we
use one service for each.

| | Service | Free tier | What it does |
|---|---|---|---|
| Receiving | Forward Email | unlimited inbound | mail to business@ lands in an existing Gmail |
| Sending | Brevo | 300 a day | lets Gmail send *as* business@ |

Prices checked 21 September 2026. Both are permanent free tiers, not trials.

## Before you start

Decide which existing inbox the mail should land in. Everything below assumes that
address, written as `DESTINATION` from here on. Lovish's own Gmail is the obvious
choice.

Two things only a person can do, so they are not on me: creating the two accounts,
and setting the passwords. Adding the DNS records is also manual, because the safety
rules in my session block DNS changes.

## Part 1: receiving

1. Sign up at forwardemail.net. Free plan, no card.
2. Add the domain `acetechlimited.net`.
3. It will show you a verification TXT value. Keep the page open, you need it for
   the DNS step.

## Part 2: sending

1. Sign up at brevo.com. Free plan, no card.
2. Go to Senders, Domains, and add `acetechlimited.net`.
3. Brevo will show a verification TXT and a DKIM record. Keep these too.
4. Under SMTP & API, generate an SMTP key. Note the server, port, login and key.

## Part 3: the DNS records

All of these go into DigitalOcean, under Networking, Domains, acetechlimited.net.
Not GoDaddy. GoDaddy no longer holds this domain's DNS.

Do not touch the existing NS records or the A and CNAME records that point the site
at App Platform. Everything below is additional.

| Type | Hostname | Value | Note |
|---|---|---|---|
| MX | @ | `mx1.forwardemail.net` priority 10 | receives mail |
| MX | @ | `mx2.forwardemail.net` priority 10 | second receiver |
| TXT | @ | `forward-email=business:DESTINATION` | where business@ goes |
| TXT | @ | `forward-email-site-verification=...` | value from Part 1 |
| TXT | @ | `brevo-code:...` | value from Part 2 |
| TXT | @ | `v=spf1 include:spf.brevo.com ~all` | lets Brevo send as us |
| TXT | `mail._domainkey` | value from Part 2 | signs our outgoing mail |
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:DESTINATION` | reporting, nothing enforced yet |

Two warnings worth reading twice.

There must be exactly one SPF record on the domain. If a second one ever appears,
every receiving server treats the domain as misconfigured and starts distrusting our
mail. If another service needs SPF later, add its `include:` to the existing line
rather than creating a new record.

Start DMARC at `p=none`. That asks for reports without asking anyone to reject
anything. Only tighten it to `quarantine` once the reports come back clean, or you
risk your own mail being binned while you are still setting up.

## Part 4: wiring it into Gmail

In Gmail, Settings, Accounts, "Send mail as", Add another email address.

- Name: AceTech Limited
- Address: business@acetechlimited.net
- Untick "Treat as an alias"
- SMTP server, port, username and password: the Brevo values from Part 2
- Use TLS

Gmail sends a confirmation code to business@acetechlimited.net. If Part 1 worked,
that code arrives in DESTINATION within a minute. Paste it back and you are done.

Then set it as the default sending address, or Gmail will keep replying from the
personal account.

## Part 5: proving it works

Send from an outside address to business@acetechlimited.net and confirm it arrives.
Reply, and confirm the reply shows as coming from business@acetechlimited.net rather
than the personal Gmail. Then send one to a Gmail address, open it, and use "Show
original" to check SPF and DKIM both say PASS. If either says fail, the records in
Part 3 have a typo.

## What can break, and how you would know

The sending side is the fragile half. Brevo is built for software sending automated
mail, and we are using it for a person's correspondence, which is allowed but is not
what they optimise for. If they ever suspend or change the free tier, outbound stops
and inbound keeps working, so the symptom is confusing: mail still arrives, replies
silently stop leaving.

If that happens, the fix is Zoho Mail Lite at about twelve US dollars a year, which
replaces both halves with one mailbox. Keep that in your back pocket rather than
treating this as permanent.
