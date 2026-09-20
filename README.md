# acetechlimited.net

Marketing site for AceTech Limited, a product and engineering company working on real money
gaming platforms. The flagship platform is AceHigh Poker.

## What this is

A single page static site. Plain HTML, CSS and a small amount of JavaScript, with no build
step and no dependencies to install. You can open `index.html` directly in a browser and it
works. That is deliberate, because it makes hosting trivial and means the site cannot break
because a package updated.

## Layout

    index.html              the whole page
    assets/css/styles.css   all styling, including the responsive rules
    assets/js/main.js       sticky nav state, mobile menu, footer year
    assets/img/favicon.svg  spade mark
    robots.txt
    sitemap.xml
    deploy/                 nginx config and the deploy script

## Running it locally

    python3 -m http.server 8080

Then open http://localhost:8080.

## Deploying

The site is served by nginx from `/var/www/acetechlimited.net` on the DigitalOcean droplet.
See `deploy/README.md` for the one time server setup and the deploy command.

## Editing content

All copy lives in `index.html` and is plain readable markup. The colours, spacing and radii
are CSS custom properties at the top of `styles.css`, so changing the gold accent or the dark
background is a one line edit in `:root`.
