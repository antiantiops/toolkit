```shell
podman run -d \
  --name devops-vpn \
  --hostname devops-vpn \
  --restart unless-stopped \
  --cap-add=NET_ADMIN \
  --device=/dev/net/tun \
  localhost/devops-openvpn-ssh:1.0
```

```shell
docker run -d \
  --name devops-vpn \
  --hostname devops-vpn \
  --restart unless-stopped \
  --cap-add=NET_ADMIN \
  --device=/dev/net/tun \
  devops-openvpn-ssh:1.0
```
