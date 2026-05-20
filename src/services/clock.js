let notificationPermission = null;

export function getCurrentTime() {
  return new Date();
}

export function formatTime(date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function formatDate(date) {
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export async function requestNotificationPermission() {
  if (!('Notification' in window)) return 'denied';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  const result = await Notification.requestPermission();
  notificationPermission = result;
  return result;
}

export function sendNotification(title, options = {}) {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  try {
    const n = new Notification(title, {
      icon: '/liquid_glass.png',
      badge: '/liquid_glass.png',
      ...options,
    });
    setTimeout(() => n.close(), 5000);
  } catch {}
}

export function scheduleNotification(title, options, delayMs) {
  setTimeout(() => sendNotification(title, options), delayMs);
}

export function checkDueReminders(reminders) {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  return (reminders || []).filter(r => {
    if (!r.time || r._fired) return false;
    const [h, m] = r.time.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return false;
    const reminderMinutes = h * 60 + m;
    const diff = Math.abs(currentMinutes - reminderMinutes);
    return diff <= 1;
  });
}

export function getGreeting(hour) {
  if (hour < 5) return 'Late night';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 21) return 'Good evening';
  return 'Good night';
}

export function getWeekInfo(date) {
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const weekNum = Math.ceil(((date - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getMonth()];
  const day = date.getDate();
  return {
    weekOf: `Week ${weekNum} · ${month} ${day}–${day + 6}`,
    date: `${formatDate(date)}`,
  };
}
