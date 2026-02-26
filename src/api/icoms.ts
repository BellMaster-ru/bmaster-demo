import api from '@/api';
import { isAxiosError } from 'axios';

export enum QueryStatus {
	Waiting = 'waiting',
	Playing = 'playing',
	Finished = 'finished',
	Cancelled = 'cancelled'
}

export interface QueryAuthor {
	type: string;
	name: string;
	label: string;
}

export interface QueryInfo {
	id: string;
	type: string;
	icom: string;
	priority: number;
	force: boolean;
	duration?: number;
	status: QueryStatus;
	author?: QueryAuthor;
}

export interface SoundQueryInfo extends QueryInfo {
	sound_name: string;
}

export interface IcomInfo {
	id: string;
	name: string;
	playing?: QueryInfo;
	queue: QueryInfo[];
	paused: boolean;
}

export type IcomInfoMap = {[key: string]: IcomInfo};


export async function getIcoms(): Promise<IcomInfoMap> {
	return (await api.get<IcomInfoMap>('icoms')).data;
}

export async function getIcom(id: string): Promise<IcomInfo | undefined> {
	try {
		return (await api.get<IcomInfo>(`icoms/${id}`)).data;
	} catch (err) {
		if (isAxiosError(err) && err.response?.status === 404 )
			return undefined;
		throw err;
	}
}

export async function getQuery(id: string): Promise<QueryInfo | undefined> {
	try {
		return (await api.get<QueryInfo>(`queries/${id}`)).data;
	} catch (err) {
		if (isAxiosError(err) && err.response?.status === 404 )
			return undefined;
		throw err;
	}
}

export async function cancelQuery(id: string): Promise<QueryInfo> {
	return (await api.delete<QueryInfo>(`queries/${id}`)).data;
}
