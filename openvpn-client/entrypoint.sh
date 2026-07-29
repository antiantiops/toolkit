#!/usr/bin/env bash
set -Eeuo pipefail

VPN_CONFIG="/etc/openvpn/client.ovpn"
DEV_USER="${DEV_USER:-devops}"

cleanup() {
  echo "Stopping..."
  [[ -n "${OVPN_PID:-}" ]] && kill "${OVPN_PID}" 2>/dev/null || true
  [[ -n "${SSHD_PID:-}" ]] && kill "${SSHD_PID}" 2>/dev/null || true
  wait || true
}

trap cleanup SIGTERM SIGINT EXIT

# Luôn chạy SSH để lần đầu bạn có thể docker exec vào cấu hình.
# Khi client.ovpn xuất hiện, container khởi động lại sẽ chạy OpenVPN.
echo "Starting SSH server..."
/usr/sbin/sshd -D -e &
SSHD_PID=$!

if [[ -f "${VPN_CONFIG}" ]]; then
  echo "Found ${VPN_CONFIG}; starting OpenVPN..."
  openvpn --config "${VPN_CONFIG}" &
  OVPN_PID=$!
else
  echo "No ${VPN_CONFIG} found."
  echo "Create it with: docker exec -it devops-vpn bash"
  echo "Then restart:  docker restart devops-vpn"
fi

# Nếu OpenVPN chết thì container dừng để Docker restart policy xử lý.
if [[ -n "${OVPN_PID:-}" ]]; then
  wait -n "${OVPN_PID}" "${SSHD_PID}"
else
  wait "${SSHD_PID}"
fi
