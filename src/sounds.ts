import { useQuery } from "@tanstack/react-query";
import * as sounds from "@/api/sounds";


export const useSounds = () => {
	const soundsQuery = useQuery({
		queryFn: () => sounds.getSoundInfo(),
		queryKey: ['sounds']
	});
	let soundNameList = [];
	if (soundsQuery.data) {
		for (const sound of soundsQuery.data) {
			if (sound.sound_specs) soundNameList.push(sound.name);
		}
	}
	return {soundsQuery, soundNameList}
}
