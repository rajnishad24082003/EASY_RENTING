# Deploying to Oracle Cloud (free)

This runs the whole stack (PostgreSQL, Spring Boot, Next.js, and Caddy for HTTPS) on **one Oracle Cloud Always Free
`VM.Standard.E2.1.Micro`** server, at no cost.

The Micro server has only 1 GB of memory. That's enough to *run* the app, slowly, but not to *build* it. So the
Docker images are **built on your laptop** and uploaded by `deploy/deploy.sh`.

```
Internet ──443──▶ Caddy ──/ws, /swagger-ui──▶ backend:8080 ──▶ postgres
                    └────────everything else──▶ frontend:3000 ──/api──▶ backend
```

## Rules that keep the bill at $0

1. **Never click "Upgrade to Pay As You Go"** or any **Upgrade** banner. A Free Tier account can't be billed.
2. **Only create what this guide lists.** That's one `VM.Standard.E2.1.Micro` instance (labelled
   **"Always Free-eligible"**) with the default boot volume. Oracle allows two Micro instances for free.
3. **Leave `ANTHROPIC_API_KEY` empty.** The Claude API is billed per request, and anyone visiting the public site
   could run up charges.
4. **Don't add** load balancers, block volumes, databases or other services.

> **Idle instances:** Oracle may stop Always Free servers that look idle for 7 days. If your site ever stops
> responding, open **Compute → Instances** and click **Start**. Data is kept and the containers restart on their own.

## 1. Create the server

Console → **☰ → Compute → Instances → Create instance**:

| Setting | Value |
|---|---|
| Name | `easyrenting` |
| Image | **Change image → Ubuntu → Canonical Ubuntu 24.04** (the plain one, not Minimal or aarch64) |
| Shape | **VM.Standard.E2.1.Micro** (*Always Free-eligible*), which is usually the default |
| Networking | **Create new virtual cloud network** + **Create new public subnet** |
| SSH keys | **Generate a key pair for me** → **Download private key** (you can't download it later) |
| Storage | Defaults |

Click **Create** and wait for **Running**.

## 2. Give it a public IP

The form can't assign one to a subnet that doesn't exist yet, so add it now:

Instance page → **Networking** tab (or **Attached VNICs**) → click the VNIC → **IP administration / IPv4 Addresses** →
**⋮** on the private IP row → **Edit** → **Ephemeral public IP** → **Update**. Copy the **public IP**.

## 3. Open ports 80 and 443 in Oracle's firewall

Instance page → **Subnet** link → **Security Lists** → **Default Security List** → **Add Ingress Rules**:

| Source CIDR | IP Protocol | Destination port range |
|---|---|---|
| `0.0.0.0/0` | TCP | `80,443` |

## 4. Set up the server (one time)

On your laptop, from the repository root:

```bash
mv ~/Downloads/ssh-key-*.key ~/.ssh/easyrenting.key && chmod 600 ~/.ssh/easyrenting.key
ssh -i ~/.ssh/easyrenting.key ubuntu@YOUR_PUBLIC_IP 'bash -s' < deploy/server-setup.sh
```

This opens the server's own firewall for 80/443, adds 3 GB of swap and installs Docker.

## 5. Configure (on your laptop)

```bash
cp deploy/.env.production.example deploy/.env.production
openssl rand -base64 48      # copy into JWT_SECRET
openssl rand -base64 48      # copy into POSTGRES_PASSWORD
```

Edit `deploy/.env.production`:
- **`SITE_HOST`, `PUBLIC_APP_URL` and `PUBLIC_WS_URL`:** replace `140-238-10-20` with **your IP, using dashes
  instead of dots**. sslip.io turns that name into your IP, so Caddy can get a real HTTPS certificate without a
  domain.
- **`JWT_SECRET` and `POSTGRES_PASSWORD`:** paste in the two generated secrets.
- **`ANTHROPIC_API_KEY`:** leave it empty.

`deploy/.env.production` is git-ignored.

## 6. Deploy (on your laptop)

```bash
bash deploy/deploy.sh ubuntu@YOUR_PUBLIC_IP ~/.ssh/easyrenting.key
```

This builds both images locally (the first build takes a few minutes), uploads them, and starts everything. Give the
backend **2–4 minutes** to start on the small server. Then open `https://YOUR-IP-WITH-DASHES.sslip.io` and log in
as `tenant@easyrenting.in` / `Password@123`.

To deploy new code later, run the same command.

## Day-to-day

| Task | Command |
|---|---|
| Deploy changes | `bash deploy/deploy.sh ubuntu@IP ~/.ssh/easyrenting.key` (laptop) |
| Log in to the server | `ssh -i ~/.ssh/easyrenting.key ubuntu@IP` |
| Backend logs | `cd easyrenting && docker compose -f docker-compose.yml -f deploy/docker-compose.prod.yml logs -f backend` (server) |
| Reset demo data | `bash easyrenting/deploy/reset-demo.sh` (server) |

Because the demo accounts' password is public, visitors can log in as the admin and change things. Run
`reset-demo.sh` whenever the data needs a clean slate.

## Troubleshooting

| Problem | Fix |
|---|---|
| Site doesn't load at all | Check step 3 (security list) and that `server-setup.sh` finished. |
| Certificate warning | Caddy is still obtaining the certificate (about a minute). Check the logs with `... logs caddy`. |
| 502 / "Bad Gateway" right after deploying | The backend is still starting. Wait a few minutes. |
| Chat doesn't connect | `PUBLIC_WS_URL` must be `wss://<SITE_HOST>/ws`. It's baked into the frontend, so redeploy after changing it. |
| Very slow, or containers restarting | Expected on 1 GB under load. Check `free -h` shows swap on the server. |
