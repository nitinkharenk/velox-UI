alter table public.ideas
  drop constraint if exists ideas_status_check;

alter table public.ideas
  add constraint ideas_status_check
  check (
    status in (
      'pending',
      'enriching',
      'enriched',
      'generating',
      'generated',
      'validating',
      'validated',
      'ready',
      'ready_with_warnings',
      'reviewing',
      'repair_required',
      'approved',
      'rejected',
      'failed'
    )
  );

update public.ideas
set
  status = 'repair_required',
  error_log = coalesce(error_log, 'Missing generated_code while in a review-facing status.')
where
  status in ('reviewing', 'ready', 'ready_with_warnings', 'validated', 'generated')
  and coalesce(trim(generated_code), '') = '';
