```shell
podman run -d \
  --name devops-vpn \
  --hostname devops-vpn \
  --restart unless-stopped \
  --cap-add=NET_ADMIN \
  --device=/dev/net/tun \
  --privileged \
  localhost/devops-openvpn-ssh:1.0
```

```shell
docker run -d \
  --name devops-vpn \
  --hostname devops-vpn \
  --restart unless-stopped \
  --cap-add=NET_ADMIN \
  --device=/dev/net/tun \
  --privileged \
  devops-openvpn-ssh:1.0
```

```
/etc/openvpn/client.ovpn
/home/devops/.ssh/authorized_keys
```
