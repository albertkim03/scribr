export function getResetCountdown(): string {
	const now = new Date()
	const midnight = new Date(Date.UTC(
		now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1
	))
	const msLeft = midnight.getTime() - now.getTime()
	const h = Math.floor(msLeft / 3_600_000)
	const m = Math.floor((msLeft % 3_600_000) / 60_000)
	if (h > 0) return `Resets in ${h}h ${m}m`
	return `Resets in ${m}m`
}