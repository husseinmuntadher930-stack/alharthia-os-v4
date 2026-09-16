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

# Bluetooth: accept incoming files automatically and save them in ~/Received
cat > "${H}/.config/systemd/user/obex.service.d/alharthia.conf" <<OBEX
[Service]
ExecStart=
ExecStart=/usr/libexec/bluetooth/obexd --auto-accept --root=/home/${U}/Received
OBEX

on_chroot << CHROOT
chown -R ${U}:${U} /home/${U}
systemctl set-default multi-user.target
systemctl enable NetworkManager || true
systemctl enable bluetooth || true
for g in bluetooth video render input plugdev netdev audio; do getent group \$g >/dev/null && usermod -aG \$g ${U}; done
true
CHROOT
