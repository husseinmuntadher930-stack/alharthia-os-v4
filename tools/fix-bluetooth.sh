#!/bin/bash
# Alharthia OS — fixes receiving files over Bluetooth.
# Usage (on the Pi):  sudo bash tools/fix-bluetooth.sh
# Runs the file-receiving service (obexd) as a system service with its own D-Bus session,
# trusts every paired phone, and prints a short report.
U="${SUDO_USER:-teacher}"
H="$(getent passwd "$U" | cut -d: -f6)"
UID_="$(id -u "$U")"
OBEXD=""
for p in /usr/libexec/bluetooth/obexd /usr/lib/bluetooth/obexd; do [ -x "$p" ] && OBEXD="$p" && break; done
LOG="$H/bt-report.txt"
ok(){ echo "✔ $*"; }
bad(){ echo "✘ $*"; }

echo "» تجهيز استلام الملفات بالبلوتوث…"
if [ -z "$OBEXD" ]; then
	apt-get install -y bluez-obexd dbus-user-session || true
	for p in /usr/libexec/bluetooth/obexd /usr/lib/bluetooth/obexd; do [ -x "$p" ] && OBEXD="$p" && break; done
fi
[ -n "$OBEXD" ] || { bad "خدمة الاستلام (obexd) غير موجودة — شغّل: sudo apt install bluez-obexd"; exit 1; }
command -v dbus-run-session >/dev/null || apt-get install -y dbus || true

install -d -o "$U" -g "$U" "$H/Received"

# the device shows up as a computer that accepts files
if [ -f /etc/bluetooth/main.conf ]; then
	sed -i '/^#\?Class *=/d' /etc/bluetooth/main.conf
	sed -i '/^\[General\]/a Class = 0x10010C' /etc/bluetooth/main.conf
fi

cat > /etc/systemd/system/alharthia-obex.service <<UNIT
[Unit]
Description=Alharthia OS — receive files over Bluetooth
After=bluetooth.service
Requires=bluetooth.service

[Service]
User=$U
ExecStart=/usr/bin/dbus-run-session -- $OBEXD -n -a -r $H/Received
Restart=always
RestartSec=3

[Install]
WantedBy=bluetooth.target multi-user.target
UNIT

# stop the per-user service so there is only one receiver
sudo -u "$U" XDG_RUNTIME_DIR=/run/user/$UID_ systemctl --user stop obex.service 2>/dev/null || true
sudo -u "$U" XDG_RUNTIME_DIR=/run/user/$UID_ systemctl --user mask obex.service 2>/dev/null || true
pkill -x obexd 2>/dev/null || true

rfkill unblock bluetooth 2>/dev/null || true
systemctl daemon-reload
systemctl restart bluetooth
sleep 2
systemctl enable --now alharthia-obex.service
sleep 3

bluetoothctl power on >/dev/null 2>&1
bluetoothctl pairable on >/dev/null 2>&1
bluetoothctl discoverable-timeout 0 >/dev/null 2>&1
bluetoothctl discoverable on >/dev/null 2>&1
for mac in $(bluetoothctl devices Paired 2>/dev/null | awk '/^Device/{print $2}'); do
	bluetoothctl trust "$mac" >/dev/null 2>&1
done

{
echo "===== تقرير البلوتوث — $(date) ====="
systemctl is-active bluetooth >/dev/null && ok "خدمة البلوتوث شغالة" || bad "خدمة البلوتوث واكفة"
systemctl is-active alharthia-obex >/dev/null && ok "خدمة استلام الملفات شغالة" || bad "خدمة استلام الملفات واكفة"
bluetoothctl show 2>/dev/null | grep -qi "OBEX Object Push" && ok "الجهاز يعلن إنه يستقبل ملفات (Object Push)" || bad "الجهاز ما يعلن عن استقبال الملفات"
echo "--- الأجهزة المقترنة:"
for mac in $(bluetoothctl devices Paired 2>/dev/null | awk '/^Device/{print $2}'); do
	bluetoothctl info "$mac" | grep -E "Name:|Trusted:|Connected:" | tr '\n' ' '; echo
done
echo "--- آخر رسائل خدمة الاستلام:"
journalctl -u alharthia-obex -n 15 --no-pager 2>/dev/null
echo "--- UUIDs:"
bluetoothctl show 2>/dev/null | grep -i uuid
} | tee "$LOG"
chown "$U:$U" "$LOG" 2>/dev/null
echo
echo "التقرير محفوظ بـ: $LOG"
echo "هسه بالفون: الغِ الاقتران، اقترن من جديد، وجرّب ترسل صورة."
