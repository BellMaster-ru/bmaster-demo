import { HTMLAttributes, useRef } from 'react';
import { Button, ButtonProps } from '@/components/Button';

const FileUploadButton = ({handleFile, children, input, ...attrs}: {
	handleFile?: (file: File) => void,
	input?: HTMLAttributes<HTMLInputElement>
} & ButtonProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleButtonClick = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
			if (handleFile) handleFile(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
		<Button
			onClick={handleButtonClick}
			{...attrs}
		>
			<input
				type='file'
				ref={fileInputRef}
				onChange={handleFileChange}
				className='hidden'
				{...input}
			/>
			{children}
		</Button>
  );
};

export default FileUploadButton;