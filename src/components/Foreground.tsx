import { ReactNode } from "react";

export default function Foreground({ children }: { children: ReactNode }) {
	return (
		<div className='min-vh-100 d-flex align-items-center justify-content-center'>
			{children}
		</div>
	);
}
