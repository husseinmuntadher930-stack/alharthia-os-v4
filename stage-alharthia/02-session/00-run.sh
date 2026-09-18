#!/bin/bash -e
# Alharthia OS — log in automatically and start the labwc session with the interface
U="${FIRST_USER_NAME}"
H="${ROOTFS_DIR}/home/${U}"

install -d "${ROOTFS_DIR}/etc/systemd/system/getty@tty1.service.d"
cat > "${ROOTFS_DIR}/etc/systemd/system/getty@tty1.service.d/autologin.conf" <<CONF
[Service]
ExecStart=
ExecStart=-/sbin/agetty --autologin ${U} --noclear %I \$TERM
CONF

cat >> "${H}/.bash_profile" <<'PROFILE'
# Alharthia OS: start the graphical session on the first console
if [ -z "$WAYLAND_DISPLAY" ] && [ "$(tty)" = "/dev/tty1" ]; then
	mkdir -p "$HOME/.local/share"
	exec labwc > "$HOME/.local/share/alharthia-session.log" 2>&1
fi
PROFILE

install -d "${H}/.config/labwc" "${H}/.config/systemd/user/obex.service.d" "${H}/.local/share" \
	"${H}/Documents/السبورات" "${H}/Downloads" "${H}/Pictures" "${H}/Videos" "${H}/Received"
install -m 644 files/rc.xml "${H}/.config/labwc/rc.xml"
install -m 755 files/autostart "${H}/.config/labwc/autostart"
install -m 644 files/environment "${H}/.config/labwc/environment"

# Bluetooth: receive files automatically into ~/Received (Alharthia receiver, registers OBEX Object Push with BlueZ)
cat > "${ROOTFS_DIR}/etc/systemd/system/alharthia-btrecv.service" <<UNIT
[Unit]
Description=Alharthia OS — receive files over Bluetooth
After=bluetooth.service
Wants=bluetooth.service

[Service]
Environment=ALH_USER=${U}
ExecStart=/usr/bin/python3 /opt/alharthia/alharthia_btrecv.py
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
UNIT
# AirPlay receiver: lets iPhone / iPad mirror their screen onto this device (started on demand)
cat > "${ROOTFS_DIR}/etc/systemd/system/alharthia-airplay.service" <<UNIT
[Unit]
Description=Alharthia OS — AirPlay screen receiver (iPhone / iPad)
After=avahi-daemon.service network-online.target
Wants=avahi-daemon.service

[Service]
User=${U}
Environment=XDG_RUNTIME_DIR=/run/user/1000
Environment=WAYLAND_DISPLAY=wayland-0
Environment=GST_GL_API=gles2
ExecStart=/usr/bin/uxplay -n Alharthia -nh -fs -vs waylandsink
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
UNIT

if [ -f "${ROOTFS_DIR}/etc/bluetooth/main.conf" ]; then
	sed -i '/^#\?Class *=/d' "${ROOTFS_DIR}/etc/bluetooth/main.conf"
	sed -i '/^\[General\]/a Class = 0x10010C' "${ROOTFS_DIR}/etc/bluetooth/main.conf"
fi
install -d "${H}/.config/systemd/user"
ln -sf /dev/null "${H}/.config/systemd/user/obex.service"

on_chroot << CHROOT
chown -R ${U}:${U} /home/${U}
systemctl set-default multi-user.target
systemctl enable NetworkManager || true
systemctl enable bluetooth || true
systemctl enable alharthia-btrecv || true
systemctl enable avahi-daemon || true
systemctl disable alharthia-airplay || true
for g in bluetooth video render input plugdev netdev audio; do getent group \$g >/dev/null && usermod -aG \$g ${U}; done
true
CHROOT
