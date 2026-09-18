#!/bin/bash -e
# Alharthia OS — install the interface, the system service and the root helper
install -d "${ROOTFS_DIR}/opt/alharthia"
cp -a files/app/. "${ROOTFS_DIR}/opt/alharthia/"
chmod 755 "${ROOTFS_DIR}/opt/alharthia/alharthia_server.py" "${ROOTFS_DIR}/opt/alharthia/alharthia_host.py"

install -d "${ROOTFS_DIR}/usr/lib/alharthia"
install -m 755 files/app/helper/alharthia-helper "${ROOTFS_DIR}/usr/lib/alharthia/alharthia-helper"
install -m 755 files/alharthia-session "${ROOTFS_DIR}/usr/bin/alharthia-session"
install -m 755 files/alharthia-keyboard-setup "${ROOTFS_DIR}/usr/bin/alharthia-keyboard-setup"
chmod 755 "${ROOTFS_DIR}/opt/alharthia/alharthia_osk.py" "${ROOTFS_DIR}/opt/alharthia/alharthia_share.py" "${ROOTFS_DIR}/opt/alharthia/alharthia_btrecv.py"
# the old squeekboard keyboard is replaced by the Alharthia keyboard
rm -f "${ROOTFS_DIR}/etc/xdg/autostart/sm.puri.Squeekboard.desktop"

cat > "${ROOTFS_DIR}/etc/sudoers.d/alharthia" <<SUDO
${FIRST_USER_NAME} ALL=(root) NOPASSWD: /usr/lib/alharthia/alharthia-helper
SUDO
chmod 440 "${ROOTFS_DIR}/etc/sudoers.d/alharthia"

# the teacher may mount USB drives, manage Wi-Fi and power off without a password prompt
install -d "${ROOTFS_DIR}/etc/polkit-1/rules.d"
cat > "${ROOTFS_DIR}/etc/polkit-1/rules.d/50-alharthia.rules" <<POLKIT
polkit.addRule(function(action, subject) {
    if (subject.user == "${FIRST_USER_NAME}" && subject.local && subject.active &&
        (action.id.indexOf("org.freedesktop.udisks2.") == 0 ||
         action.id.indexOf("org.freedesktop.NetworkManager.") == 0 ||
         action.id.indexOf("org.freedesktop.login1.") == 0)) {
        return polkit.Result.YES;
    }
});
POLKIT
