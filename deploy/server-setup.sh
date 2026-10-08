#!/usr/bin/env bash
# One-time setup for a fresh Oracle Cloud Ubuntu server. Run it FROM YOUR LAPTOP like this:
#   ssh -i ~/path/to/ssh-key.key ubuntu@<SERVER_IP> 'bash -s' < deploy/server-setup.sh
set -euo pipefail

echo "==> Opening ports 80 and 443 in the OS firewall"
# Oracle's Ubuntu images ship iptables rules that reject everything except SSH. Allow HTTP/HTTPS
# and persist the rules. This happens before Docker is installed, so Docker's own rules aren't saved.
sudo apt-get update -y
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y iptables-persistent
for port in 80 443; do
  if ! sudo iptables -C INPUT -p tcp --dport "$port" -m conntrack --ctstate NEW -j ACCEPT 2>/dev/null; then
    sudo iptables -I INPUT -p tcp --dport "$port" -m conntrack --ctstate NEW -j ACCEPT
  fi
done
sudo netfilter-persistent save

echo "==> Adding 3 GB swap (the server has only 1 GB of RAM)"
if ! swapon --show | grep -q /swapfile; then
  sudo fallocate -l 3G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
fi

echo "==> Installing Docker"
if ! command -v docker >/dev/null; then
  curl -fsSL https://get.docker.com | sudo sh
fi
sudo usermod -aG docker "$USER"
sudo systemctl enable --now docker

echo
echo "Server ready. Next, on your laptop: bash deploy/deploy.sh <user@ip> <ssh-key-file>"
