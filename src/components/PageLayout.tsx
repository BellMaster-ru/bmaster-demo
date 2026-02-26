import { ReactNode } from 'react';
import { H1 } from '@/components/text';
import { cn } from '@/utils';

type PageLayoutProps = {
	pageTitle: ReactNode;
	children: ReactNode;
	className?: string;
	titleClassName?: string;
};

const PageLayout = ({
	pageTitle,
	children,
	className,
	titleClassName
}: PageLayoutProps) => (
	<div className={cn('mx-auto w-full max-w-7xl p-3 sm:p-4 lg:p-6', className)}>
		<H1 className={titleClassName}>{pageTitle}</H1>
		{children}
	</div>
);

export default PageLayout;
