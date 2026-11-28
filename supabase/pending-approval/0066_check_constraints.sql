-- NOT VALID: existing rows are not checked or changed; every new or updated row is.
alter table public.weight_logs add constraint weight_logs_sane check (weight > 0 and weight < 1000 and (body_fat is null or (body_fat >= 0 and body_fat <= 100)) and date between date '2000-01-01' and current_date + 2) not valid;
alter table public.food_log add constraint food_log_sane check (total_kcal >= 0 and total_kcal < 100000 and total_protein >= 0 and total_carbs >= 0 and total_fat >= 0 and date between date '2000-01-01' and current_date + 2) not valid;
alter table public.exercise_logs add constraint exercise_logs_sane check (weight >= 0 and weight < 2000 and sets between 1 and 100 and reps between 1 and 3600 and date between date '2000-01-01' and current_date + 2) not valid;
alter table public.pr_history add constraint pr_history_sane check (weight >= 0 and weight < 2000 and prev_weight >= 0 and prev_weight < 2000 and date between date '2000-01-01' and current_date + 2) not valid;
-- Later, once old rows are reviewed: alter table ... validate constraint ...;
