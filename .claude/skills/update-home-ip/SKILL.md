---
name: update-home-ip
description: Update infrastructure when Jon's home IP changes. Swaps the old IP for the new one in every DigitalOcean Cloud Firewall and prints the MySQL RENAME USER script to run on the database server. Use when the user says their home IP changed, they're locked out of SSH/MySQL, or they ask to update firewall IPs. Also covers first-time doctl setup on a new computer.
---

# Update home IP

Every step is scripted. Don't write doctl or API commands by hand; run the script.

- `scripts/Update-HomeIp.ps1`: finds and swaps the IP in the firewalls, then prints the SQL
- `scripts/rename-mysql-host.sql`: SQL template; the script fills in both IPs
- `setup.md`: one-time DigitalOcean/doctl setup for a new computer

Run everything with the **PowerShell** tool. Script path:
`.claude/skills/update-home-ip/scripts/Update-HomeIp.ps1`

## Procedure

1. **Check the prerequisites.** Run `doctl version` (if it's not on PATH, try
   `& "$env:LOCALAPPDATA\Microsoft\WinGet\Links\doctl.exe" version`). If doctl is
   missing or not authenticated, walk the user through `setup.md`. Never ask for
   the token in chat; the user runs `doctl auth init` themselves.

2. **Dry run.** No changes are made yet.
   ```powershell
   & .claude/skills/update-home-ip/scripts/Update-HomeIp.ps1
   ```
   - New IP: detected via ipify. Confirm it with the user. If they're away from
     home (coffee shop, phone hotspot), the detected IP is the wrong one, so stop
     and have them pass `-NewIp`.
   - Old IP: comes from `%APPDATA%\beestat\home-ip.txt`. If that file is missing, the
     script errors; run with `-ListAddresses`, show the user the addresses, and ask
     which one is the old home IP. Then re-run with `-OldIp <ip>`.

3. **Confirm.** Show the user the planned rule changes and get an explicit yes.
   A wrong change can lock them out of SSH on every droplet.

4. **Apply.**
   ```powershell
   & .claude/skills/update-home-ip/scripts/Update-HomeIp.ps1 -OldIp <old> -NewIp <new> -Apply
   ```
   The script PUTs each changed firewall, keeping its name, droplets, tags and all
   other rules and sources. It then re-reads the firewalls to verify the old IP is
   gone, and saves the new IP to the state file.

5. **Database server.** The script prints the filled-in SQL (and copies it to the
   clipboard). Show it to the user and tell them to run it **themselves** on the
   database server (`db-1`) as MySQL root. It renames every `user@'<old ip>'`
   account to `user@'<new ip>'`. Don't run it for them.

## Flags

| Flag | Effect |
|---|---|
| `-OldIp` / `-NewIp` | Override the state-file / auto-detected IPs |
| `-Apply` | Write firewall changes (default is a dry run) |
| `-SqlOnly` | Print only the SQL (no DigitalOcean calls) |
| `-ListAddresses` | List every single-host IPv4 in all firewall rules |

## Notes

- If a rule already has the new IP, the old one is just removed (deduped). That
  makes the script safe to re-run, and it cleans up leftovers.
- Only exact `x.x.x.x` / `x.x.x.x/32` matches are touched; CIDR ranges and
  `0.0.0.0/0` are left alone.
- This repo is public. Don't commit real IPs or tokens into this skill.
