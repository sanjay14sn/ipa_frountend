# GitHub Actions — Required Secrets

This file documents the GitHub repository secrets required by `ipa-front/.github/workflows/ci-cd.yml`. Configure each secret under **Settings → Secrets and variables → Actions → New repository secret** in the `ipa-front` repository.

---

## SSH_PRIVATE_KEY

**Purpose**: Private SSH key used by the deploy job to authenticate with the production server. The key is loaded into `ssh-agent` for the duration of the deploy step and removed automatically afterwards.

**Format**: PEM-encoded RSA or Ed25519 private key — the full multi-line content of the private key file, including the `-----BEGIN ... PRIVATE KEY-----` and `-----END ... PRIVATE KEY-----` header/footer lines.

**How to generate**:

```bash
# Generate a new Ed25519 key pair dedicated to GitHub Actions deploys
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_deploy

# Append the public key to the server's authorized_keys
cat ~/.ssh/github_deploy.pub >> ~/.ssh/authorized_keys

# Copy the private key content — paste this as the SSH_PRIVATE_KEY secret value
cat ~/.ssh/github_deploy
```

> The secret value must include the full key content, starting with `-----BEGIN OPENSSH PRIVATE KEY-----` (or the equivalent RSA header) and ending with the corresponding `-----END` line.

---

## SSH_HOST

**Purpose**: Hostname or IP address of the production server that the deploy job connects to via SSH.

**Format**: A bare IPv4 address or a fully-qualified domain name — no protocol prefix, no port suffix.

Examples:
- `192.168.1.100`
- `myserver.example.com`

**How to obtain**: Use the public IP address or DNS name of the Linux VM where `ipa-front` runs. This is typically shown in your cloud provider's console (e.g., EC2 instance public IP, DigitalOcean droplet IP, etc.).

---

## SSH_USER

**Purpose**: Linux username used for the SSH connection. The deploy job runs remote commands as this user, so the user must own the deploy directory and have PM2 access.

**Format**: A plain Linux username string — no `@` symbol, no hostname.

Example: `ashwin`

**How to obtain**: The user account on the server that owns `/home/ashwin/ipa/ipa-front` and under which PM2 is running. Run `whoami` on the server to confirm the correct username.

---

## NEXT_PUBLIC_API_URL

**Purpose**: Base URL of the backend API (`ipa-back`), baked into the Next.js client bundle at build time. Next.js embeds all `NEXT_PUBLIC_*` environment variables into the static bundle during `npm run build`, so this value must be present both in the CI build step and in the remote deploy build step.

**Format**: A full HTTPS URL with no trailing slash.

Example: `https://api.example.com`

**How to obtain**: The public URL where `ipa-back` is reachable from the internet. This is typically:
- The domain or IP you configured for the backend (e.g., `https://api.myapp.com`)
- Or the server's public IP with the backend port (e.g., `https://203.0.113.10:3000`)

Check the `ipa-back` deployment configuration or the reverse-proxy (nginx/caddy) virtual host to find the correct value.

> If this secret is absent or empty, the CI build job will fail before the `npm run build` step with an error identifying the missing secret. The deploy job will also fail before executing the remote build.
