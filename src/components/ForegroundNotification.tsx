import { ReactNode } from "react";
import Foreground from "@/components/Foreground";
import { Card } from "react-bootstrap";

export default function ForegroundNotification({ children }: { children: ReactNode }) {
	return (
		<Foreground>
			<Card>
				<Card.Body>{children}</Card.Body>
			</Card>
		</Foreground>
	);
}
