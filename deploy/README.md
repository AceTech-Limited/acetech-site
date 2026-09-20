# Deploying acetechlimited.net

The site is static, so hosting it is only a matter of putting the files somewhere and
pointing the domain at it. There are two supported routes. Pick one.

## Route A: DigitalOcean App Platform (recommended)

App Platform serves a static site straight from this GitHub repository. It handles TLS
itself, renews the certificate without anyone remembering to, and redeploys on every push
to `main`. There is no server to patch.

Setup, once:

1. In the DigitalOcean console choose Create, then Apps, then this repository.
2. Resource type: Static Site. Build command: none. Output directory: `/`.
3. Add `acetechlimited.net` and `www.acetechlimited.net` as custom domains.
4. At GoDaddy, point the domain at the hostname App Platform gives you.

After that, deploying is `git push`.

## Route B: nginx on a droplet

Use this if the site has to sit next to something else already running on a droplet.

One time server setup:

    apt update && apt install -y nginx certbot python3-certbot-nginx
    mkdir -p /var/www/acetechlimited.net /var/www/certbot
    cp deploy/nginx.conf /etc/nginx/sites-available/acetechlimited.net
    ln -s /etc/nginx/sites-available/acetechlimited.net /etc/nginx/sites-enabled/
    nginx -t && systemctl reload nginx

Point the domain's A record at the droplet, wait for DNS to resolve, then issue the
certificate:

    certbot --nginx -d acetechlimited.net -d www.acetechlimited.net

Certbot installs the renewal timer itself. Check it with `systemctl list-timers | grep certbot`.

Every deploy after that:

    ./deploy/deploy.sh root@<server-ip>

## DNS at GoDaddy

For Route A, follow the exact records App Platform shows you. For Route B:

| Type  | Name | Value             |
|-------|------|-------------------|
| A     | @    | the droplet IP    |
| CNAME | www  | acetechlimited.net |

Remove the parked-page records GoDaddy created at registration first, or they will fight
the new ones.
