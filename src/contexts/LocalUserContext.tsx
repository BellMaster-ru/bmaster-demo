import React, { createContext, useContext, useMemo, useState } from 'react';
import { UserLocalInfo } from '@/api/auth';


const LocalUserContext = createContext<UserLocalInfo | undefined>(undefined);

export function LocalUserProvider({
	localUser,
	children
}: {
	localUser: UserLocalInfo;
	children: React.ReactNode;
}) {
	return (
		<LocalUserContext.Provider value={localUser}>
			{children}
		</LocalUserContext.Provider>
	);
}

export function useLocalUser(): UserLocalInfo {
  const context = useContext(LocalUserContext);
  if (!context) {
    throw new Error('useLocalUser must be used within a LocalUserProvider');
  }
  return context;
}
