#!/bin/bash
# Alharthia OS — receive files over Bluetooth.
# Usage (on the Pi):  sudo bash tools/fix-bluetooth.sh
# Installs the Alharthia receiver (alharthia_btrecv.py), which registers "OBEX Object Push"
# directly with BlueZ (obexd is not used for receiving), trusts paired phones and prints a report.
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
U="${SUDO_USER:-teacher}"
H="$(getent passwd "$U" | cut -d: -f6)"
UID_="$(id -u "$U")"
LOG="$H/bt-report.txt"
ok(){ echo "✔ $*"; }
bad(){ echo "✘ $*"; }

echo "» تثبيت خدمة استلام الملفات الخاصة بـ Alharthia…"
python3 -c "import dbus, gi" 2>/dev/null || apt-get install -y python3-dbus python3-gi
install -d /opt/alharthia
install -m 755 "$ROOT/shell/alharthia_btrecv.py" /opt/alharthia/alharthia_btrecv.py
install -d -o "$U" -g "$U" "$H/Received"

# the device shows up as a computer that accepts files
if [ -f /etc/bluetooth/main.conf ]; then
	sed -i '/^#\?Class *=/d' /etc/bluetooth/main.conf
	sed -i '/^\[General\]/a Class = 0x10010C' /etc/bluetooth/main.conf
fi

# stop the old ways of receiving (obexd) so only one receiver exists
systemctl disable --now alharthia-obex.service 2>/dev/null || true
rm -f /etc/systemd/system/alharthia-obex.service
[ -f "$H/.config/labwc/autostart" ] && sed -i '/obexd/d' "$H/.config/labwc/autostart"
install -d -o "$U" -g "$U" "$H/.config/systemd/user"
ln -sf /dev/null "$H/.config/systemd/user/obex.service"
chown -h "$U:$U" "$H/.config/systemd/user/obex.service"
pkill -f labwc/autostart 2>/dev/null || true
pkill -x obexd 2>/dev/null || true

cat > /etc/systemd/system/alharthia-btrecv.service <<UNIT
[Unit]
Description=Alharthia OS — receive files over Bluetooth
After=bluetooth.service
Wants=bluetooth.service

[Service]
Environment=ALH_USER=$U
ExecStart=/usr/bin/python3 /opt/alharthia/alharthia_btrecv.py
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
UNIT

rfkill unblock bluetooth 2>/dev/null || true
systemctl daemon-reload
systemctl restart bluetooth
sleep 2
systemctl enable alharthia-btrecv.service >/dev/null 2>&1
systemctl restart alharthia-btrecv.service
sleep 4

bluetoothctl power on >/dev/null 2>&1
bluetoothctl pairable on >/dev/null 2>&1
bluetoothctl discoverable-timeout 0 >/dev/null 2>&1
bluetoothctl discoverable on >/dev/null 2>&1
for mac in $(bluetoothctl devices Paired 2>/dev/null | awk '/^Device/{print $2}'); do
	bluetoothctl trust "$mac" >/dev/null 2>&1
done

{
echo "===== Bluetooth report — $(date) ====="
systemctl is-active bluetooth >/dev/null && ok "bluetooth service: running" || bad "bluetooth service: stopped"
systemctl is-active alharthia-btrecv >/dev/null && ok "Alharthia receiver: running" || bad "Alharthia receiver: stopped"
journalctl -u alharthia-btrecv -n 20 --no-pager 2>/dev/null | grep -q "Object Push registered" \
	&& ok "OBEX Object Push: registered" || bad "OBEX Object Push: NOT registered"
pgrep -x obexd >/dev/null && bad "obexd is still running (pid $(pgrep -x obexd | tr '\n' ' '))" || ok "obexd: not running"
echo "--- paired devices:"
for mac in $(bluetoothctl devices Paired 2>/dev/null | awk '/^Device/{print $2}'); do
	bluetoothctl info "$mac" | grep -E "Name:|Trusted:" | tr '\n' ' '; echo
done
echo "--- receiver log:"
journalctl -u alharthia-btrecv -n 20 --no-pager 2>/dev/null
} | tee "$LOG"
chown "$U:$U" "$LOG" 2>/dev/null
echo
echo "Report saved: $LOG"
echo "On the phone: send a file to 'alharthia'. Received files: $H/Received"
