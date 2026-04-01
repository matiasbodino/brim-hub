export function haptic(ms) {
  try { navigator.vibrate(ms || 10) } catch(e) {}
}

export function hapticSuccess() {
  try { navigator.vibrate([50, 30, 50]) } catch(e) {}
}

export function hapticLight() {
  try { navigator.vibrate(5) } catch(e) {}
}
