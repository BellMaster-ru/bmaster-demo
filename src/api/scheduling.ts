

export interface JobTrigger {
	type: string;
}

export interface DateTrigger extends JobTrigger {
	type: 'date';
	run_date: string;  // isoformat
}

export interface IntervalTrigger extends JobTrigger {
	type: 'interval';
	week?: number;
	days?: number;
	hours?: number;
	minutes?: number;
	seconds?: number;

	start_date?: string;  // isoformat
	end_date?: string;  // isoformat
}

export interface CronTrigger extends JobTrigger {
	type: 'cron';
	year?: string;
	month?: string;
	day?: string;
	week?: string;
	day_of_week?: string;
	hour?: string;
	minute?: string;
	second?: string;

	start_date?: string;
	end_date?: string;
}
