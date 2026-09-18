#!/bin/bash -e
# Alharthia OS — name, boot splash and Raspberry Pi 5 / NVMe settings
sed -i 's/^PRETTY_NAME=.*/PRETTY_NAME="Alharthia OS 1.7 (Raspberry Pi OS based)"/' "${ROOTFS_DIR}/etc/os-release"
printf 'Alharthia OS 1.7 \\n \\l\n\n' > "${ROOTFS_DIR}/etc/issue"
echo 'Alharthia OS — ثانوية المتميزين في الحارثية' > "${ROOTFS_DIR}/etc/motd"

T="${ROOTFS_DIR}/usr/share/plymouth/themes/alharthia"
install -d "$T"
install -m 644 files/plymouth/logo.png files/plymouth/dot.png files/plymouth/alharthia.plymouth files/plymouth/alharthia.script "$T/"

BOOT="${ROOTFS_DIR}/boot/firmware"
[ -f "$BOOT/config.txt" ] || BOOT="${ROOTFS_DIR}/boot"
if ! grep -q "alharthia" "$BOOT/config.txt"; then
cat >> "$BOOT/config.txt" <<CFG

[all]
# --- alharthia ---
# PCIe Gen 3 for the NVMe SSD (Raspberry Pi 5)
dtparam=pciex1_gen=3
disable_splash=1
CFG
fi
if [ -f "$BOOT/cmdline.txt" ] && ! grep -q "splash" "$BOOT/cmdline.txt"; then
	sed -i 's/$/ quiet splash plymouth.ignore-serial-consoles logo.nologo vt.global_cursor_default=0 loglevel=3/' "$BOOT/cmdline.txt"
fi

on_chroot << CHROOT
plymouth-set-default-theme alharthia || true
update-initramfs -u -k all || true
CHROOT
