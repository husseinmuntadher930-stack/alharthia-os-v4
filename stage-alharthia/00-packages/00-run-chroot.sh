#!/bin/bash -e
# Alharthia OS — packages
export DEBIAN_FRONTEND=noninteractive
apt-get update

# must-have packages (the build stops if one of these is missing)
apt-get install -y --no-install-recommends \
	labwc python3 network-manager bluez bluez-obexd dbus-user-session udisks2 \
	exfatprogs dosfstools plymouth plymouth-themes \
	fonts-noto-core fonts-noto-color-emoji pipewire wireplumber pipewire-pulse \
	libgl1-mesa-dri libegl1 libgles2 xdg-utils sudo rfkill foot wtype grim mpv pulseaudio-utils ffmpeg \
	python3-gi python3-dbus gir1.2-gtk-3.0 gir1.2-gtklayershell-0.1 \
	chromium libreoffice-writer libreoffice-calc libreoffice-impress

# nice-to-have packages: one by one, so a renamed package never breaks the build
for p in polkitd pkexec policykit-1 fonts-noto-ui-core fonts-noto-ui-extra fonts-noto-color-emoji fonts-hosny-amiri \
	libreoffice-l10n-ar libreoffice-gtk3 ntfs-3g bluez-tools wlr-randr wlrctl \
	qt6-wayland xwayland mesa-vulkan-drivers flatpak lxterminal \
	gsettings-desktop-schemas dconf-cli dconf-gsettings-backend lswt gir1.2-webkit2-4.1 gir1.2-atspi-2.0 at-spi2-core vlc wf-recorder uxplay avahi-daemon \
	fonts-noto-ui-core keyboard-configuration; do
	apt-get install -y --no-install-recommends "$p" || echo "WARNING: package $p not available"
done

# Qt WebEngine for Python (the native window that shows the interface).
# If it is not available the session falls back to Chromium kiosk mode automatically.
apt-get install -y --no-install-recommends python3-pyqt6 python3-pyqt6.qtwebengine \
	|| apt-get install -y --no-install-recommends python3-pyside6.qtwebenginewidgets \
	|| echo "WARNING: no Qt WebEngine for Python — Chromium kiosk mode will be used"

# Arabic + English locales
sed -i 's/^# *\(ar_IQ.UTF-8\)/\1/' /etc/locale.gen
sed -i 's/^# *\(en_US.UTF-8\)/\1/' /etc/locale.gen
locale-gen

apt-get clean
