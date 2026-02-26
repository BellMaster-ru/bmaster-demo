/** @type {import('tailwindcss').Config} */
export default {
	content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
	theme: {
		extend: {
			keyframes: {
				/* Анимация для колокольчика в лого */
				ring: {
					'0%, 100%': { transform: 'rotate(0deg)' },
					'10%': { transform: 'rotate(15deg)' },
					'20%': { transform: 'rotate(-15deg)' },
					'30%': { transform: 'rotate(10deg)' },
					'40%': { transform: 'rotate(-10deg)' },
					'50%': { transform: 'rotate(5deg)' },
					'60%': { transform: 'rotate(-5deg)' }
				},
				/* Анимация для подсветки конфликтов*/
				flashRed: {
					'0%, 100%': { backgroundColor: 'transparent' },
					'50%': { backgroundColor: 'rgba(248, 113, 113, 0.5)' }
				}
			},
			animation: {
				ring: 'ring 0.8s ease-in-out',
				flashRed: 'flashRed 1s ease-in-out'
			}
		}
	},
	plugins: []
};
