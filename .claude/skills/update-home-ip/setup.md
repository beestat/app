# DigitalOcean CLI setup (Windows)

Do this once per computer. The `update-home-ip` script reads the token that
`doctl auth init` saves, so nothing else is needed.

## 1. Install doctl

```powershell
winget install DigitalOcean.Doctl
```

winget puts a shim at `%LOCALAPPDATA%\Microsoft\WinGet\Links\doctl.exe`. Open a
new terminal (or restart VS Code) so it's on PATH, then check:

```powershell
doctl version
```

## 2. Create an API token

1. DigitalOcean control panel → **API** → **Tokens** → **Generate New Token**.
2. Name it after the computer (e.g. `doctl-<computer-name>`), so it can be revoked
   on its own later.
3. Choose **Custom Scopes** and grant:
   - `firewall`: read, update
   - `droplet`: read (lets doctl show which droplets a firewall covers)
4. Pick an expiration and copy the token. It's shown only once.

## 3. Authenticate doctl

```powershell
doctl auth init
```

Paste the token when it asks. doctl saves it to `%APPDATA%\doctl\config.yaml`
as `access-token:`. Don't commit or paste the token anywhere else.

Check it:

```powershell
doctl account get
doctl compute firewall list
```

> The script reads only the top-level `access-token:` (the default context). If
> you use named contexts (`doctl auth init --context foo`), set
> `$env:DIGITALOCEAN_ACCESS_TOKEN` instead.

## 4. Seed the last-known IP (optional)

The script remembers the last IP it applied in `%APPDATA%\beestat\home-ip.txt`
(kept outside the repo, which is public). On a new computer that file is missing,
so pass `-OldIp` on the first run. Use `-ListAddresses` to see which single-host IPs
are in the firewalls now.

## Rotating or revoking

- Revoke the token in the control panel under API → Tokens.
- Remove it locally with `doctl auth remove --context default`, or delete `config.yaml`.
