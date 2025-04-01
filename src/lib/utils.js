import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
	return twMerge(clsx(inputs));
}

export const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay));

export function debounce(cb, wait = 1000) {
	let timeout;
	return (/** @type {any} */ ...args) => {
		clearTimeout(timeout);
		timeout = setTimeout(() => cb(...args), wait);
	};
}
