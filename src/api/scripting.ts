import api from '@/api';
import { JobTrigger } from '@/api/scheduling';

export interface Command {
	type: string;
}

export interface SoundQueryCommand extends Command {
	type: 'queries.sound';
	sound_name: string;
	icom: string;
	priority: number;
	force: boolean;
}

export interface BaseScript {
	commands: Command[];
}

export interface ScriptInfo {
	id: number;
	name: string;
	script: BaseScript;
}

export interface ScriptTaskInfo {
	id: number;
	script_id: number;
	tags: string[];
}

export interface ScriptTaskCreateRequest {
	script_id: number;
	trigger: JobTrigger;
	tags: string[];
}

export const getScripts = async () =>
	(await api.get<ScriptInfo[]>(`scripting/scripts`)).data;

export const getTasks = async () =>
	(await api.get<ScriptTaskInfo[]>(`scripting/tasks`)).data;
